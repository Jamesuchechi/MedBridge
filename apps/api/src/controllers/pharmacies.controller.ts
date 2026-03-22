/**
 * Pharmacies Controller
 * =====================
 * All routes under /api/v1/pharmacies
 *
 * GET  /search                 — Nearby search (Overpass) or text search (Nominatim)
 * GET  /geocode                — Convert location string → coordinates
 * GET  /:id                    — Pharmacy detail + availability + prices
 * POST /report-availability    — Crowdsourced stock report (48h TTL)
 * POST /report-price           — Crowdsourced price submission
 * GET  /prices/:drugId         — Price comparison across pharmacies
 *
 * Moderation (SUPER_ADMIN only):
 * GET  /admin/moderation       — Paginated queue of pending/flagged reports
 * GET  /admin/moderation/stats — Dashboard stats for the moderation queue
 * PATCH /admin/moderation/:id  — Approve / reject / flag a report
 * GET  /admin/moderation/:id/audit — Full audit trail for a report
 */

import { Request, Response } from "express";
import { db, drugs } from "@medbridge/db";
import {
  pharmacies,
  drugAvailabilityReports,
  drugPriceReports,
  moderationAuditLog,
} from "@medbridge/db";
import { eq, and, gte, desc, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  findPharmaciesNearby,
  searchPharmaciesByName,
  geocodeLocation,
  OsmPharmacy,
} from "../services/osm.service";

// ─── Validation schemas ───────────────────────────────────────────────────────
const searchSchema = z.object({
  q:      z.string().optional(),
  lat:    z.coerce.number().min(-90).max(90).optional(),
  lng:    z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(500).max(30000).default(5000),
  state:  z.string().optional(),
});

const availabilitySchema = z.object({
  pharmacyId: z.string().min(1),
  drugId:     z.string().uuid().optional(),
  drugName:   z.string().min(1).max(100),
  isInStock:  z.boolean(),
});

const priceSchema = z.object({
  pharmacyId: z.string().min(1),
  drugId:     z.string().uuid().optional(),
  drugName:   z.string().min(1).max(100),
  price:      z.number().int().min(1).max(1_000_000),
  quantity:   z.string().max(80).optional(),
});

const moderationActionSchema = z.object({
  action: z.enum(["approve", "reject", "flag", "unflag"]),
  note:   z.string().max(500).optional(),
  flagReason: z.enum(["price_outlier", "duplicate", "spam", "user_report"]).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upsert an OSM pharmacy into our DB using osm_id as the unique key.
 * Returns the DB id (UUID) for the pharmacy.
 */
async function upsertOsmPharmacy(p: OsmPharmacy): Promise<string> {
  const existing = await db
    .select({ id: pharmacies.id })
    .from(pharmacies)
    .where(eq(pharmacies.osmId, p.osmId))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(pharmacies)
    .values({
      name:         p.name,
      address:      p.address,
      state:        p.state,
      lga:          p.lga,
      lat:          p.lat,
      lng:          p.lng,
      osmId:        p.osmId,
      osmType:      p.osmType,
      phone:        p.phone,
      website:      p.website,
      openingHours: p.openingHours,
    })
    .onConflictDoNothing()
    .returning({ id: pharmacies.id });

  if (created) return created.id;

  // Conflict resolved — fetch the existing row
  const [retry] = await db
    .select({ id: pharmacies.id })
    .from(pharmacies)
    .where(eq(pharmacies.osmId, p.osmId))
    .limit(1);

  return retry.id;
}

/**
 * Detect price outlier against the drug's known NAFDAC price range.
 * Returns a flag reason string if outlier, or null if price looks OK.
 */
async function detectPriceOutlier(
  drugId: string | undefined,
  reportedPrice: number
): Promise<string | null> {
  if (!drugId) return null;
  try {
    const [drug] = await db
      .select({ min: drugs.priceRangeMin, max: drugs.priceRangeMax })
      .from(drugs)
      .where(eq(drugs.id, drugId))
      .limit(1);

    if (!drug?.min || !drug?.max) return null;
    if (reportedPrice < drug.min * 0.15 || reportedPrice > drug.max * 4) {
      return "price_outlier";
    }
  } catch { /* non-blocking */ }
  return null;
}

// ─── Public endpoints ─────────────────────────────────────────────────────────

/** GET /api/v1/pharmacies/search */
export const searchPharmacies = async (req: Request, res: Response) => {
  const parse = searchSchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid parameters", details: parse.error.format() });
  }

  const { q, lat, lng, radius, state } = parse.data;

  try {
    let osmResults: OsmPharmacy[] = [];

    if (lat && lng) {
      // Coordinates provided → Overpass nearby search
      osmResults = await findPharmaciesNearby(lat, lng, radius);
    } else if (q) {
      // Text-only → Nominatim search
      osmResults = await searchPharmaciesByName(q);
    } else if (state) {
      // State filter only → search our DB
      const dbResults = await db
        .select()
        .from(pharmacies)
        .where(ilike(pharmacies.state, `%${state}%`))
        .orderBy(desc(pharmacies.reportCount))
        .limit(30);

      return res.json({
        pharmacies: dbResults,
        total: dbResults.length,
        source: "database",
      });
    } else {
      return res.status(400).json({ error: "Provide lat/lng, a search query, or a state." });
    }

    // Upsert OSM results into DB asynchronously (fire and forget — don't block response)
    Promise.all(osmResults.map(upsertOsmPharmacy)).catch(console.error);

    return res.json({
      pharmacies: osmResults,
      total: osmResults.length,
      source: q && !lat ? "nominatim" : "overpass",
    });
  } catch (err) {
    console.error("[SEARCH PHARMACIES]:", err);
    res.status(500).json({ error: "Failed to search pharmacies" });
  }
};

/** GET /api/v1/pharmacies/geocode?q=Yaba+Lagos */
export const geocode = async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.status(400).json({ error: "q parameter required" });

  const result = await geocodeLocation(q);
  if (!result) return res.status(404).json({ error: "Location not found" });

  res.json(result);
};

/** GET /api/v1/pharmacies/:id */
export const getPharmacyById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Accept both our UUID and OSM ID formats
  const isUUID = /^[0-9a-f-]{36}$/.test(id);

  try {
    const [pharmacy] = await db
      .select()
      .from(pharmacies)
      .where(isUUID ? eq(pharmacies.id, id) : eq(pharmacies.osmId, id))
      .limit(1);

    if (!pharmacy) {
      return res.status(404).json({ error: "Pharmacy not found" });
    }

    const cutoff48h  = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const cutoff30d  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Latest availability per drug (last 48h, deduplicated to most recent per drug)
    const availability = await db
      .select()
      .from(drugAvailabilityReports)
      .where(
        and(
          eq(drugAvailabilityReports.pharmacyId, pharmacy.id),
          gte(drugAvailabilityReports.createdAt, cutoff48h)
        )
      )
      .orderBy(desc(drugAvailabilityReports.createdAt))
      .limit(30);

    // Deduplicate to one entry per drug name
    const seenDrugs  = new Set<string>();
    const latestAvail = availability.filter((r) => {
      if (seenDrugs.has(r.drugName)) return false;
      seenDrugs.add(r.drugName);
      return true;
    });

    // Approved prices last 30 days
    const prices = await db
      .select()
      .from(drugPriceReports)
      .where(
        and(
          eq(drugPriceReports.pharmacyId, pharmacy.id),
          eq(drugPriceReports.moderationStatus, "approved"),
          gte(drugPriceReports.createdAt, cutoff30d)
        )
      )
      .orderBy(desc(drugPriceReports.createdAt))
      .limit(30);

    res.json({ ...pharmacy, availability: latestAvail, prices });
  } catch (err) {
    console.error("[GET PHARMACY]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** POST /api/v1/pharmacies/report-availability */
export const reportAvailability = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  const parse  = availabilitySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid data", details: parse.error.format() });
  }

  const { pharmacyId, drugId, drugName, isInStock } = parse.data;

  try {
    // Ensure pharmacy exists (may be an OSM ID)
    let dbPharmacyId = pharmacyId;
    if (!/^[0-9a-f-]{36}$/.test(pharmacyId)) {
      const [found] = await db
        .select({ id: pharmacies.id })
        .from(pharmacies)
        .where(eq(pharmacies.osmId, pharmacyId))
        .limit(1);
      if (!found) return res.status(404).json({ error: "Pharmacy not found" });
      dbPharmacyId = found.id;
    }

    const [report] = await db
      .insert(drugAvailabilityReports)
      .values({
        pharmacyId: dbPharmacyId,
        drugId:     drugId || null,
        drugName,
        isInStock,
        reportedBy: userId || null,
      })
      .returning();

    // Bump pharmacy report_count
    await db
      .update(pharmacies)
      .set({ reportCount: sql`${pharmacies.reportCount} + 1` })
      .where(eq(pharmacies.id, dbPharmacyId));

    res.status(201).json({
      message: "Availability report submitted. Thank you for contributing to CommunityRx!",
      report,
    });
  } catch (err) {
    console.error("[REPORT AVAILABILITY]:", err);
    res.status(500).json({ error: "Failed to submit report" });
  }
};

/** POST /api/v1/pharmacies/report-price */
export const reportPrice = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  const parse  = priceSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid data", details: parse.error.format() });
  }

  const { pharmacyId, drugId, drugName, price, quantity } = parse.data;

  try {
    // Resolve pharmacy UUID
    let dbPharmacyId = pharmacyId;
    if (!/^[0-9a-f-]{36}$/.test(pharmacyId)) {
      const [found] = await db
        .select({ id: pharmacies.id })
        .from(pharmacies)
        .where(eq(pharmacies.osmId, pharmacyId))
        .limit(1);
      if (!found) return res.status(404).json({ error: "Pharmacy not found" });
      dbPharmacyId = found.id;
    }

    // Outlier detection
    const autoFlagReason  = await detectPriceOutlier(drugId, price);
    const isAutoFlagged   = autoFlagReason !== null;
    const moderationStatus = isAutoFlagged ? "flagged" : "pending";

    const [report] = await db
      .insert(drugPriceReports)
      .values({
        pharmacyId:      dbPharmacyId,
        drugId:          drugId || null,
        drugName,
        price,
        quantity:        quantity || null,
        reportedBy:      userId || null,
        moderationStatus,
        isAutoFlagged,
        autoFlagReason:  autoFlagReason,
      })
      .returning();

    await db
      .update(pharmacies)
      .set({ reportCount: sql`${pharmacies.reportCount} + 1` })
      .where(eq(pharmacies.id, dbPharmacyId));

    res.status(201).json({
      message: isAutoFlagged
        ? "Price submitted. It's being reviewed by our team before being published."
        : "Price submitted! It will be visible once reviewed.",
      flagged: isAutoFlagged,
      report: { id: report.id, moderationStatus: report.moderationStatus },
    });
  } catch (err) {
    console.error("[REPORT PRICE]:", err);
    res.status(500).json({ error: "Failed to submit price report" });
  }
};

/** GET /api/v1/pharmacies/prices/:drugId */
export const getDrugPriceComparison = async (req: Request, res: Response) => {
  const { drugId } = req.params;
  const state = req.query.state as string | undefined;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const rows = await db
      .select({
        pharmacyId:    drugPriceReports.pharmacyId,
        price:         drugPriceReports.price,
        quantity:      drugPriceReports.quantity,
        reportedAt:    drugPriceReports.createdAt,
        pharmacyName:  pharmacies.name,
        address:       pharmacies.address,
        pharmState:    pharmacies.state,
        lat:           pharmacies.lat,
        lng:           pharmacies.lng,
      })
      .from(drugPriceReports)
      .innerJoin(pharmacies, eq(drugPriceReports.pharmacyId, pharmacies.id))
      .where(
        and(
          or(
            eq(drugPriceReports.drugId, drugId),
            // Also match by drug name for unlisted drugs
          ),
          eq(drugPriceReports.moderationStatus, "approved"),
          gte(drugPriceReports.createdAt, cutoff),
          ...(state ? [ilike(pharmacies.state, `%${state}%`)] : [])
        )
      )
      .orderBy(drugPriceReports.price);

    if (!rows.length) return res.json({ prices: [], summary: null });

    // Most recent approved price per pharmacy
    const byPharmacy = new Map<string, typeof rows[0]>();
    for (const r of rows) {
      const existing = byPharmacy.get(r.pharmacyId);
      if (!existing || r.reportedAt > existing.reportedAt) {
        byPharmacy.set(r.pharmacyId, r);
      }
    }

    const prices = [...byPharmacy.values()].sort((a, b) => a.price - b.price);
    const vals   = prices.map((p) => p.price);

    res.json({
      prices: prices.map((p) => ({
        pharmacyId:   p.pharmacyId,
        pharmacyName: p.pharmacyName,
        address:      p.address,
        state:        p.pharmState,
        lat:          p.lat,
        lng:          p.lng,
        price:        p.price,
        priceDisplay: `₦${p.price.toLocaleString()}`,
        quantity:     p.quantity,
        reportedAt:   p.reportedAt,
      })),
      summary: {
        lowestPrice:   Math.min(...vals),
        highestPrice:  Math.max(...vals),
        avgPrice:      Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        reportCount:   rows.length,
        pharmacyCount: prices.length,
      },
    });
  } catch (err) {
    console.error("[DRUG PRICE COMPARISON]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── Moderation endpoints (SUPER_ADMIN) ───────────────────────────────────────

/** GET /api/v1/pharmacies/admin/moderation */
export const getModerationQueue = async (req: Request, res: Response) => {
  const status   = (req.query.status as string) || "pending";
  const page     = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage  = 20;
  const offset   = (page - 1) * perPage;
  const drugFilter = req.query.drug as string | undefined;

  const validStatuses = ["pending", "flagged", "approved", "rejected"];
  const statusFilter  = validStatuses.includes(status) ? status : "pending";

  try {
    const conditions = [eq(drugPriceReports.moderationStatus, statusFilter)];
    if (drugFilter) conditions.push(ilike(drugPriceReports.drugName, `%${drugFilter}%`));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(drugPriceReports)
      .where(and(...conditions));

    const reports = await db
      .select({
        id:              drugPriceReports.id,
        drugName:        drugPriceReports.drugName,
        price:           drugPriceReports.price,
        quantity:        drugPriceReports.quantity,
        reportedBy:      drugPriceReports.reportedBy,
        moderationStatus: drugPriceReports.moderationStatus,
        flagReason:      drugPriceReports.flagReason,
        autoFlagReason:  drugPriceReports.autoFlagReason,
        isAutoFlagged:   drugPriceReports.isAutoFlagged,
        moderationNote:  drugPriceReports.moderationNote,
        moderatedBy:     drugPriceReports.moderatedBy,
        moderatedAt:     drugPriceReports.moderatedAt,
        createdAt:       drugPriceReports.createdAt,
        pharmacyName:    pharmacies.name,
        pharmacyAddress: pharmacies.address,
        pharmacyState:   pharmacies.state,
        pharmacyId:      pharmacies.id,
      })
      .from(drugPriceReports)
      .innerJoin(pharmacies, eq(drugPriceReports.pharmacyId, pharmacies.id))
      .where(and(...conditions))
      .orderBy(desc(drugPriceReports.createdAt))
      .limit(perPage)
      .offset(offset);

    res.json({
      reports,
      pagination: {
        total:   Number(countRow.count),
        page,
        perPage,
        pages:   Math.ceil(Number(countRow.count) / perPage),
      },
    });
  } catch (err) {
    console.error("[MODERATION QUEUE]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/v1/pharmacies/admin/moderation/stats */
export const getModerationStats = async (_req: Request, res: Response) => {
  try {
    const [stats] = await db
      .select({
        pending:  sql<number>`count(*) filter (where moderation_status = 'pending')`,
        flagged:  sql<number>`count(*) filter (where moderation_status = 'flagged')`,
        approved: sql<number>`count(*) filter (where moderation_status = 'approved')`,
        rejected: sql<number>`count(*) filter (where moderation_status = 'rejected')`,
        total:    sql<number>`count(*)`,
        autoFlagged: sql<number>`count(*) filter (where is_auto_flagged = true)`,
      })
      .from(drugPriceReports);

    // Reports in last 24 hours
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recent] = await db
      .select({ count: sql<number>`count(*)` })
      .from(drugPriceReports)
      .where(gte(drugPriceReports.createdAt, cutoff24h));

    res.json({
      pending:     Number(stats.pending),
      flagged:     Number(stats.flagged),
      approved:    Number(stats.approved),
      rejected:    Number(stats.rejected),
      total:       Number(stats.total),
      autoFlagged: Number(stats.autoFlagged),
      last24h:     Number(recent.count),
    });
  } catch (err) {
    console.error("[MODERATION STATS]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** PATCH /api/v1/pharmacies/admin/moderation/:id */
export const moderateReport = async (req: Request, res: Response) => {
  const adminId = req.headers["x-user-id"] as string;
  const { id }  = req.params;

  const parse = moderationActionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid action", details: parse.error.format() });
  }

  const { action, note, flagReason } = parse.data;

  const STATUS_MAP: Record<string, string> = {
    approve: "approved",
    reject:  "rejected",
    flag:    "flagged",
    unflag:  "pending",
  };

  try {
    const [existing] = await db
      .select({ id: drugPriceReports.id, status: drugPriceReports.moderationStatus })
      .from(drugPriceReports)
      .where(eq(drugPriceReports.id, id))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Report not found" });

    const newStatus = STATUS_MAP[action];

    const [updated] = await db
      .update(drugPriceReports)
      .set({
        moderationStatus: newStatus,
        moderatedBy:      adminId,
        moderationNote:   note || null,
        moderatedAt:      new Date(),
        ...(action === "flag" && flagReason ? { flagReason } : {}),
      })
      .where(eq(drugPriceReports.id, id))
      .returning();

    // Write to audit log
    await db.insert(moderationAuditLog).values({
      reportId:       id,
      adminId,
      action,
      previousStatus: existing.status,
      newStatus,
      note:           note || null,
    });

    res.json({ message: `Report ${action}d successfully.`, report: updated });
  } catch (err) {
    console.error("[MODERATE REPORT]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/v1/pharmacies/admin/moderation/:id/audit */
export const getReportAuditTrail = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [report] = await db
      .select()
      .from(drugPriceReports)
      .where(eq(drugPriceReports.id, id))
      .limit(1);

    if (!report) return res.status(404).json({ error: "Report not found" });

    const auditLog = await db
      .select()
      .from(moderationAuditLog)
      .where(eq(moderationAuditLog.reportId, id))
      .orderBy(desc(moderationAuditLog.createdAt));

    res.json({ report, auditLog });
  } catch (err) {
    console.error("[AUDIT TRAIL]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};