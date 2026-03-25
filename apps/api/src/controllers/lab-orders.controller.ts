import { Request, Response } from "express";
import { db, labOrders } from "@medbridge/db";
import { eq, desc, and } from "drizzle-orm";

export class LabOrdersController {
  /**
   * Create a new lab order
   */
  static async createLabOrder(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;
    const { clinicId } = req;
    const { patientId, encounterId, testNames } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    if (!patientId || !testNames) {
      return res.status(400).json({ error: "Patient ID and test names are required." });
    }

    try {
      const [newOrder] = await db.insert(labOrders).values({
        patientId,
        encounterId: encounterId || null,
        doctorId: userId,
        clinicId,
        testNames,
        status: "ordered"
      }).returning();

      return res.status(201).json(newOrder);
    } catch (error) {
      console.error("Failed to create lab order:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update lab results
   */
  static async updateLabResults(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    const { results, attachmentUrl, status } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [updated] = await db.update(labOrders).set({
        results,
        attachmentUrl,
        status: status || "completed",
        completedAt: status === "completed" ? new Date() : undefined,
        updatedAt: new Date()
      }).where(and(eq(labOrders.id, id), eq(labOrders.clinicId, clinicId))).returning();

      if (!updated) return res.status(404).json({ error: "Lab order not found" });

      return res.status(200).json(updated);
    } catch (error) {
       console.error("Failed to update lab results:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * List lab orders for a patient
   */
  static async getPatientLabOrders(req: Request, res: Response) {
    const { patientId } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const results = await db.select()
        .from(labOrders)
        .where(and(eq(labOrders.patientId, patientId), eq(labOrders.clinicId, clinicId)))
        .orderBy(desc(labOrders.orderedAt));

      return res.status(200).json(results);
    } catch (error) {
       console.error("Failed to get patient lab orders:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
