import { Request, Response } from "express";
import { db, prescriptions, prescriptionItems } from "@medbridge/db";
import { eq, desc, and } from "drizzle-orm";

export class PrescriptionsController {
  /**
   * Create a new prescription
   */
  static async createPrescription(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;
    const { clinicId } = req;
    const { patientId, encounterId, notes, items } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Patient ID and at least one medication are required." });
    }

    try {
      // 1. Create prescription header
      const [newPrescription] = await db.insert(prescriptions).values({
        patientId,
        encounterId: encounterId || null,
        doctorId: userId,
        clinicId,
        notes,
        status: "active"
      }).returning();

      // 2. Create prescription items
      const itemsToInsert = items.map((item: { 
        drugId?: string; 
        drugName: string; 
        dosage: string; 
        frequency: string; 
        duration: string; 
        instructions: string; 
      }) => ({
        prescriptionId: newPrescription.id,
        drugId: item.drugId || null,
        drugName: item.drugName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions
      }));

      await db.insert(prescriptionItems).values(itemsToInsert);

      return res.status(201).json({ ...newPrescription, items: itemsToInsert });
    } catch (error) {
      console.error("Failed to create prescription:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get prescription with items
   */
  static async getPrescription(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [prescription] = await db.select().from(prescriptions)
        .where(and(eq(prescriptions.id, id), eq(prescriptions.clinicId, clinicId)))
        .limit(1);
        
      if (!prescription) return res.status(404).json({ error: "Prescription not found" });

      const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, prescription.id));

      return res.status(200).json({ ...prescription, items });
    } catch (error) {
       console.error("Failed to get prescription:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * List prescriptions for a patient
   */
  static async getPatientPrescriptions(req: Request, res: Response) {
    const { patientId } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const results = await db.select()
        .from(prescriptions)
        .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.clinicId, clinicId)))
        .orderBy(desc(prescriptions.createdAt));

      return res.status(200).json(results);
    } catch (error) {
       console.error("Failed to get patient prescriptions:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Discontinue prescription
   */
  static async discontinuePrescription(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [updated] = await db.update(prescriptions).set({
        status: "discontinued",
        updatedAt: new Date()
      }).where(and(eq(prescriptions.id, id), eq(prescriptions.clinicId, clinicId))).returning();

      if (!updated) return res.status(404).json({ error: "Prescription not found" });

      return res.status(200).json(updated);
    } catch (error) {
       console.error("Failed to discontinue prescription:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
