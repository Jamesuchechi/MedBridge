"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainDrug = exports.checkInteractions = exports.getDrugCategories = exports.getDrugById = exports.searchDrugs = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const Typesense = __importStar(require("typesense"));
const axios_1 = __importDefault(require("axios"));
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
// ─── Typesense client (shared) ────────────────────────────────────────────────
let typesenseClient = null;
function getTypesenseClient() {
    const host = process.env.TYPESENSE_HOST;
    const key = process.env.TYPESENSE_SEARCH_KEY || process.env.TYPESENSE_ADMIN_KEY;
    if (!host || !key)
        return null;
    if (!typesenseClient) {
        typesenseClient = new Typesense.Client({
            nodes: [{
                    host,
                    port: parseInt(process.env.TYPESENSE_PORT || "8108"),
                    protocol: process.env.TYPESENSE_PROTOCOL || "http",
                }],
            apiKey: key,
            connectionTimeoutSeconds: 5,
        });
    }
    return typesenseClient;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseJsonArray(val) {
    if (!val)
        return [];
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function formatDrug(drug) {
    return {
        ...drug,
        brandNames: parseJsonArray(drug.brandNames),
        uses: parseJsonArray(drug.uses),
        contraindications: parseJsonArray(drug.contraindications),
        sideEffects: parseJsonArray(drug.sideEffects),
        interactions: parseJsonArray(drug.interactions),
        icdIndications: parseJsonArray(drug.icdIndications),
        priceDisplay: drug.priceRangeMin
            ? `₦${drug.priceRangeMin.toLocaleString()} – ₦${drug.priceRangeMax.toLocaleString()}`
            : drug.priceRange || "Price unavailable",
    };
}
// ─── SEARCH ───────────────────────────────────────────────────────────────────
const searchDrugs = async (req, res) => {
    const { q = "", category, rx, page = "1", per_page = "20" } = req.query;
    const userId = req.headers["x-user-id"];
    if (!q.trim() && !category) {
        return res.status(400).json({ error: "Provide a search query (q) or category filter" });
    }
    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.min(50, Math.max(1, parseInt(per_page)));
    try {
        // ── Try Typesense first ──
        const ts = getTypesenseClient();
        if (ts && q.trim()) {
            try {
                const filterParts = [];
                if (category)
                    filterParts.push(`category:=${category}`);
                if (rx === "true")
                    filterParts.push("requiresPrescription:=true");
                if (rx === "false")
                    filterParts.push("requiresPrescription:=false");
                const result = await ts.collections("drugs").documents().search({
                    q: q.trim(),
                    query_by: "name,genericName,brandNames,uses,category",
                    query_by_weights: "4,4,3,2,1",
                    filter_by: filterParts.join(" && ") || undefined,
                    page: pageNum,
                    per_page: limit,
                    highlight_full_fields: "name,genericName",
                });
                // Log the query
                if (userId) {
                    await db_1.db.insert(db_1.drugQueryLogs).values({
                        userId, query: q.trim(), queryType: "search"
                    }).catch(() => { }); // non-blocking
                }
                return res.json({
                    source: "typesense",
                    hits: result.hits?.map((h) => formatDrug(h.document)) ?? [],
                    total: result.found,
                    page: pageNum,
                    pages: Math.ceil(result.found / limit),
                });
            }
            catch (tsErr) {
                console.warn("[SEARCH] Typesense failed, falling back to Postgres:", tsErr instanceof Error ? tsErr.message : String(tsErr));
            }
        }
        // ── Postgres fallback (full-text or ILIKE) ──
        const searchTerm = `%${q.trim()}%`;
        const results = await db_1.db
            .select()
            .from(db_1.drugs)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(db_1.drugs.name, searchTerm), (0, drizzle_orm_1.ilike)(db_1.drugs.genericName, searchTerm), (0, drizzle_orm_1.ilike)(db_1.drugs.brandNames, searchTerm), (0, drizzle_orm_1.ilike)(db_1.drugs.category, searchTerm), (0, drizzle_orm_1.ilike)(db_1.drugs.uses, searchTerm)))
            .limit(limit)
            .offset((pageNum - 1) * limit);
        return res.json({
            source: "postgres",
            hits: results.map(formatDrug),
            total: results.length,
            page: pageNum,
        });
    }
    catch (err) {
        console.error("[SEARCH DRUGS ERROR]:", err instanceof Error ? err.message : String(err));
        res.status(500).json({ error: "Search failed" });
    }
};
exports.searchDrugs = searchDrugs;
// ─── GET BY ID ────────────────────────────────────────────────────────────────
const getDrugById = async (req, res) => {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];
    try {
        const [drug] = await db_1.db
            .select()
            .from(db_1.drugs)
            .where((0, drizzle_orm_1.eq)(db_1.drugs.id, id))
            .limit(1);
        if (!drug) {
            return res.status(404).json({ error: "Drug not found" });
        }
        // Log view
        if (userId) {
            await db_1.db.insert(db_1.drugQueryLogs).values({
                userId, query: drug.name, drugId: drug.id, queryType: "detail"
            }).catch(() => { });
        }
        res.json(formatDrug(drug));
    }
    catch (err) {
        console.error("[GET DRUG ERROR]:", err instanceof Error ? err.message : String(err));
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDrugById = getDrugById;
// ─── LIST CATEGORIES ──────────────────────────────────────────────────────────
const getDrugCategories = async (_req, res) => {
    try {
        const result = await db_1.db
            .selectDistinct({ category: db_1.drugs.category })
            .from(db_1.drugs)
            .orderBy(db_1.drugs.category);
        res.json(result.map(r => r.category).filter(Boolean));
    }
    catch (err) {
        console.error("[GET CATEGORIES ERROR]:", err instanceof Error ? err.message : String(err));
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDrugCategories = getDrugCategories;
// ─── INTERACTION CHECKER ──────────────────────────────────────────────────────
const checkInteractions = async (req, res) => {
    const { drugNames } = req.body;
    const userId = req.headers["x-user-id"];
    if (!Array.isArray(drugNames) || drugNames.length < 2) {
        return res.status(400).json({ error: "Provide at least 2 drug names to check interactions" });
    }
    if (drugNames.length > 8) {
        return res.status(400).json({ error: "Maximum 8 drugs per interaction check" });
    }
    try {
        // 1. Look up each drug in DB to get their known interactions
        const drugDetails = await Promise.all(drugNames.map(async (name) => {
            const results = await db_1.db
                .select()
                .from(db_1.drugs)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(db_1.drugs.name, `%${name}%`), (0, drizzle_orm_1.ilike)(db_1.drugs.genericName, `%${name}%`)))
                .limit(1);
            return results[0] ? formatDrug(results[0]) : null;
        }));
        const foundDrugs = drugDetails.filter(Boolean);
        // 2. Call AI service for intelligent interaction analysis
        // Fetch profile for context
        const [profile] = userId ? await db_1.db.select().from(db_1.healthProfiles).where((0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, userId)).limit(1) : [null];
        const aiResponse = await axios_1.default.post(`${AI_SERVICE_URL}/internal/drugs/interactions`, {
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
        }, { timeout: 15000 });
        const result = aiResponse.data;
        // Log
        if (userId) {
            await db_1.db.insert(db_1.drugQueryLogs).values({
                userId,
                query: drugNames.join(" + "),
                queryType: "interaction",
            }).catch(() => { });
        }
        res.json({
            drugs: drugNames,
            foundInDB: foundDrugs.map((d) => d?.name),
            interactions: result.interactions,
            summary: result.summary,
            severity: result.overallSeverity, // "none" | "minor" | "moderate" | "severe" | "contraindicated"
            disclaimer: "This interaction check is for informational purposes only. Always consult a pharmacist or doctor.",
        });
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err)) {
            console.error("[INTERACTION ERROR]:", err.response?.data || err.message);
            return res.status(500).json({ error: "Interaction check failed", message: err.message });
        }
        console.error("[INTERACTION ERROR]:", err instanceof Error ? err.message : String(err));
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.checkInteractions = checkInteractions;
const explainDrug = async (req, res) => {
    const { drugName, question, patientContext } = req.body;
    const userId = req.headers["x-user-id"];
    if (!drugName) {
        return res.status(400).json({ error: "Drug name is required" });
    }
    try {
        // 0. Fetch user profile for context and merge with provided context
        const [profile] = userId ? await db_1.db.select().from(db_1.healthProfiles).where((0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, userId)).limit(1) : [null];
        const profileContext = profile ? `Patient: ${profile.gender}, ${profile.bloodGroup}/${profile.genotype}. Chronic conditions: ${profile.chronicConditions}. Current meds: ${profile.medications}. Allergies: ${profile.allergies}.` : "";
        const mergedContext = `${profileContext}${patientContext ? ` Additional Context: ${patientContext}` : ""}`;
        const aiResponse = await axios_1.default.post(`${AI_SERVICE_URL}/internal/drugs/explain`, { drugName, question, patientContext: mergedContext.trim() || undefined }, { timeout: 15000 });
        // Log the interaction
        if (userId) {
            await db_1.db.insert(db_1.drugQueryLogs).values({
                userId,
                query: `Explain: ${drugName}${question ? ` - ${question}` : ""}`,
                queryType: "explanation",
            }).catch(() => { });
        }
        res.json(aiResponse.data);
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err)) {
            console.error("[EXPLAIN DRUG ERROR]:", err.response?.data || err.message);
            return res.status(500).json({ error: "Explanation failed", message: err.message });
        }
        console.error("[EXPLAIN DRUG ERROR]:", err instanceof Error ? err.message : String(err));
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.explainDrug = explainDrug;
