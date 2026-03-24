import { Request, Response } from "express";
import { db, referrals, users, doctorProfiles } from "@medbridge/db";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { NotificationService } from "../services/notification.service";

export const ReferralsController = {
  createReferral: async (req: Request, res: Response) => {
    const sendingDoctorId = req.headers["x-user-id"] as string;
    if (!sendingDoctorId) return res.status(401).json({ error: "Unauthorized" });

    const {
      patientId,
      patientName,
      patientAge,
      patientSex,
      receivingDoctorId,
      receivingFacility,
      specialty,
      priority,
      urgencyScore,
      notes,
      clinicalSummary
    } = req.body;

    if (!patientName || !specialty || !clinicalSummary) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const [newReferral] = await db.insert(referrals).values({
        patientId: patientId || null,
        patientName,
        patientAge,
        patientSex,
        sendingDoctorId,
        receivingDoctorId: receivingDoctorId || null,
        receivingFacility: receivingFacility || null,
        specialty,
        priority: priority || "Routine",
        urgencyScore: urgencyScore || 1,
        notes: notes || null,
        clinicalSummary: typeof clinicalSummary === 'string' ? clinicalSummary : JSON.stringify(clinicalSummary),
        status: "pending",
      }).returning();

      // If there's a specific receiving doctor, notify them
      if (receivingDoctorId) {
        await NotificationService.createNotification({
          userId: receivingDoctorId,
          title: "New Referral Received",
          message: `You have received a new ${priority} referral for ${patientName} (${specialty}).`,
          type: priority === "Stat" || priority === "Urgent" ? "warning" : "info",
          link: `/dashboard/referrals/${newReferral.id}`
        });
      }

      // If the patient is registered, notify them
      if (patientId) {
        await NotificationService.createNotification({
          userId: patientId,
          title: "New Specialist Referral",
          message: `Your doctor has initiated a referral for you to a ${specialty} specialist.`,
          type: "success",
          link: `/dashboard/referrals` // Or a patient-specific referral view if it exists
        });
      }

      res.status(201).json(newReferral);
    } catch (err) {
      console.error("[CREATE REFERRAL ERROR]:", err);
      res.status(500).json({ error: "Failed to create referral" });
    }
  },

  listSentReferrals: async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const list = await db
        .select()
        .from(referrals)
        .where(eq(referrals.sendingDoctorId, userId))
        .orderBy(desc(referrals.createdAt));

      res.status(200).json(list);
    } catch (err) {
      console.error("[LIST SENT REFERRALS ERROR]:", err);
      res.status(500).json({ error: "Failed to fetch sent referrals" });
    }
  },

  listReceivedReferrals: async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const list = await db
        .select()
        .from(referrals)
        .where(eq(referrals.receivingDoctorId, userId))
        .orderBy(desc(referrals.createdAt));

      res.status(200).json(list);
    } catch (err) {
      console.error("[LIST RECEIVED REFERRALS ERROR]:", err);
      res.status(500).json({ error: "Failed to fetch received referrals" });
    }
  },

  getReferralDetail: async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const [referral] = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.id, id),
          or(eq(referrals.sendingDoctorId, userId), eq(referrals.receivingDoctorId, userId))
        ))
        .limit(1);

      if (!referral) {
        return res.status(404).json({ error: "Referral not found" });
      }

      // Include doctor info
      const [sendingDoctor] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, referral.sendingDoctorId))
        .limit(1);

      res.status(200).json({ ...referral, sendingDoctorName: sendingDoctor?.name || "Unknown Doctor" });
    } catch (err) {
      console.error("[GET REFERRAL DETAIL ERROR]:", err);
      res.status(500).json({ error: "Failed to fetch referral detail" });
    }
  },

  updateReferralStatus: async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const [updated] = await db
        .update(referrals)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(referrals.id, id), eq(referrals.receivingDoctorId, userId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Referral not found or unauthorized" });
      }

      // Notify sending doctor
      await NotificationService.createNotification({
        userId: updated.sendingDoctorId,
        title: `Referral ${status.toUpperCase()}`,
        message: `Your referral for ${updated.patientName} has been ${status} by the receiving specialist.`,
        type: status === "rejected" ? "error" : "success",
        link: `/dashboard/referrals`
      });

      res.status(200).json(updated);
    } catch (err) {
      console.error("[UPDATE REFERRAL STATUS ERROR]:", err);
      res.status(500).json({ error: "Failed to update referral status" });
    }
  },

  searchSpecialists: async (req: Request, res: Response) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const results = await db
        .select({
          id: users.id,
          name: doctorProfiles.fullName,
          specialization: doctorProfiles.specialization,
          hospital: doctorProfiles.currentHospital,
          hospitalState: doctorProfiles.hospitalState,
        })
        .from(doctorProfiles)
        .innerJoin(users, eq(doctorProfiles.userId, users.id))
        .where(or(
          ilike(doctorProfiles.fullName, `%${query}%`),
          ilike(doctorProfiles.specialization, `%${query}%`),
          ilike(doctorProfiles.currentHospital, `%${query}%`)
        ))
        .limit(20);

      res.status(200).json(results);
    } catch (err) {
      console.error("[SEARCH SPECIALISTS ERROR]:", err);
      res.status(500).json({ error: "Failed to search specialists" });
    }
  }
};

