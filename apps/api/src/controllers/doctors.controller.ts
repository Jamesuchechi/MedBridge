import { Request, Response } from "express";
import { db, users, doctorProfiles, doctorVerificationAudit } from "@medbridge/db";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { validateMdcnFormat, checkMdcnDuplicate } from "../services/mdcn.service";
import {
  sendSubmissionConfirmation,
  sendUnderReviewNotice,
  sendApprovalEmail,
  sendRejectionEmail,
  sendAdminNewApplicationAlert,
} from "../services/doctor-email.service";

// ─── Constants ────────────────────────────────────────────────────────────────
export const SPECIALIZATIONS = [
  "General Practice / Family Medicine",
  "Internal Medicine",
  "Paediatrics",
  "Obstetrics & Gynaecology",
  "Surgery (General)",
  "Orthopaedic Surgery",
  "Cardiology",
  "Neurology",
  "Psychiatry / Mental Health",
  "Ophthalmology",
  "ENT (Ear, Nose & Throat)",
  "Dermatology",
  "Radiology",
  "Anaesthesia",
  "Emergency Medicine",
  "Infectious Disease",
  "Endocrinology & Diabetes",
  "Nephrology",
  "Oncology",
  "Haematology",
  "Gastroenterology",
  "Pulmonology / Chest Medicine",
  "Urology",
  "Dental / Oral Medicine",
  "Community & Public Health",
  "Pathology",
  "Physiotherapy",
  "Pharmacy (Clinical)",
  "Nursing (Advanced Practice)",
  "Other",
];

// ─── Validation schemas ───────────────────────────────────────────────────────
const registerSchema = z.object({
  fullName:          z.string().min(2).max(120),
  gender:            z.enum(["male", "female", "other"]).optional(),
  phone:             z.string().min(10).max(20).optional(),
  mdcnNumber:        z.string().min(1),
  specialization:    z.string().min(1),
  subSpecialization: z.string().max(100).optional(),
  yearsExperience:   z.number().int().min(0).max(60).optional(),
  currentHospital:   z.string().max(200).optional(),
  hospitalState:     z.string().max(60).optional(),
  hospitalLga:       z.string().max(60).optional(),
  isIndependent:     z.boolean().optional(),
  bio:               z.string().max(1000).optional(),
  languages:         z.array(z.string()).min(1).default(["English"]),
  consultationTypes: z.array(z.enum(["In-person", "Telemedicine", "Both"])).min(1).default(["In-person"]),
});

const adminActionSchema = z.object({
  action:          z.enum(["approve", "reject", "suspend", "reinstate", "under_review", "note"]),
  rejectionReason: z.string().max(500).optional(),
  note:            z.string().max(500).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDoctorProfile(profile: any) {
  return {
    ...profile,
    languages:         typeof profile.languages === 'string' ? JSON.parse(profile.languages || '["English"]') : profile.languages,
    consultationTypes: typeof profile.consultationTypes === 'string' ? JSON.parse(profile.consultationTypes || '["In-person"]') : profile.consultationTypes,
  };
}

// ─── Public / Doctor routes ───────────────────────────────────────────────────

/** GET /api/v1/doctors/specializations */
export const getSpecializations = (_req: Request, res: Response) => {
  res.json(SPECIALIZATIONS);
};

/** POST /api/v1/doctors/register */
export const registerDoctor = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid data", details: parse.error.format() });
  }

  const data = parse.data;

  // ── 1. MDCN format validation ──────────────────────────────────────────────
  const formatResult = validateMdcnFormat(data.mdcnNumber);
  if (!formatResult.valid) {
    return res.status(400).json({ error: formatResult.error, field: "mdcnNumber" });
  }

  // ── 2. Duplicate MDCN check ────────────────────────────────────────────────
  const dupResult = await checkMdcnDuplicate(formatResult.normalized!, userId);
  if (dupResult.isDuplicate) {
    return res.status(409).json({ error: dupResult.error, field: "mdcnNumber" });
  }

  // ── 3. Check for existing profile ─────────────────────────────────────────
  const [existing] = await db
    .select({ id: doctorProfiles.id, verificationStatus: doctorProfiles.verificationStatus })
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId))
    .limit(1);

  if (existing) {
    if (existing.verificationStatus === "approved") {
      return res.status(409).json({ error: "Your doctor profile is already verified." });
    }
    // Reapplication after rejection — update existing record
    if (existing.verificationStatus === "rejected") {
      const [updated] = await db
        .update(doctorProfiles)
        .set({
          ...data,
          mdcnNumber:        formatResult.normalized!,
          languages:         JSON.stringify(data.languages),
          consultationTypes: JSON.stringify(data.consultationTypes),
          verificationStatus: "pending",
          rejectionReason:   null,
          updatedAt:         new Date(),
          submittedAt:       new Date(),
        })
        .where(eq(doctorProfiles.id, existing.id))
        .returning();

      await logAudit(existing.id, "SYSTEM", "submit", "rejected", "pending", "Reapplication submitted");
      await notifyOnSubmission(updated, req);
      return res.status(200).json({
        message: "Reapplication submitted successfully.",
        profile: formatDoctorProfile(updated),
      });
    }

    return res.status(409).json({
      error: "You already have a pending or active application.",
      verificationStatus: existing.verificationStatus,
    });
  }

  // ── 4. Create new profile ──────────────────────────────────────────────────
  try {
    const [profile] = await db
      .insert(doctorProfiles)
      .values({
        userId,
        fullName:          data.fullName,
        gender:            data.gender,
        phone:             data.phone,
        mdcnNumber:        formatResult.normalized!,
        mdcnYear:          parseInt(formatResult.normalized!.split("/")[2], 10),
        specialization:    data.specialization,
        subSpecialization: data.subSpecialization,
        yearsExperience:   data.yearsExperience,
        currentHospital:   data.currentHospital,
        hospitalState:     data.hospitalState,
        hospitalLga:       data.hospitalLga,
        isIndependent:     data.isIndependent ?? false,
        bio:               data.bio,
        languages:         JSON.stringify(data.languages),
        consultationTypes: JSON.stringify(data.consultationTypes),
        verificationStatus: "pending",
      })
      .returning();

    // Update user role to CLINICIAN in users table
    await db
      .update(users)
      .set({ role: "CLINICIAN", updatedAt: new Date() })
      .where(eq(users.id, userId));

    await logAudit(profile.id, "SYSTEM", "submit", undefined, "pending", "Initial application");
    await notifyOnSubmission(profile, req);

    res.status(201).json({
      message: "Application submitted successfully. You will receive an email confirmation shortly.",
      profile: formatDoctorProfile(profile),
    });
  } catch (err) {
    console.error("[REGISTER DOCTOR]:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
};

/** GET /api/v1/doctors/me */
export const getDoctorProfile = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [profile] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ error: "Doctor profile not found." });
    }

    res.json(formatDoctorProfile(profile));
  } catch (err) {
    console.error("[GET DOCTOR PROFILE]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** PUT /api/v1/doctors/me */
export const updateDoctorProfile = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [profile] = await db
      .select({ id: doctorProfiles.id, verificationStatus: doctorProfiles.verificationStatus })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (!profile) return res.status(404).json({ error: "Doctor profile not found." });

    // Approved doctors can only update bio, contact, and consultation types
    // Pre-approval doctors can update anything
    const isApproved = profile.verificationStatus === "approved";
    const allowedFields = isApproved
      ? ["bio", "phone", "consultationTypes", "currentHospital", "hospitalState", "hospitalLga"]
      : Object.keys(req.body);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = Array.isArray(req.body[field])
          ? JSON.stringify(req.body[field])
          : req.body[field];
      }
    }

    // Re-validate MDCN if being updated
    if (updateData.mdcnNumber && !isApproved) {
      const fmt = validateMdcnFormat(updateData.mdcnNumber as string);
      if (!fmt.valid) return res.status(400).json({ error: fmt.error, field: "mdcnNumber" });
      const dup = await checkMdcnDuplicate(fmt.normalized!, userId);
      if (dup.isDuplicate) return res.status(409).json({ error: dup.error });
      updateData.mdcnNumber = fmt.normalized;
    }

    const [updated] = await db
      .update(doctorProfiles)
      .set(updateData)
      .where(eq(doctorProfiles.id, profile.id))
      .returning();

    res.json(formatDoctorProfile(updated));
  } catch (err) {
    console.error("[UPDATE DOCTOR PROFILE]:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// ─── Admin routes ─────────────────────────────────────────────────────────────

/** GET /api/v1/doctors/admin/queue */
export const getVerificationQueue = async (req: Request, res: Response) => {
  const status   = (req.query.status as string) || "pending";
  const page     = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage  = 20;
  const offset   = (page - 1) * perPage;
  const search   = req.query.search as string | undefined;

  const validStatuses = ["pending", "under_review", "approved", "rejected", "suspended"];
  const statusFilter  = validStatuses.includes(status) ? status : "pending";

  try {
    const conditions = [eq(doctorProfiles.verificationStatus, statusFilter)];
    if (search) {
      conditions.push(
        or(
          ilike(doctorProfiles.fullName, `%${search}%`),
          ilike(doctorProfiles.mdcnNumber, `%${search}%`),
          ilike(doctorProfiles.specialization, `%${search}%`)
        )!
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctorProfiles)
      .where(and(...conditions));

    const doctors = await db
      .select()
      .from(doctorProfiles)
      .where(and(...conditions))
      .orderBy(desc(doctorProfiles.submittedAt))
      .limit(perPage)
      .offset(offset);

    res.json({
      doctors: doctors.map(formatDoctorProfile),
      pagination: {
        total:   Number(countRow.count),
        page,
        perPage,
        pages:   Math.ceil(Number(countRow.count) / perPage),
      },
    });
  } catch (err) {
    console.error("[VERIFICATION QUEUE]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/v1/doctors/admin/queue/stats */
export const getQueueStats = async (_req: Request, res: Response) => {
  try {
    const [stats] = await db
      .select({
        pending:      sql<number>`count(*) filter (where verification_status = 'pending')`,
        under_review: sql<number>`count(*) filter (where verification_status = 'under_review')`,
        approved:     sql<number>`count(*) filter (where verification_status = 'approved')`,
        rejected:     sql<number>`count(*) filter (where verification_status = 'rejected')`,
        suspended:    sql<number>`count(*) filter (where verification_status = 'suspended')`,
        total:        sql<number>`count(*)`,
      })
      .from(doctorProfiles);

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recent] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctorProfiles)
      .where(sql`submitted_at > ${cutoff24h}`);

    res.json({
      pending:      Number(stats.pending),
      under_review: Number(stats.under_review),
      approved:     Number(stats.approved),
      rejected:     Number(stats.rejected),
      suspended:    Number(stats.suspended),
      total:        Number(stats.total),
      last24h:      Number(recent.count),
    });
  } catch (err) {
    console.error("[QUEUE STATS]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** GET /api/v1/doctors/admin/queue/:id */
export const getDoctorDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [profile] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, id))
      .limit(1);

    if (!profile) return res.status(404).json({ error: "Doctor profile not found" });

    const auditLog = await db
      .select()
      .from(doctorVerificationAudit)
      .where(eq(doctorVerificationAudit.doctorId, id))
      .orderBy(desc(doctorVerificationAudit.createdAt));

    // Fetch doctor's email from users table
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, profile.userId))
      .limit(1);

    res.json({
      profile:  formatDoctorProfile(profile),
      email:    user?.email,
      auditLog,
    });
  } catch (err) {
    console.error("[GET DOCTOR DETAIL]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** PATCH /api/v1/doctors/admin/queue/:id */
export const moderateDoctor = async (req: Request, res: Response) => {
  const adminId = req.headers["x-user-id"] as string;
  const { id }  = req.params;

  const parse = adminActionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid action", details: parse.error.format() });
  }

  const { action, rejectionReason, note } = parse.data;

  try {
    const [profile] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, id))
      .limit(1);

    if (!profile) return res.status(404).json({ error: "Doctor not found" });

    // Fetch doctor email for notification
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, profile.userId))
      .limit(1);

    const statusMap: Record<string, string> = {
      approve:      "approved",
      reject:       "rejected",
      suspend:      "suspended",
      reinstate:    "approved",
      under_review: "under_review",
      note:         profile.verificationStatus, // no status change for notes
    };

    const newStatus      = statusMap[action];
    const enableCopilot  = action === "approve" || action === "reinstate";
    const disableCopilot = action === "reject" || action === "suspend";

    const [updated] = await db
      .update(doctorProfiles)
      .set({
        verificationStatus: newStatus,
        isCopilotEnabled:   enableCopilot ? true : disableCopilot ? false : profile.isCopilotEnabled,
        rejectionReason:    action === "reject" ? (rejectionReason || "Application did not meet verification requirements.") : profile.rejectionReason,
        verifiedBy:         (action === "approve" || action === "reinstate") ? adminId : profile.verifiedBy,
        verifiedAt:         (action === "approve" || action === "reinstate") ? new Date() : profile.verifiedAt,
        updatedAt:          new Date(),
      })
      .where(eq(doctorProfiles.id, id))
      .returning();

    // Also update mdcnVerified on users table
    if (action === "approve" || action === "reinstate") {
      await db.update(users).set({ mdcnVerified: true }).where(eq(users.id, profile.userId));
    } else if (action === "reject" || action === "suspend") {
      await db.update(users).set({ mdcnVerified: false }).where(eq(users.id, profile.userId));
    }

    await logAudit(id, adminId, action, profile.verificationStatus, newStatus, note);

    // Send email notifications
    if (user?.email) {
      if (action === "approve" || action === "reinstate") {
        await sendApprovalEmail({ to: user.email, doctorName: profile.fullName, specialization: profile.specialization });
      } else if (action === "reject") {
        await sendRejectionEmail({ to: user.email, doctorName: profile.fullName, rejectionReason: rejectionReason || "Application requirements not met." });
      } else if (action === "under_review") {
        await sendUnderReviewNotice({ to: user.email, doctorName: profile.fullName });
      }
    }

    res.json({
      message: `Doctor ${action === "note" ? "note added" : `${action}d`} successfully.`,
      profile: formatDoctorProfile(updated),
    });
  } catch (err) {
    console.error("[MODERATE DOCTOR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── Private helpers ──────────────────────────────────────────────────────────
async function logAudit(
  doctorId: string,
  adminId:  string,
  action:   string,
  previousStatus?: string,
  newStatus?:      string,
  note?:           string
) {
  await db.insert(doctorVerificationAudit).values({
    doctorId,
    adminId,
    action,
    previousStatus: previousStatus || null,
    newStatus:      newStatus || null,
    note:           note || null,
  }).catch(console.error);
}

async function notifyOnSubmission(
  profile: any,
  req: Request
) {
  const userId = req.headers["x-user-id"] as string;
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .catch(() => [null] as any[]);

  if (user?.email) {
    await sendSubmissionConfirmation({
      to:             user.email,
      doctorName:     profile.fullName,
      mdcnNumber:     profile.mdcnNumber,
      specialization: profile.specialization,
    });
  }

  // Alert admin team
  await sendAdminNewApplicationAlert({
    doctorName:     profile.fullName,
    mdcnNumber:     profile.mdcnNumber,
    specialization: profile.specialization,
    doctorId:       profile.id,
  });
}
