import { Request, Response } from "express";
import { db, symptomChecks, healthProfiles } from "@medbridge/db";
import { eq, desc, and, gte } from "drizzle-orm";
import axios from "axios";
import { z } from "zod";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const analysisSchema = z.object({
  symptoms: z.array(z.string()).min(1),
  duration: z.string().or(z.number()),
  durationUnit: z.enum(["hours", "days", "weeks"]),
  severity: z.number().min(1).max(10),
  hasFever: z.boolean(),
  location: z.string().optional(),
});

export const analyzeSymptoms = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;

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
    const existingChecks = await db
      .select()
      .from(symptomChecks)
      .where(
        and(
          eq(symptomChecks.userId, userId),
          gte(symptomChecks.createdAt, oneDayAgo)
        )
      );

    if (existingChecks.length >= 10) {
      return res.status(429).json({ 
        error: "Daily limit reached", 
        message: "You have reached your limit of 10 symptom checks per 24 hours." 
      });
    }

    // 3. Fetch user health profile for context
    const [profile] = await db
      .select()
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, userId))
      .limit(1);

    // 4. Call AI Service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/internal/symptom/analyze`, {
      symptoms,
      duration,
      durationUnit,
      severity,
      hasFever,
      location: location || profile?.state || "Nigeria",
      genotype: profile?.genotype || null,
      knownConditions: profile?.chronicConditions ? JSON.parse(profile.chronicConditions) : [],
    });

    const analysisResult = aiResponse.data;

    // 3. Save to DB
    const [check] = await db
      .insert(symptomChecks)
      .values({
        userId,
        symptoms: JSON.stringify(symptoms),
        analysis: JSON.stringify(analysisResult),
        urgency: analysisResult.urgency,
        createdAt: new Date(),
      })
      .returning();

    res.status(200).json({ ...check, result: analysisResult });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("[ANALYZE SYMPTOMS ERROR]:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to analyze symptoms", message: err.message });
    } else {
      console.error("[ANALYZE SYMPTOMS ERROR]:", err);
      res.status(500).json({ error: "Failed to analyze symptoms", message: err instanceof Error ? err.message : String(err) });
    }
  }
};

export const getHistory = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const history = await db
      .select()
      .from(symptomChecks)
      .where(eq(symptomChecks.userId, userId))
      .orderBy(desc(symptomChecks.createdAt));

    // Parse JSON strings back to objects
    const formattedHistory = history.map((h) => ({
      ...h,
      symptoms: JSON.parse(h.symptoms),
      result: JSON.parse(h.analysis),
    }));

    res.status(200).json(formattedHistory);
  } catch (err) {
    console.error("[GET HISTORY ERROR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getById = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [check] = await db
      .select()
      .from(symptomChecks)
      .where(eq(symptomChecks.id, id))
      .limit(1);

    if (!check || check.userId !== userId) {
      return res.status(404).json({ error: "Symptom check not found" });
    }

    res.status(200).json({
      ...check,
      symptoms: JSON.parse(check.symptoms),
      result: JSON.parse(check.analysis),
    });
  } catch (err) {
    console.error("[GET BY ID ERROR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
