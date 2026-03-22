import { Request, Response } from "express";
import { db, drugs, healthProfiles, drugQueryLogs } from "@medbridge/db";
import { eq, ilike, or } from "drizzle-orm";
import * as Typesense from "typesense";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Typesense client (shared) ────────────────────────────────────────────────
let typesenseClient: Typesense.Client | null = null;

function getTypesenseClient(): Typesense.Client | null {
  const host = process.env.TYPESENSE_HOST;
  const key  = process.env.TYPESENSE_SEARCH_KEY || process.env.TYPESENSE_ADMIN_KEY;
  if (!host || !key) return null;

  if (!typesenseClient) {
    typesenseClient = new Typesense.Client({
      nodes: [{
        host,
        port:     parseInt(process.env.TYPESENSE_PORT || "8108"),
        protocol: process.env.TYPESENSE_PROTOCOL || "http",
      }],
      apiKey: key,
      connectionTimeoutSeconds: 5,
    });
  }
  return typesenseClient;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface DrugDocument {
  id: string;
  name: string;
  genericName: string;
  nafdacNumber?: string | null;
  manufacturer?: string | null;
  category: string;
  form?: string | null;
  strength?: string | null;
  brandNames?: string | null;
  uses?: string | null;
  contraindications?: string | null;
  sideEffects?: string | null;
  interactions?: string | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  requiresPrescription?: boolean | null;
  controlled?: boolean | null;
  atcCode?: string | null;
  icdIndications?: string | null;
  priceRange?: string | null; // For legacy/Typesense compatibility
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function formatDrug(drug: DrugDocument | Record<string, unknown>) {
  const d = drug as DrugDocument;
  return {
    ...d,
    brandNames:        parseJsonArray(d.brandNames),
    uses:              parseJsonArray(d.uses),
    contraindications: parseJsonArray(d.contraindications),
    sideEffects:       parseJsonArray(d.sideEffects),
    interactions:      parseJsonArray(d.interactions),
    icdIndications:    parseJsonArray(d.icdIndications),
    priceDisplay:      d.priceRangeMin
      ? `₦${(d.priceRangeMin as number).toLocaleString()} – ₦${(d.priceRangeMax as number).toLocaleString()}`
      : d.priceRange || "Price unavailable",
  };
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
export const searchDrugs = async (req: Request, res: Response) => {
  const { q = "", category, rx, page = "1", per_page = "20" } = req.query as Record<string, string>;
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!q.trim() && !category) {
    return res.status(400).json({ error: "Provide a search query (q) or category filter" });
  }

  const pageNum = Math.max(1, parseInt(page));
  const limit   = Math.min(50, Math.max(1, parseInt(per_page)));

  try {
    // ── Try Typesense first ──
    const ts = getTypesenseClient();
    if (ts && q.trim()) {
      try {
        const filterParts: string[] = [];
        if (category)    filterParts.push(`category:=${category}`);
        if (rx === "true")  filterParts.push("requiresPrescription:=true");
        if (rx === "false") filterParts.push("requiresPrescription:=false");

        const result = await ts.collections("drugs").documents().search({
          q:                q.trim(),
          query_by:         "name,genericName,brandNames,uses,category",
          query_by_weights: "4,4,3,2,1",
          filter_by:        filterParts.join(" && ") || undefined,
          page:             pageNum,
          per_page:         limit,
          highlight_full_fields: "name,genericName",
        });

        // Log the query
        if (userId) {
          await db.insert(drugQueryLogs).values({
            userId, query: q.trim(), queryType: "search"
          }).catch(() => {}); // non-blocking
        }

        return res.json({
          source: "typesense",
          hits:   result.hits?.map((h) => formatDrug(h.document as DrugDocument)) ?? [],
          total:  result.found,
          page:   pageNum,
          pages:  Math.ceil((result.found as number) / limit),
        });
      } catch (tsErr) {
        console.warn("[SEARCH] Typesense failed, falling back to Postgres:", tsErr instanceof Error ? tsErr.message : String(tsErr));
      }
    }

    // ── Postgres fallback (full-text or ILIKE) ──
    const searchTerm = `%${q.trim()}%`;
    const results = await db
      .select()
      .from(drugs)
      .where(
        or(
          ilike(drugs.name,        searchTerm),
          ilike(drugs.genericName, searchTerm),
          ilike(drugs.brandNames,  searchTerm),
          ilike(drugs.category,    searchTerm),
          ilike(drugs.uses,        searchTerm),
        )
      )
      .limit(limit)
      .offset((pageNum - 1) * limit);

    return res.json({
      source: "postgres",
      hits:   results.map(formatDrug),
      total:  results.length,
      page:   pageNum,
    });
  } catch (err) {
    console.error("[SEARCH DRUGS ERROR]:", err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Search failed" });
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────
export const getDrugById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.headers["x-user-id"] as string | undefined;

  try {
    const [drug] = await db
      .select()
      .from(drugs)
      .where(eq(drugs.id, id))
      .limit(1);

    if (!drug) {
      return res.status(404).json({ error: "Drug not found" });
    }

    // Log view
    if (userId) {
      await db.insert(drugQueryLogs).values({
        userId, query: drug.name, drugId: drug.id, queryType: "detail"
      }).catch(() => {});
    }

    res.json(formatDrug(drug as Record<string, unknown>));
  } catch (err) {
    console.error("[GET DRUG ERROR]:", err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── LIST CATEGORIES ──────────────────────────────────────────────────────────
export const getDrugCategories = async (_req: Request, res: Response) => {
  try {
    const result = await db
      .selectDistinct({ category: drugs.category })
      .from(drugs)
      .orderBy(drugs.category);

    res.json(result.map(r => r.category).filter(Boolean));
  } catch (err) {
    console.error("[GET CATEGORIES ERROR]:", err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── INTERACTION CHECKER ──────────────────────────────────────────────────────
export const checkInteractions = async (req: Request, res: Response) => {
  const { drugNames } = req.body as { drugNames: string[] };
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!Array.isArray(drugNames) || drugNames.length < 2) {
    return res.status(400).json({ error: "Provide at least 2 drug names to check interactions" });
  }
  if (drugNames.length > 8) {
    return res.status(400).json({ error: "Maximum 8 drugs per interaction check" });
  }

  try {
    // 1. Look up each drug in DB to get their known interactions
    const drugDetails = await Promise.all(
      drugNames.map(async (name) => {
        const results = await db
          .select()
          .from(drugs)
          .where(
            or(
              ilike(drugs.name,        `%${name}%`),
              ilike(drugs.genericName, `%${name}%`),
            )
          )
          .limit(1);
        return results[0] ? formatDrug(results[0] as Record<string, unknown>) : null;
      })
    );

    const foundDrugs = drugDetails.filter(Boolean);

    // 2. Call AI service for intelligent interaction analysis
    // Fetch profile for context
    const [profile] = userId ? await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1) : [null];

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/internal/drugs/interactions`,
      {
        drugs: drugNames,
        drugDetails: foundDrugs,
        patientDetails: profile ? {
          conditions: profile.chronicConditions ? JSON.parse(profile.chronicConditions) : [],
          allergies: profile.allergies ? JSON.parse(profile.allergies) : [],
          medications: profile.medications ? JSON.parse(profile.medications) : [],
          familyHistory: profile.familyHistory ? JSON.parse(profile.familyHistory) : [],
          vaccinations: profile.vaccinations ? JSON.parse(profile.vaccinations) : [],
          medicalHistory: profile.medicalHistory ? JSON.parse(profile.medicalHistory) : [],
        } : null,
      },
      { timeout: 15000 }
    );

    const result = aiResponse.data;

    // Log
    if (userId) {
      await db.insert(drugQueryLogs).values({
        userId,
        query: drugNames.join(" + "),
        queryType: "interaction",
      }).catch(() => {});
    }

    res.json({
      drugs:        drugNames,
      foundInDB:    foundDrugs.map((d) => (d as Record<string,unknown>)?.name),
      interactions: result.interactions,
      summary:      result.summary,
      severity:     result.overallSeverity,   // "none" | "minor" | "moderate" | "severe" | "contraindicated"
      disclaimer:   "This interaction check is for informational purposes only. Always consult a pharmacist or doctor.",
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("[INTERACTION ERROR]:", err.response?.data || err.message);
      return res.status(500).json({ error: "Interaction check failed", message: err.message });
    }
    console.error("[INTERACTION ERROR]:", err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Internal server error" });
  }
};

export const explainDrug = async (req: Request, res: Response) => {
  const { drugName, question, patientContext } = req.body;
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!drugName) {
    return res.status(400).json({ error: "Drug name is required" });
  }

  try {
    // 0. Fetch user profile for context and merge with provided context
    const [profile] = userId ? await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1) : [null];
    const profileContext = profile ? `Patient: ${profile.gender}, ${profile.bloodGroup}/${profile.genotype}. Chronic conditions: ${profile.chronicConditions}. Current meds: ${profile.medications}. Allergies: ${profile.allergies}.` : "";
    const mergedContext = `${profileContext}${patientContext ? ` Additional Context: ${patientContext}` : ""}`;

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/internal/drugs/explain`,
      { drugName, question, patientContext: mergedContext.trim() || undefined },
      { timeout: 15000 }
    );

    // Log the interaction
    if (userId) {
      await db.insert(drugQueryLogs).values({
        userId,
        query: `Explain: ${drugName}${question ? ` - ${question}` : ""}`,
        queryType: "explanation",
      }).catch(() => {});
    }

    res.json(aiResponse.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("[EXPLAIN DRUG ERROR]:", err.response?.data || err.message);
      return res.status(500).json({ error: "Explanation failed", message: err.message });
    }
    console.error("[EXPLAIN DRUG ERROR]:", err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Internal server error" });
  }
};