"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getById = exports.getHistory = exports.analyzeSymptoms = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const analysisSchema = zod_1.z.object({
    symptoms: zod_1.z.array(zod_1.z.string()).min(1),
    duration: zod_1.z.string().or(zod_1.z.number()),
    durationUnit: zod_1.z.enum(["hours", "days", "weeks"]),
    severity: zod_1.z.number().min(1).max(10),
    hasFever: zod_1.z.boolean(),
    location: zod_1.z.string().optional(),
});
const analyzeSymptoms = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // 1. Validate request
    const validation = analysisSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: "Invalid request data", details: validation.error.format() });
    }
    const { symptoms, duration, durationUnit, severity, hasFever, location } = validation.data;
    try {
        // 2. Rate limit: 10 checks per day
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingChecks = await db_1.db
            .select()
            .from(db_1.symptomChecks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.symptomChecks.userId, userId), (0, drizzle_orm_1.gte)(db_1.symptomChecks.createdAt, oneDayAgo)));
        if (existingChecks.length >= 10) {
            return res.status(429).json({
                error: "Daily limit reached",
                message: "You have reached your limit of 10 symptom checks per 24 hours."
            });
        }
        // 3. Fetch user health profile for context
        const [profile] = await db_1.db
            .select()
            .from(db_1.healthProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, userId))
            .limit(1);
        // 4. Call AI Service
        const aiResponse = await axios_1.default.post(`${AI_SERVICE_URL}/internal/symptom/analyze`, {
            symptoms,
            duration,
            durationUnit,
            severity,
            hasFever,
            location: location || profile?.state || "Nigeria",
            genotype: profile?.genotype || null,
            knownConditions: profile?.chronicConditions ? JSON.parse(profile.chronicConditions) : [],
            allergies: profile?.allergies ? JSON.parse(profile.allergies) : [],
            currentMedications: profile?.medications ? JSON.parse(profile.medications) : [],
            familyHistory: profile?.familyHistory ? JSON.parse(profile.familyHistory) : [],
            vaccinations: profile?.vaccinations ? JSON.parse(profile.vaccinations) : [],
            medicalHistory: profile?.medicalHistory ? JSON.parse(profile.medicalHistory) : [],
            bmi: (profile?.weight && profile?.height) ? (parseFloat(profile.weight) / ((parseFloat(profile.height) / 100) ** 2)).toFixed(1) : null,
        });
        const analysisResult = aiResponse.data;
        // 3. Save to DB
        const [check] = await db_1.db
            .insert(db_1.symptomChecks)
            .values({
            userId,
            symptoms: JSON.stringify(symptoms),
            analysis: JSON.stringify(analysisResult),
            urgency: analysisResult.urgency,
            createdAt: new Date(),
        })
            .returning();
        res.status(200).json({ ...check, result: analysisResult });
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err)) {
            console.error("[ANALYZE SYMPTOMS ERROR]:", err.response?.data || err.message);
            res.status(500).json({ error: "Failed to analyze symptoms", message: err.message });
        }
        else {
            console.error("[ANALYZE SYMPTOMS ERROR]:", err);
            res.status(500).json({ error: "Failed to analyze symptoms", message: err instanceof Error ? err.message : String(err) });
        }
    }
};
exports.analyzeSymptoms = analyzeSymptoms;
const getHistory = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const history = await db_1.db
            .select()
            .from(db_1.symptomChecks)
            .where((0, drizzle_orm_1.eq)(db_1.symptomChecks.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(db_1.symptomChecks.createdAt));
        // Parse JSON strings back to objects
        const formattedHistory = history.map((h) => ({
            ...h,
            symptoms: JSON.parse(h.symptoms),
            result: JSON.parse(h.analysis),
        }));
        res.status(200).json(formattedHistory);
    }
    catch (err) {
        console.error("[GET HISTORY ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getHistory = getHistory;
const getById = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const [check] = await db_1.db
            .select()
            .from(db_1.symptomChecks)
            .where((0, drizzle_orm_1.eq)(db_1.symptomChecks.id, id))
            .limit(1);
        if (!check || check.userId !== userId) {
            return res.status(404).json({ error: "Symptom check not found" });
        }
        res.status(200).json({
            ...check,
            symptoms: JSON.parse(check.symptoms),
            result: JSON.parse(check.analysis),
        });
    }
    catch (err) {
        console.error("[GET BY ID ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getById = getById;
