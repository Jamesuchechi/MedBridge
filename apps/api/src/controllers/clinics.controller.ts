import { Request, Response } from "express";
import { db, clinics, users, clinicVerificationAudit, clinicInvitations } from "@medbridge/db";
import { eq, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class ClinicsController {
  /** Register a new clinic. Called by CLINIC_ADMIN at signup/onboarding. */
  static async registerClinic(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;
    const { name, email, phone, address, state, lga, cacNumber } = req.body;

    if (!name || !email || !state || !cacNumber) {
      return res.status(400).json({ error: "Missing required fields (name, email, state, cacNumber)." });
    }

    try {
      // 1. Create clinic
      const [newClinic] = await db
        .insert(clinics)
        .values({
          name,
          email,
          phone,
          address,
          state,
          lga,
          cacNumber,
          verificationStatus: "pending",
        })
        .returning();

      // 2. Link user to clinic and set as CLINIC_ADMIN (if not already set)
      await db
        .update(users)
        .set({
          clinicId: newClinic.id,
          role: "CLINIC_ADMIN",
        })
        .where(eq(users.id, userId));

      // 3. Log the submission
      await db.insert(clinicVerificationAudit).values({
        clinicId: newClinic.id,
        adminId:  userId, // Admin who submitted it (the user themselves)
        action:   "submit",
        newStatus: "pending",
        note:     "Initial registration submitted.",
      });

      return res.status(201).json(newClinic);
    } catch (err) {
      console.error("[registerClinic]:", err);
      return res.status(500).json({ error: "Failed to register clinic." });
    }
  }

  /** Get clinic detail for the current user. */
  static async getMyClinic(req: Request, res: Response) {
    const { clinicId } = req;

    if (!clinicId) {
      return res.status(403).json({ error: "Not associated with a clinic." });
    }

    try {
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
      
      if (!clinic) {
        return res.status(404).json({ error: "Clinic record not found." });
      }

      return res.status(200).json(clinic);
    } catch (err) {
      console.error("[getMyClinic]:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  /** (ADMIN) List clinics in verification queue. */
  static async getQueue(req: Request, res: Response) {
    const status = (req.query.status as string) || "pending";
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
      const data = await db
        .select()
        .from(clinics)
        .where(eq(clinics.verificationStatus, status))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(clinics.createdAt));

      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(clinics)
        .where(eq(clinics.verificationStatus, status));

      return res.status(200).json({
        clinics: data,
        pagination: {
          total: Number(count),
          page,
          pages: Math.ceil(Number(count) / limit),
        },
      });
    } catch (err) {
      console.error("[getQueue]:", err);
      return res.status(500).json({ error: "Failed to fetch queue." });
    }
  }

  /** (ADMIN) Update clinic verification status. */
  static async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { action, note } = req.body;
    const adminId = req.headers["x-user-id"] as string;

    const statusMap: Record<string, string> = {
      approve: "approved",
      reject:  "rejected",
    };

    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ error: "Invalid action." });

    try {
      const [oldClinic] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
      if (!oldClinic) return res.status(404).json({ error: "Clinic not found." });

      await db.transaction(async (tx) => {
        await tx
          .update(clinics)
          .set({ 
            verificationStatus: newStatus,
            verifiedBy: adminId,
            verifiedAt: new Date(),
          })
          .where(eq(clinics.id, id));

        await tx.insert(clinicVerificationAudit).values({
          clinicId: id,
          adminId,
          action,
          previousStatus: oldClinic.verificationStatus,
          newStatus,
          note,
        });
      });

      return res.status(200).json({ status: "updated", newStatus });
    } catch (err) {
      console.error("[updateStatus]:", err);
      return res.status(500).json({ error: "Failed to update status." });
    }
  }

  /** Invite staff to clinic. */
  static async inviteStaff(req: Request, res: Response) {
    const { clinicId } = req;
    const { email, role } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Forbidden: No clinic associated." });
    if (!email || !role) return res.status(400).json({ error: "Email and role required." });

    try {
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const [invitation] = await db.insert(clinicInvitations).values({
        clinicId,
        email,
        role: role.toUpperCase(),
        token,
        expiresAt,
      }).returning();

      // In production, an email service would be triggered here
      console.log(`[INVITE]: Sent to ${email} with token ${token} for clinic ${clinicId}`);

      return res.status(201).json(invitation);
    } catch (err) {
      console.error("[inviteStaff]:", err);
      return res.status(500).json({ error: "Failed to create staff invitation." });
    }
  }

  /** Get all staff (CLINICIAN, CLINIC_STAFF, CLINIC_ADMIN) for the clinic. */
  static async getClinicStaff(req: Request, res: Response) {
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Forbidden: No clinic associated." });

    try {
      const staff = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.clinicId, clinicId))
        .orderBy(users.name);

      return res.status(200).json(staff);
    } catch (err) {
      console.error("[getClinicStaff]:", err);
      return res.status(500).json({ error: "Failed to fetch staff." });
    }
  }
}
