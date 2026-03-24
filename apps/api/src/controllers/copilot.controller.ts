import { Request, Response } from "express";
import axios from "axios";
import { z } from "zod";
import { db, clinicalCases } from "@medbridge/db";

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
  analysis: z.any(), // The full AI result
  soapNote: z.string(),
  patientId: z.string().optional(),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const analyzeCase = async (req: Request, res: Response) => {
  try {
    const valet = analysisSchema.safeParse(req.body);
    if (!valet.success) {
      return res.status(400).json({ error: "Invalid case data", details: valet.error.format() });
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/internal/copilot/analyze`, valet.data);
    res.status(200).json(aiResponse.data);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error("[COPILOT ANALYZE ERROR]:", err.response?.data || err.message);
      return res.status(err.response?.status || 500).json({ 
        error: "AI Analysis failed", 
        message: err.response?.data?.detail || err.message 
      });
    }
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
    console.error("[COPILOT ANALYZE ERROR]:", errorMessage);
    res.status(500).json({ error: "AI Analysis failed", message: errorMessage });
  }
};

export const generateSoapNote = async (req: Request, res: Response) => {
  try {
    const valet = soapSchema.safeParse(req.body);
    if (!valet.success) {
      return res.status(400).json({ error: "Invalid data for SOAP generation", details: valet.error.format() });
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/internal/copilot/generate-soap`, valet.data);
    res.status(200).json(aiResponse.data);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error("[COPILOT SOAP ERROR]:", err.response?.data || err.message);
      return res.status(err.response?.status || 500).json({ 
        error: "SOAP generation failed", 
        message: err.response?.data?.detail || err.message 
      });
    }
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
    console.error("[COPILOT SOAP ERROR]:", errorMessage);
    res.status(500).json({ error: "SOAP generation failed", message: errorMessage });
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
