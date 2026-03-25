"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCase = exports.generateSoapNote = exports.analyzeCase = void 0;
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const db_1 = require("@medbridge/db");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
// ─── Schemas ──────────────────────────────────────────────────────────────────
const vitalsSchema = zod_1.z.object({
    bp: zod_1.z.string(),
    temp: zod_1.z.string(),
    pulse: zod_1.z.string(),
    rr: zod_1.z.string(),
    spO2: zod_1.z.string(),
});
const analysisSchema = zod_1.z.object({
    patientAge: zod_1.z.string(),
    patientSex: zod_1.z.string(),
    chiefComplaint: zod_1.z.string(),
    vitals: vitalsSchema,
    hpi: zod_1.z.string(),
    ros: zod_1.z.record(zod_1.z.boolean()),
    examFindings: zod_1.z.string(),
});
const soapSchema = zod_1.z.object({
    caseData: analysisSchema,
    analysis: zod_1.z.object({
        summary: zod_1.z.string(),
        differentials: zod_1.z.array(zod_1.z.object({
            diagnosis: zod_1.z.string(),
            reasoning: zod_1.z.string(),
            confidence: zod_1.z.number(),
            urgency: zod_1.z.string(),
        })),
        investigations: zod_1.z.array(zod_1.z.string()),
    }),
});
const saveCaseSchema = zod_1.z.object({
    patientName: zod_1.z.string(),
    patientAge: zod_1.z.string(),
    patientSex: zod_1.z.string(),
    chiefComplaint: zod_1.z.string(),
    vitals: vitalsSchema,
    analysis: zod_1.z.unknown(), // The full AI result
    soapNote: zod_1.z.string(),
    patientId: zod_1.z.string().optional(),
});
// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Robustly logs each copilot session to the audit trail.
 */
async function logCopilotSession({ doctorId, action, input, output, status, promptVersion, errorMessage }) {
    try {
        await db_1.db.insert(db_1.copilotAuditLogs).values({
            doctorId,
            action,
            promptVersion: promptVersion || "unknown",
            input: JSON.stringify(input),
            output: output ? JSON.stringify(output) : null,
            status,
            errorMessage: errorMessage || null,
        });
    }
    catch (error) {
        console.error("[AUDIT LOG ERROR]: Failed to log copilot session:", error);
        // We don't throw here to avoid failing the main request if logging fails,
        // though in a highly critical system we might.
    }
}
// ─── Handlers ─────────────────────────────────────────────────────────────────
const analyzeCase = async (req, res) => {
    const doctorId = req.headers["x-user-id"];
    try {
        const valet = analysisSchema.safeParse(req.body);
        if (!valet.success) {
            return res.status(400).json({ error: "Invalid case data", details: valet.error.format() });
        }
        const aiResponse = await axios_1.default.post(`${AI_SERVICE_URL}/internal/copilot/analyze`, valet.data);
        const data = aiResponse.data;
        // Log success
        if (doctorId) {
            await logCopilotSession({
                doctorId,
                action: "analyze",
                input: valet.data,
                output: data,
                status: "success",
                promptVersion: data.prompt_version,
            });
        }
        res.status(200).json(data);
    }
    catch (err) {
        let errorMessage = "An unknown error occurred";
        let status = 500;
        if (axios_1.default.isAxiosError(err)) {
            status = err.response?.status || 500;
            errorMessage = err.response?.data?.detail || err.message;
        }
        else if (err instanceof Error) {
            errorMessage = err.message;
        }
        // Log failure
        if (doctorId) {
            await logCopilotSession({
                doctorId,
                action: "analyze",
                input: req.body,
                status: "failure",
                errorMessage,
            });
        }
        console.error("[COPILOT ANALYZE ERROR]:", errorMessage);
        res.status(status).json({ error: "AI Analysis failed", message: errorMessage });
    }
};
exports.analyzeCase = analyzeCase;
const generateSoapNote = async (req, res) => {
    const doctorId = req.headers["x-user-id"];
    try {
        const valet = soapSchema.safeParse(req.body);
        if (!valet.success) {
            return res.status(400).json({ error: "Invalid data for SOAP generation", details: valet.error.format() });
        }
        const aiResponse = await axios_1.default.post(`${AI_SERVICE_URL}/internal/copilot/generate-soap`, valet.data);
        const data = aiResponse.data;
        // Log success
        if (doctorId) {
            await logCopilotSession({
                doctorId,
                action: "generate-soap",
                input: valet.data,
                output: data,
                status: "success",
                promptVersion: data.prompt_version,
            });
        }
        res.status(200).json(data);
    }
    catch (err) {
        let errorMessage = "An unknown error occurred";
        let status = 500;
        if (axios_1.default.isAxiosError(err)) {
            status = err.response?.status || 500;
            errorMessage = err.response?.data?.detail || err.message;
        }
        else if (err instanceof Error) {
            errorMessage = err.message;
        }
        // Log failure
        if (doctorId) {
            await logCopilotSession({
                doctorId,
                action: "generate-soap",
                input: req.body,
                status: "failure",
                errorMessage,
            });
        }
        console.error("[COPILOT SOAP ERROR]:", errorMessage);
        res.status(status).json({ error: "SOAP generation failed", message: errorMessage });
    }
};
exports.generateSoapNote = generateSoapNote;
const saveCase = async (req, res) => {
    const doctorId = req.headers["x-user-id"];
    if (!doctorId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const valet = saveCaseSchema.safeParse(req.body);
        if (!valet.success) {
            return res.status(400).json({ error: "Invalid save data", details: valet.error.format() });
        }
        const data = valet.data;
        const [newCase] = await db_1.db.insert(db_1.clinicalCases).values({
            doctorId,
            patientId: data.patientId || null,
            patientName: data.patientName,
            patientAge: data.patientAge,
            patientSex: data.patientSex,
            chiefComplaint: data.chiefComplaint,
            vitals: JSON.stringify(data.vitals),
            analysis: JSON.stringify(data.analysis),
            soapNote: data.soapNote,
        }).returning();
        res.status(201).json({ message: "Case saved successfully", case: newCase });
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("[COPILOT SAVE ERROR]:", errorMessage);
        res.status(500).json({ error: "Failed to save case", message: errorMessage });
    }
};
exports.saveCase = saveCase;
