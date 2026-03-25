import { Request, Response } from "express";
import { db, encounters, appointments } from "@medbridge/db";
import { eq, desc, and } from "drizzle-orm";

export class EncountersController {
  /**
   * Create a new clinical encounter
   */
  static async createEncounter(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;
    const { clinicId } = req;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    const { 
      patientId, 
      appointmentId, 
      chiefComplaint, 
      historyOfPresentIllness,
      examinationFindings,
      diagnosis,
      icd11Codes,
      plan,
      soapNote
    } = req.body;

    if (!patientId || !chiefComplaint) {
      return res.status(400).json({ error: "Patient ID and Chief Complaint are required." });
    }

    try {
      // 1. Create encounter
      const [newEncounter] = await db.insert(encounters).values({
        patientId,
        doctorId: userId,
        clinicId,
        appointmentId: appointmentId || null,
        chiefComplaint,
        historyOfPresentIllness,
        examinationFindings,
        diagnosis,
        icd11Codes,
        plan,
        soapNote,
        status: "draft"
      }).returning();

      // 2. If an appointment exists, update its status to completed
      if (appointmentId) {
        await db.update(appointments)
          .set({ status: "completed" })
          .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId)));
      }

      return res.status(201).json(newEncounter);
    } catch (error) {
      console.error("Failed to create encounter:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get encounter details
   */
  static async getEncounter(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [encounter] = await db.select().from(encounters)
        .where(and(eq(encounters.id, id), eq(encounters.clinicId, clinicId)))
        .limit(1);
        
      if (!encounter) return res.status(404).json({ error: "Encounter not found" });

      return res.status(200).json(encounter);
    } catch (error) {
       console.error("Failed to get encounter:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update (Draft) Encounter
   */
  static async updateEncounter(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    
    const { 
      chiefComplaint, 
      historyOfPresentIllness,
      examinationFindings,
      diagnosis,
      icd11Codes,
      plan,
      soapNote
    } = req.body;

    try {
      const [existing] = await db.select().from(encounters)
        .where(and(eq(encounters.id, id), eq(encounters.clinicId, clinicId)))
        .limit(1);
        
      if (!existing) return res.status(404).json({ error: "Encounter not found" });

      if (existing.status === "signed") {
        return res.status(400).json({ error: "Cannot modify a signed encounter." });
      }

      const [updated] = await db.update(encounters).set({
        chiefComplaint,
        historyOfPresentIllness,
        examinationFindings,
        diagnosis,
        icd11Codes,
        plan,
        soapNote,
        updatedAt: new Date()
      }).where(eq(encounters.id, id)).returning();

      return res.status(200).json(updated);
    } catch (error) {
       console.error("Failed to update encounter:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Sign Encounter (Make it permanent)
   */
  static async signEncounter(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [updated] = await db.update(encounters).set({
        status: "signed",
        signedAt: new Date(),
        updatedAt: new Date()
      }).where(and(eq(encounters.id, id), eq(encounters.clinicId, clinicId))).returning();

      if (!updated) return res.status(404).json({ error: "Encounter not found" });

      return res.status(200).json(updated);
    } catch (error) {
       console.error("Failed to sign encounter:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * List encounters for a patient
   */
  static async getPatientEncounters(req: Request, res: Response) {
    const { patientId } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const results = await db.select()
        .from(encounters)
        .where(and(eq(encounters.patientId, patientId), eq(encounters.clinicId, clinicId)))
        .orderBy(desc(encounters.createdAt));

      return res.status(200).json(results);
    } catch (error) {
       console.error("Failed to get patient encounters:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
