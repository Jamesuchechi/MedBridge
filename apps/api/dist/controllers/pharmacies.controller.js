"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportAuditTrail = exports.moderateReport = exports.getModerationStats = exports.getModerationQueue = exports.getDrugPriceComparison = exports.reportPrice = exports.reportAvailability = exports.getPharmacyById = exports.geocode = exports.searchPharmacies = void 0;
const db_1 = require("@medbridge/db");
const db_2 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const osm_service_1 = require("../services/osm.service");
// ─── Validation schemas ───────────────────────────────────────────────────────
const searchSchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    lat: zod_1.z.coerce.number().min(-90).max(90).optional(),
    lng: zod_1.z.coerce.number().min(-180).max(180).optional(),
    radius: zod_1.z.coerce.number().min(500).max(30000).default(5000),
    state: zod_1.z.string().optional(),
});
const availabilitySchema = zod_1.z.object({
    pharmacyId: zod_1.z.string().min(1),
    drugId: zod_1.z.string().uuid().optional(),
    drugName: zod_1.z.string().min(1).max(100),
    isInStock: zod_1.z.boolean(),
});
const priceSchema = zod_1.z.object({
    pharmacyId: zod_1.z.string().min(1),
    drugId: zod_1.z.string().uuid().optional(),
    drugName: zod_1.z.string().min(1).max(100),
    price: zod_1.z.number().int().min(1).max(1000000),
    quantity: zod_1.z.string().max(80).optional(),
});
const moderationActionSchema = zod_1.z.object({
    action: zod_1.z.enum(["approve", "reject", "flag", "unflag"]),
    note: zod_1.z.string().max(500).optional(),
    flagReason: zod_1.z.enum(["price_outlier", "duplicate", "spam", "user_report"]).optional(),
});
// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Upsert an OSM pharmacy into our DB using osm_id as the unique key.
 * Returns the DB id (UUID) for the pharmacy.
 */
async function upsertOsmPharmacy(p) {
    const existing = await db_1.db
        .select({ id: db_2.pharmacies.id })
        .from(db_2.pharmacies)
        .where((0, drizzle_orm_1.eq)(db_2.pharmacies.osmId, p.osmId))
        .limit(1);
    if (existing.length > 0)
        return existing[0].id;
    const [created] = await db_1.db
        .insert(db_2.pharmacies)
        .values({
        name: p.name,
        address: p.address,
        state: p.state,
        lga: p.lga,
        lat: p.lat,
        lng: p.lng,
        osmId: p.osmId,
        osmType: p.osmType,
        phone: p.phone,
        website: p.website,
        openingHours: p.openingHours,
    })
        .onConflictDoNothing()
        .returning({ id: db_2.pharmacies.id });
    if (created)
        return created.id;
    // Conflict resolved — fetch the existing row
    const [retry] = await db_1.db
        .select({ id: db_2.pharmacies.id })
        .from(db_2.pharmacies)
        .where((0, drizzle_orm_1.eq)(db_2.pharmacies.osmId, p.osmId))
        .limit(1);
    return retry.id;
}
/**
 * Detect price outlier against the drug's known NAFDAC price range.
 * Returns a flag reason string if outlier, or null if price looks OK.
 */
async function detectPriceOutlier(drugId, reportedPrice) {
    if (!drugId)
        return null;
    try {
        const [drug] = await db_1.db
            .select({ min: db_1.drugs.priceRangeMin, max: db_1.drugs.priceRangeMax })
            .from(db_1.drugs)
            .where((0, drizzle_orm_1.eq)(db_1.drugs.id, drugId))
            .limit(1);
        if (!drug?.min || !drug?.max)
            return null;
        if (reportedPrice < drug.min * 0.15 || reportedPrice > drug.max * 4) {
            return "price_outlier";
        }
    }
    catch { /* non-blocking */ }
    return null;
}
// ─── Public endpoints ─────────────────────────────────────────────────────────
/** GET /api/v1/pharmacies/search */
const searchPharmacies = async (req, res) => {
    const parse = searchSchema.safeParse(req.query);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid parameters", details: parse.error.format() });
    }
    const { q, lat, lng, radius, state } = parse.data;
    try {
        let osmResults = [];
        if (lat && lng) {
            // Coordinates provided → Overpass nearby search
            osmResults = await (0, osm_service_1.findPharmaciesNearby)(lat, lng, radius);
        }
        else if (q) {
            // Text-only → Nominatim search
            osmResults = await (0, osm_service_1.searchPharmaciesByName)(q);
        }
        else if (state) {
            // State filter only → search our DB
            const dbResults = await db_1.db
                .select()
                .from(db_2.pharmacies)
                .where((0, drizzle_orm_1.ilike)(db_2.pharmacies.state, `%${state}%`))
                .orderBy((0, drizzle_orm_1.desc)(db_2.pharmacies.reportCount))
                .limit(30);
            return res.json({
                pharmacies: dbResults,
                total: dbResults.length,
                source: "database",
            });
        }
        else {
            return res.status(400).json({ error: "Provide lat/lng, a search query, or a state." });
        }
        // Upsert OSM results into DB asynchronously (fire and forget — don't block response)
        Promise.all(osmResults.map(upsertOsmPharmacy)).catch(console.error);
        return res.json({
            pharmacies: osmResults,
            total: osmResults.length,
            source: q && !lat ? "nominatim" : "overpass",
        });
    }
    catch (err) {
        console.error("[SEARCH PHARMACIES]:", err);
        res.status(500).json({ error: "Failed to search pharmacies" });
    }
};
exports.searchPharmacies = searchPharmacies;
/** GET /api/v1/pharmacies/geocode?q=Yaba+Lagos */
const geocode = async (req, res) => {
    const q = req.query.q?.trim();
    if (!q)
        return res.status(400).json({ error: "q parameter required" });
    const result = await (0, osm_service_1.geocodeLocation)(q);
    if (!result)
        return res.status(404).json({ error: "Location not found" });
    res.json(result);
};
exports.geocode = geocode;
/** GET /api/v1/pharmacies/:id */
const getPharmacyById = async (req, res) => {
    const { id } = req.params;
    // Accept both our UUID and OSM ID formats
    const isUUID = /^[0-9a-f-]{36}$/.test(id);
    try {
        const [pharmacy] = await db_1.db
            .select()
            .from(db_2.pharmacies)
            .where(isUUID ? (0, drizzle_orm_1.eq)(db_2.pharmacies.id, id) : (0, drizzle_orm_1.eq)(db_2.pharmacies.osmId, id))
            .limit(1);
        if (!pharmacy) {
            return res.status(404).json({ error: "Pharmacy not found" });
        }
        const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Latest availability per drug (last 48h, deduplicated to most recent per drug)
        const availability = await db_1.db
            .select()
            .from(db_2.drugAvailabilityReports)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.drugAvailabilityReports.pharmacyId, pharmacy.id), (0, drizzle_orm_1.gte)(db_2.drugAvailabilityReports.createdAt, cutoff48h)))
            .orderBy((0, drizzle_orm_1.desc)(db_2.drugAvailabilityReports.createdAt))
            .limit(30);
        // Deduplicate to one entry per drug name
        const seenDrugs = new Set();
        const latestAvail = availability.filter((r) => {
            if (seenDrugs.has(r.drugName))
                return false;
            seenDrugs.add(r.drugName);
            return true;
        });
        // Approved prices last 30 days
        const prices = await db_1.db
            .select()
            .from(db_2.drugPriceReports)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.drugPriceReports.pharmacyId, pharmacy.id), (0, drizzle_orm_1.eq)(db_2.drugPriceReports.moderationStatus, "approved"), (0, drizzle_orm_1.gte)(db_2.drugPriceReports.createdAt, cutoff30d)))
            .orderBy((0, drizzle_orm_1.desc)(db_2.drugPriceReports.createdAt))
            .limit(30);
        res.json({ ...pharmacy, availability: latestAvail, prices });
    }
    catch (err) {
        console.error("[GET PHARMACY]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getPharmacyById = getPharmacyById;
/** POST /api/v1/pharmacies/report-availability */
const reportAvailability = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const parse = availabilitySchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid data", details: parse.error.format() });
    }
    const { pharmacyId, drugId, drugName, isInStock } = parse.data;
    try {
        // Ensure pharmacy exists (may be an OSM ID)
        let dbPharmacyId = pharmacyId;
        if (!/^[0-9a-f-]{36}$/.test(pharmacyId)) {
            const [found] = await db_1.db
                .select({ id: db_2.pharmacies.id })
                .from(db_2.pharmacies)
                .where((0, drizzle_orm_1.eq)(db_2.pharmacies.osmId, pharmacyId))
                .limit(1);
            if (!found)
                return res.status(404).json({ error: "Pharmacy not found" });
            dbPharmacyId = found.id;
        }
        const [report] = await db_1.db
            .insert(db_2.drugAvailabilityReports)
            .values({
            pharmacyId: dbPharmacyId,
            drugId: drugId || null,
            drugName,
            isInStock,
            reportedBy: userId || null,
        })
            .returning();
        // Bump pharmacy report_count
        await db_1.db
            .update(db_2.pharmacies)
            .set({ reportCount: (0, drizzle_orm_1.sql) `${db_2.pharmacies.reportCount} + 1` })
            .where((0, drizzle_orm_1.eq)(db_2.pharmacies.id, dbPharmacyId));
        res.status(201).json({
            message: "Availability report submitted. Thank you for contributing to CommunityRx!",
            report,
        });
    }
    catch (err) {
        console.error("[REPORT AVAILABILITY]:", err);
        res.status(500).json({ error: "Failed to submit report" });
    }
};
exports.reportAvailability = reportAvailability;
/** POST /api/v1/pharmacies/report-price */
const reportPrice = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const parse = priceSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid data", details: parse.error.format() });
    }
    const { pharmacyId, drugId, drugName, price, quantity } = parse.data;
    try {
        // Resolve pharmacy UUID
        let dbPharmacyId = pharmacyId;
        if (!/^[0-9a-f-]{36}$/.test(pharmacyId)) {
            const [found] = await db_1.db
                .select({ id: db_2.pharmacies.id })
                .from(db_2.pharmacies)
                .where((0, drizzle_orm_1.eq)(db_2.pharmacies.osmId, pharmacyId))
                .limit(1);
            if (!found)
                return res.status(404).json({ error: "Pharmacy not found" });
            dbPharmacyId = found.id;
        }
        // Outlier detection
        const autoFlagReason = await detectPriceOutlier(drugId, price);
        const isAutoFlagged = autoFlagReason !== null;
        const moderationStatus = isAutoFlagged ? "flagged" : "pending";
        const [report] = await db_1.db
            .insert(db_2.drugPriceReports)
            .values({
            pharmacyId: dbPharmacyId,
            drugId: drugId || null,
            drugName,
            price,
            quantity: quantity || null,
            reportedBy: userId || null,
            moderationStatus,
            isAutoFlagged,
            autoFlagReason: autoFlagReason,
        })
            .returning();
        await db_1.db
            .update(db_2.pharmacies)
            .set({ reportCount: (0, drizzle_orm_1.sql) `${db_2.pharmacies.reportCount} + 1` })
            .where((0, drizzle_orm_1.eq)(db_2.pharmacies.id, dbPharmacyId));
        res.status(201).json({
            message: isAutoFlagged
                ? "Price submitted. It's being reviewed by our team before being published."
                : "Price submitted! It will be visible once reviewed.",
            flagged: isAutoFlagged,
            report: { id: report.id, moderationStatus: report.moderationStatus },
        });
    }
    catch (err) {
        console.error("[REPORT PRICE]:", err);
        res.status(500).json({ error: "Failed to submit price report" });
    }
};
exports.reportPrice = reportPrice;
/** GET /api/v1/pharmacies/prices/:drugId */
const getDrugPriceComparison = async (req, res) => {
    const { drugId } = req.params;
    const state = req.query.state;
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    try {
        const rows = await db_1.db
            .select({
            pharmacyId: db_2.drugPriceReports.pharmacyId,
            price: db_2.drugPriceReports.price,
            quantity: db_2.drugPriceReports.quantity,
            reportedAt: db_2.drugPriceReports.createdAt,
            pharmacyName: db_2.pharmacies.name,
            address: db_2.pharmacies.address,
            pharmState: db_2.pharmacies.state,
            lat: db_2.pharmacies.lat,
            lng: db_2.pharmacies.lng,
        })
            .from(db_2.drugPriceReports)
            .innerJoin(db_2.pharmacies, (0, drizzle_orm_1.eq)(db_2.drugPriceReports.pharmacyId, db_2.pharmacies.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(db_2.drugPriceReports.drugId, drugId)), (0, drizzle_orm_1.eq)(db_2.drugPriceReports.moderationStatus, "approved"), (0, drizzle_orm_1.gte)(db_2.drugPriceReports.createdAt, cutoff), ...(state ? [(0, drizzle_orm_1.ilike)(db_2.pharmacies.state, `%${state}%`)] : [])))
            .orderBy(db_2.drugPriceReports.price);
        if (!rows.length)
            return res.json({ prices: [], summary: null });
        // Most recent approved price per pharmacy
        const byPharmacy = new Map();
        for (const r of rows) {
            const existing = byPharmacy.get(r.pharmacyId);
            if (!existing || r.reportedAt > existing.reportedAt) {
                byPharmacy.set(r.pharmacyId, r);
            }
        }
        const prices = [...byPharmacy.values()].sort((a, b) => a.price - b.price);
        const vals = prices.map((p) => p.price);
        res.json({
            prices: prices.map((p) => ({
                pharmacyId: p.pharmacyId,
                pharmacyName: p.pharmacyName,
                address: p.address,
                state: p.pharmState,
                lat: p.lat,
                lng: p.lng,
                price: p.price,
                priceDisplay: `₦${p.price.toLocaleString()}`,
                quantity: p.quantity,
                reportedAt: p.reportedAt,
            })),
            summary: {
                lowestPrice: Math.min(...vals),
                highestPrice: Math.max(...vals),
                avgPrice: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
                reportCount: rows.length,
                pharmacyCount: prices.length,
            },
        });
    }
    catch (err) {
        console.error("[DRUG PRICE COMPARISON]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDrugPriceComparison = getDrugPriceComparison;
// ─── Moderation endpoints (SUPER_ADMIN) ───────────────────────────────────────
/** GET /api/v1/pharmacies/admin/moderation */
const getModerationQueue = async (req, res) => {
    const status = req.query.status || "pending";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 20;
    const offset = (page - 1) * perPage;
    const drugFilter = req.query.drug;
    const validStatuses = ["pending", "flagged", "approved", "rejected"];
    const statusFilter = validStatuses.includes(status) ? status : "pending";
    try {
        const conditions = [(0, drizzle_orm_1.eq)(db_2.drugPriceReports.moderationStatus, statusFilter)];
        if (drugFilter)
            conditions.push((0, drizzle_orm_1.ilike)(db_2.drugPriceReports.drugName, `%${drugFilter}%`));
        const [countRow] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_2.drugPriceReports)
            .where((0, drizzle_orm_1.and)(...conditions));
        const reports = await db_1.db
            .select({
            id: db_2.drugPriceReports.id,
            drugName: db_2.drugPriceReports.drugName,
            price: db_2.drugPriceReports.price,
            quantity: db_2.drugPriceReports.quantity,
            reportedBy: db_2.drugPriceReports.reportedBy,
            moderationStatus: db_2.drugPriceReports.moderationStatus,
            flagReason: db_2.drugPriceReports.flagReason,
            autoFlagReason: db_2.drugPriceReports.autoFlagReason,
            isAutoFlagged: db_2.drugPriceReports.isAutoFlagged,
            moderationNote: db_2.drugPriceReports.moderationNote,
            moderatedBy: db_2.drugPriceReports.moderatedBy,
            moderatedAt: db_2.drugPriceReports.moderatedAt,
            createdAt: db_2.drugPriceReports.createdAt,
            pharmacyName: db_2.pharmacies.name,
            pharmacyAddress: db_2.pharmacies.address,
            pharmacyState: db_2.pharmacies.state,
            pharmacyId: db_2.pharmacies.id,
        })
            .from(db_2.drugPriceReports)
            .innerJoin(db_2.pharmacies, (0, drizzle_orm_1.eq)(db_2.drugPriceReports.pharmacyId, db_2.pharmacies.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_2.drugPriceReports.createdAt))
            .limit(perPage)
            .offset(offset);
        res.json({
            reports,
            pagination: {
                total: Number(countRow.count),
                page,
                perPage,
                pages: Math.ceil(Number(countRow.count) / perPage),
            },
        });
    }
    catch (err) {
        console.error("[MODERATION QUEUE]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getModerationQueue = getModerationQueue;
/** GET /api/v1/pharmacies/admin/moderation/stats */
const getModerationStats = async (_req, res) => {
    try {
        const [stats] = await db_1.db
            .select({
            pending: (0, drizzle_orm_1.sql) `count(*) filter (where moderation_status = 'pending')`,
            flagged: (0, drizzle_orm_1.sql) `count(*) filter (where moderation_status = 'flagged')`,
            approved: (0, drizzle_orm_1.sql) `count(*) filter (where moderation_status = 'approved')`,
            rejected: (0, drizzle_orm_1.sql) `count(*) filter (where moderation_status = 'rejected')`,
            total: (0, drizzle_orm_1.sql) `count(*)`,
            autoFlagged: (0, drizzle_orm_1.sql) `count(*) filter (where is_auto_flagged = true)`,
        })
            .from(db_2.drugPriceReports);
        // Reports in last 24 hours
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [recent] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_2.drugPriceReports)
            .where((0, drizzle_orm_1.gte)(db_2.drugPriceReports.createdAt, cutoff24h));
        res.json({
            pending: Number(stats.pending),
            flagged: Number(stats.flagged),
            approved: Number(stats.approved),
            rejected: Number(stats.rejected),
            total: Number(stats.total),
            autoFlagged: Number(stats.autoFlagged),
            last24h: Number(recent.count),
        });
    }
    catch (err) {
        console.error("[MODERATION STATS]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getModerationStats = getModerationStats;
/** PATCH /api/v1/pharmacies/admin/moderation/:id */
const moderateReport = async (req, res) => {
    const adminId = req.headers["x-user-id"];
    const { id } = req.params;
    const parse = moderationActionSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid action", details: parse.error.format() });
    }
    const { action, note, flagReason } = parse.data;
    const STATUS_MAP = {
        approve: "approved",
        reject: "rejected",
        flag: "flagged",
        unflag: "pending",
    };
    try {
        const [existing] = await db_1.db
            .select({ id: db_2.drugPriceReports.id, status: db_2.drugPriceReports.moderationStatus })
            .from(db_2.drugPriceReports)
            .where((0, drizzle_orm_1.eq)(db_2.drugPriceReports.id, id))
            .limit(1);
        if (!existing)
            return res.status(404).json({ error: "Report not found" });
        const newStatus = STATUS_MAP[action];
        const [updated] = await db_1.db
            .update(db_2.drugPriceReports)
            .set({
            moderationStatus: newStatus,
            moderatedBy: adminId,
            moderationNote: note || null,
            moderatedAt: new Date(),
            ...(action === "flag" && flagReason ? { flagReason } : {}),
        })
            .where((0, drizzle_orm_1.eq)(db_2.drugPriceReports.id, id))
            .returning();
        // Write to audit log
        await db_1.db.insert(db_2.moderationAuditLog).values({
            reportId: id,
            adminId,
            action,
            previousStatus: existing.status,
            newStatus,
            note: note || null,
        });
        res.json({ message: `Report ${action}d successfully.`, report: updated });
    }
    catch (err) {
        console.error("[MODERATE REPORT]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.moderateReport = moderateReport;
/** GET /api/v1/pharmacies/admin/moderation/:id/audit */
const getReportAuditTrail = async (req, res) => {
    const { id } = req.params;
    try {
        const [report] = await db_1.db
            .select()
            .from(db_2.drugPriceReports)
            .where((0, drizzle_orm_1.eq)(db_2.drugPriceReports.id, id))
            .limit(1);
        if (!report)
            return res.status(404).json({ error: "Report not found" });
        const auditLog = await db_1.db
            .select()
            .from(db_2.moderationAuditLog)
            .where((0, drizzle_orm_1.eq)(db_2.moderationAuditLog.reportId, id))
            .orderBy((0, drizzle_orm_1.desc)(db_2.moderationAuditLog.createdAt));
        res.json({ report, auditLog });
    }
    catch (err) {
        console.error("[AUDIT TRAIL]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getReportAuditTrail = getReportAuditTrail;
