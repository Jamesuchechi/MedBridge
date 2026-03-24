import { Request, Response } from "express";
import { db } from "@medbridge/db";
import { consultationRequests, users, doctorProfiles } from "@medbridge/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotificationService } from "../services/notification.service";

export const ConsultationsController = {
  /**
   * Create consultation request
   * POST /api/v1/consultations
   */
  createRequest: async (req: Request, res: Response) => {
    try {
      const patientId = req.headers["x-user-id"] as string;
      const { doctorId, message } = req.body;

      if (!patientId || !doctorId) {
        return res.status(400).json({ error: "Patient ID and Doctor ID are required" });
      }

      // Check for existing pending request
      const existing = await db
        .select()
        .from(consultationRequests)
        .where(
          and(
            eq(consultationRequests.patientId, patientId),
            eq(consultationRequests.doctorId, doctorId),
            eq(consultationRequests.status, "pending")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: "You already have a pending request for this doctor" });
      }

      const [newRequest] = await db
        .insert(consultationRequests)
        .values({
          patientId,
          doctorId,
          message,
          status: "pending"
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
        title: "New Consultation Request",
        message: `${patientUser?.name || "A patient"} has requested a consultation with you.`,
        type: "info",
        link: `/dashboard/consultations`
      });

      res.status(201).json(newRequest);
    } catch (err) {
      console.error("[CREATE CONSULTATION ERROR]:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * List requests for the logged in user
   * GET /api/v1/consultations
   */
  listRequests: async (req: Request, res: Response) => {
    try {
      const userId = req.headers["x-user-id"] as string;
      const role = req.headers["x-user-role"] as string;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      let results;

      if (role === "CLINICIAN" || role === "doctor") {
        results = await db
          .select({
            id: consultationRequests.id,
            status: consultationRequests.status,
            message: consultationRequests.message,
            createdAt: consultationRequests.createdAt,
            patientName: users.name,
            patientEmail: users.email,
          })
          .from(consultationRequests)
          .innerJoin(users, eq(consultationRequests.patientId, users.id))
          .where(eq(consultationRequests.doctorId, userId))
          .orderBy(desc(consultationRequests.createdAt));
      } else {
        results = await db
          .select({
            id: consultationRequests.id,
            status: consultationRequests.status,
            message: consultationRequests.message,
            createdAt: consultationRequests.createdAt,
            doctorName: doctorProfiles.fullName,
            specialization: doctorProfiles.specialization,
          })
          .from(consultationRequests)
          .innerJoin(doctorProfiles, eq(consultationRequests.doctorId, doctorProfiles.userId))
          .where(eq(consultationRequests.patientId, userId))
          .orderBy(desc(consultationRequests.createdAt));
      }

      res.json(results);
    } catch (err) {
      console.error("[LIST CONSULTATIONS ERROR]:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Update request status (Doctor resolution)
   * PATCH /api/v1/consultations/:id/status
   */
  updateStatus: async (req: Request, res: Response) => {
    try {
      const doctorId = req.headers["x-user-id"] as string;
      const { id } = req.params;
      const { status } = req.body; // accepted, declined

      if (!["accepted", "declined", "completed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const [updated] = await db
        .update(consultationRequests)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(consultationRequests.id, id), eq(consultationRequests.doctorId, doctorId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Request not found or unauthorized" });
      }

      // Get doctor name for notification
      const [doctorProfile] = await db
        .select({ fullName: doctorProfiles.fullName })
        .from(doctorProfiles)
        .where(eq(doctorProfiles.userId, doctorId))
        .limit(1);

      // Notify the patient
      await NotificationService.createNotification({
        userId: updated.patientId,
        title: "Consultation Request Updated",
        message: `Dr. ${doctorProfile?.fullName || "A doctor"} has ${status} your consultation request.`,
        type: status === "accepted" ? "success" : "warning",
        link: `/dashboard/consultations`
      });

      res.json(updated);
    } catch (err) {
      console.error("[UPDATE CONSULTATION ERROR]:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
