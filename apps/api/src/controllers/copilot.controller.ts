import { Request, Response } from "express";
import axios from "axios";
import { z } from "zod";

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

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const analyzeCase = async (req: Request, res: Response) => {
  try {
    const valet = analysisSchema.safeParse(req.body);
    if (!valet.success) {
      return res.status(400).json({ error: "Invalid case data", details: valet.error.format() });
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/internal/copilot/analyze`, valet.data);
    res.status(200).json(aiResponse.data);
  } catch (err: any) {
    console.error("[COPILOT ANALYZE ERROR]:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: "AI Analysis failed", 
      message: err.response?.data?.detail || err.message 
    });
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
  } catch (err: any) {
    console.error("[COPILOT SOAP ERROR]:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: "SOAP generation failed", 
      message: err.response?.data?.detail || err.message 
    });
  }
};
