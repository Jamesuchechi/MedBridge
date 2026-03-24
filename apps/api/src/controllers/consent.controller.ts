import { Request, Response } from "express";
import { db } from "@medbridge/db";
import { patientDoctorConsent, users, doctorProfiles } from "@medbridge/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotificationService } from "../services/notification.service";

export const ConsentController = {
  /**
   * Grant consent to a doctor
   * POST /api/v1/consent/grant
   */
  grantConsent: async (req: Request, res: Response) => {
    try {
      const patientId = req.headers["x-user-id"] as string;
      const { doctorId, expiresAt } = req.body;

      if (!patientId || !doctorId) {
        return res.status(400).json({ error: "Patient ID and Doctor ID are required" });
      }

      // Check if consent already exists
      const existing = await db
        .select()
        .from(patientDoctorConsent)
        .where(
          and(
            eq(patientDoctorConsent.patientId, patientId),
            eq(patientDoctorConsent.doctorId, doctorId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing consent to active
        const [updated] = await db
          .update(patientDoctorConsent)
          .set({ 
            status: "active", 
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            updatedAt: new Date() 
          })
          .where(eq(patientDoctorConsent.id, existing[0].id))
          .returning();
          
        return res.json(updated);
      }

      const [newConsent] = await db
        .insert(patientDoctorConsent)
        .values({
          patientId,
          doctorId,
          status: "active",
          expiresAt: expiresAt ? new Date(expiresAt) : null
        })
        .returning();

      // Get patient name for notification
      const [patientUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1);

      // Notify the doctor
      await NotificationService.createNotification({
        userId: doctorId,
        title: "Medical Record Access Granted",
        message: `${patientUser?.name || "A patient"} has granted you access to view their full MedBridge health profile.`,
        type: "success",
        link: `/dashboard/patients/${patientId}`
      });

      res.status(201).json(newConsent);
    } catch (err) {
      console.error("[GRANT CONSENT ERROR]:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Revoke consent from a doctor
   * POST /api/v1/consent/revoke
   */
  revokeConsent: async (req: Request, res: Response) => {
    try {
      const patientId = req.headers["x-user-id"] as string;
      const { doctorId } = req.body;

      const [revoked] = await db
        .update(patientDoctorConsent)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(
          and(
            eq(patientDoctorConsent.patientId, patientId),
            eq(patientDoctorConsent.doctorId, doctorId)
          )
        )
        .returning();

      if (!revoked) {
        return res.status(404).json({ error: "Consent record not found" });
      }

      res.json(revoked);
    } catch (err) {
      console.error("[REVOKE CONSENT ERROR]:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * List doctors with active consent
   * GET /api/v1/consent/doctors
   */
  listConsentedDoctors: async (req: Request, res: Response) => {
    try {
      const patientId = req.headers["x-user-id"] as string;

      const results = await db
        .select({
          id: patientDoctorConsent.id,
          doctorId: patientDoctorConsent.doctorId,
          status: patientDoctorConsent.status,
          expiresAt: patientDoctorConsent.expiresAt,
          fullName: doctorProfiles.fullName,
          specialization: doctorProfiles.specialization,
          currentHospital: doctorProfiles.currentHospital,
        })
        .from(patientDoctorConsent)
        .innerJoin(doctorProfiles, eq(patientDoctorConsent.doctorId, doctorProfiles.userId))
        .where(eq(patientDoctorConsent.patientId, patientId))
        .orderBy(desc(patientDoctorConsent.createdAt));

      res.json(results);
    } catch (err) {
      console.error("[LIST CONSENTED DOCTORS ERROR]:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Internal/Service helper to check consent
   */
  checkConsent: async (patientId: string, doctorId: string): Promise<boolean> => {
    const [consent] = await db
      .select()
      .from(patientDoctorConsent)
      .where(
        and(
          eq(patientDoctorConsent.patientId, patientId),
          eq(patientDoctorConsent.doctorId, doctorId),
          eq(patientDoctorConsent.status, "active")
        )
      )
      .limit(1);

    if (!consent) return false;

    // Check expiration
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      return false;
    }

    return true;
  }
};
