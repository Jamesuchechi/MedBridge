import { Request, Response } from "express";
import { db, insuranceProviders, patientInsurance, insuranceClaims } from "@medbridge/db";
import { eq, desc } from "drizzle-orm";

export class InsuranceController {
  /**
   * List all insurance providers (HMOs)
   */
  static async getProviders(req: Request, res: Response) {
    try {
      const providers = await db.select().from(insuranceProviders).orderBy(insuranceProviders.name);
      return res.status(200).json(providers);
    } catch (error) {
      console.error("Failed to fetch insurance providers:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get patient insurance policy
   */
  static async getPatientPolicy(req: Request, res: Response) {
    const { patientId } = req.params;
    try {
      const [policy] = await db.select().from(patientInsurance)
        .where(eq(patientInsurance.patientId, patientId))
        .limit(1);
      
      return res.status(200).json(policy || null);
    } catch (error) {
      console.error("Failed to fetch patient policy:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update or link patient insurance policy
   */
  static async updatePatientPolicy(req: Request, res: Response) {
    const { patientId } = req.params;
    const { providerId, policyNumber, planType, status, expiresAt } = req.body;

    try {
      const existing = await db.select().from(patientInsurance)
        .where(eq(patientInsurance.patientId, patientId))
        .limit(1);

      const data = {
        patientId,
        providerId,
        policyNumber,
        planType,
        status: status || "active",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: new Date()
      };

      if (existing.length > 0) {
        await db.update(patientInsurance).set(data).where(eq(patientInsurance.id, existing[0].id));
        return res.status(200).json({ status: "updated" });
      } else {
        await db.insert(patientInsurance).values(data);
        return res.status(201).json({ status: "created" });
      }
    } catch (error) {
      console.error("Failed to update patient policy:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Create an insurance claim from an invoice
   */
  static async createClaim(req: Request, res: Response) {
    const { clinicId } = req;
    const { invoiceId, patientId, encounterId, totalAmount } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      // 1. Generate claim number
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      const claimNumber = `CLM-${year}-${random}`;

      const [newClaim] = await db.insert(insuranceClaims).values({
        clinicId,
        patientId,
        invoiceId,
        encounterId: encounterId || null,
        claimNumber,
        totalAmount: totalAmount.toString(),
        status: "draft",
      }).returning();

      return res.status(201).json(newClaim);
    } catch (error) {
      console.error("Failed to create claim:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * List claims for a clinic
   */
  static async getClinicClaims(req: Request, res: Response) {
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const claims = await db.select().from(insuranceClaims)
        .where(eq(insuranceClaims.clinicId, clinicId))
        .orderBy(desc(insuranceClaims.createdAt));
      
      return res.status(200).json(claims);
    } catch (error) {
      console.error("Failed to fetch clinic claims:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Update claim status
   */
  static async updateClaimStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status, approvedAmount, rejectionReason } = req.body;

    try {
      const updateData: Partial<typeof insuranceClaims.$inferInsert> = { status, updatedAt: new Date() };
      if (approvedAmount) updateData.approvedAmount = approvedAmount.toString();
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
      if (status === "submitted") updateData.submittedAt = new Date();
      if (status === "approved" || status === "rejected") updateData.processedAt = new Date();

      await db.update(insuranceClaims).set(updateData).where(eq(insuranceClaims.id, id));
      return res.status(200).json({ status: "updated" });
    } catch (error) {
      console.error("Failed to update claim status:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
