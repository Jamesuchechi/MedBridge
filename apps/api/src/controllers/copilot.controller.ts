import { Request, Response } from "express";
import axios from "axios";
import { z } from "zod";
import { db, clinicalCases, copilotAuditLogs } from "@medbridge/db";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const vitalsSchema = z.object({
  bp: z.string(),
  temp: z.string(),
  pulse: z.string(),
  rr: z.string(),
  spO2: z.string(),
});

const analysisSchema = z.object({
  patientAge: z.string(),
  patientSex: z.string(),
  chiefComplaint: z.string(),
  vitals: vitalsSchema,
  hpi: z.string(),
  ros: z.record(z.boolean()),
  examFindings: z.string(),
});

const soapSchema = z.object({
  caseData: analysisSchema,
  analysis: z.object({
    summary: z.string(),
    differentials: z.array(z.object({
      diagnosis: z.string(),
      reasoning: z.string(),
      confidence: z.number(),
      urgency: z.string(),
    })),
    investigations: z.array(z.string()),
  }),
});

const saveCaseSchema = z.object({
  patientName: z.string(),
  patientAge: z.string(),
  patientSex: z.string(),
  chiefComplaint: z.string(),
  vitals: vitalsSchema,
  analysis: z.unknown(), // The full AI result
  soapNote: z.string(),
  patientId: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Robustly logs each copilot session to the audit trail.
 */
async function logCopilotSession({
  doctorId,
  action,
  input,
  output,
  status,
  promptVersion,
  errorMessage
}: {
  doctorId: string;
  action: "analyze" | "generate-soap";
  input: unknown;
  output?: unknown;
  status: "success" | "failure";
  promptVersion?: string;
  errorMessage?: string;
}) {
  try {
    await db.insert(copilotAuditLogs).values({
      doctorId,
      action,
      promptVersion: promptVersion || "unknown",
      input: JSON.stringify(input),
      output: output ? JSON.stringify(output) : null,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (error) {
    console.error("[AUDIT LOG ERROR]: Failed to log copilot session:", error);
    // We don't throw here to avoid failing the main request if logging fails,
    // though in a highly critical system we might.
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const analyzeCase = async (req: Request, res: Response) => {
  const doctorId = req.headers["x-user-id"] as string;
  
  try {
    const valet = analysisSchema.safeParse(req.body);
    if (!valet.success) {
      return res.status(400).json({ error: "Invalid case data", details: valet.error.format() });
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/internal/copilot/analyze`, valet.data);
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
  } catch (err: unknown) {
    let errorMessage = "An unknown error occurred";
    let status = 500;

    if (axios.isAxiosError(err)) {
      status = err.response?.status || 500;
      errorMessage = err.response?.data?.detail || err.message;
    } else if (err instanceof Error) {
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

export const generateSoapNote = async (req: Request, res: Response) => {
  const doctorId = req.headers["x-user-id"] as string;

  try {
    const valet = soapSchema.safeParse(req.body);
    if (!valet.success) {
      return res.status(400).json({ error: "Invalid data for SOAP generation", details: valet.error.format() });
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/internal/copilot/generate-soap`, valet.data);
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
  } catch (err: unknown) {
    let errorMessage = "An unknown error occurred";
    let status = 500;

    if (axios.isAxiosError(err)) {
      status = err.response?.status || 500;
      errorMessage = err.response?.data?.detail || err.message;
    } else if (err instanceof Error) {
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

export const saveCase = async (req: Request, res: Response) => {
  const doctorId = req.headers["x-user-id"] as string;
  if (!doctorId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const valet = saveCaseSchema.safeParse(req.body);
    if (!valet.success) {
      return res.status(400).json({ error: "Invalid save data", details: valet.error.format() });
    }

    const data = valet.data;

    const [newCase] = await db.insert(clinicalCases).values({
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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
    console.error("[COPILOT SAVE ERROR]:", errorMessage);
    res.status(500).json({ error: "Failed to save case", message: errorMessage });
  }
};
