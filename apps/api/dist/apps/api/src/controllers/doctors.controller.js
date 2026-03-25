"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorsController = exports.getDoctorStats = exports.moderateDoctor = exports.getDoctorDetail = exports.getQueueStats = exports.getVerificationQueue = exports.updateDoctorProfile = exports.getDoctorProfile = exports.registerDoctor = exports.searchDoctors = exports.getSpecializations = exports.SPECIALIZATIONS = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const mdcn_service_1 = require("../services/mdcn.service");
const doctor_email_service_1 = require("../services/doctor-email.service");
// ─── Constants ────────────────────────────────────────────────────────────────
exports.SPECIALIZATIONS = [
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
const registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).max(120),
    gender: zod_1.z.enum(["male", "female", "other"]).optional(),
    phone: zod_1.z.string().min(10).max(20).optional(),
    mdcnNumber: zod_1.z.string().min(1),
    specialization: zod_1.z.string().min(1),
    subSpecialization: zod_1.z.string().max(100).optional(),
    yearsExperience: zod_1.z.number().int().min(0).max(60).optional(),
    currentHospital: zod_1.z.string().max(200).optional(),
    hospitalState: zod_1.z.string().max(60).optional(),
    hospitalLga: zod_1.z.string().max(60).optional(),
    isIndependent: zod_1.z.boolean().optional(),
    bio: zod_1.z.string().max(1000).optional(),
    languages: zod_1.z.array(zod_1.z.string()).min(1).default(["English"]),
    consultationTypes: zod_1.z.array(zod_1.z.enum(["In-person", "Telemedicine", "Both"])).min(1).default(["In-person"]),
    coverUrl: zod_1.z.string().url().optional(),
});
const adminActionSchema = zod_1.z.object({
    action: zod_1.z.enum(["approve", "reject", "suspend", "reinstate", "under_review", "note"]),
    rejectionReason: zod_1.z.string().max(500).optional(),
    note: zod_1.z.string().max(500).optional(),
});
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDoctorProfile(profile) {
    return {
        ...profile,
        languages: typeof profile['languages'] === 'string' ? JSON.parse(profile['languages'] || '["English"]') : profile['languages'],
        consultationTypes: typeof profile['consultationTypes'] === 'string' ? JSON.parse(profile['consultationTypes'] || '["In-person"]') : profile['consultationTypes'],
    };
}
// ─── Public / Doctor routes ───────────────────────────────────────────────────
/** GET /api/v1/doctors/specializations */
const getSpecializations = (_req, res) => {
    res.json(exports.SPECIALIZATIONS);
};
exports.getSpecializations = getSpecializations;
/**
 * Search doctors with filters
 * GET /api/v1/doctors/search?query=...&specialty=...&state=...
 */
const searchDoctors = async (req, res) => {
    try {
        const { query, specialty, state } = req.query;
        const filters = [(0, drizzle_orm_1.eq)(db_1.doctorProfiles.verificationStatus, "approved")];
        if (specialty && specialty !== "All Specialties") {
            filters.push((0, drizzle_orm_1.eq)(db_1.doctorProfiles.specialization, specialty));
        }
        if (state && state !== "All States") {
            filters.push((0, drizzle_orm_1.eq)(db_1.doctorProfiles.hospitalState, state));
        }
        const results = await db_1.db
            .select({
            id: db_1.doctorProfiles.id,
            userId: db_1.doctorProfiles.userId,
            fullName: db_1.doctorProfiles.fullName,
            specialization: db_1.doctorProfiles.specialization,
            subSpecialization: db_1.doctorProfiles.subSpecialization,
            currentHospital: db_1.doctorProfiles.currentHospital,
            hospitalState: db_1.doctorProfiles.hospitalState,
            yearsExperience: db_1.doctorProfiles.yearsExperience,
            bio: db_1.doctorProfiles.bio,
            avatarUrl: db_1.users.avatarUrl,
        })
            .from(db_1.doctorProfiles)
            .innerJoin(db_1.users, (0, drizzle_orm_1.eq)(db_1.doctorProfiles.userId, db_1.users.id))
            .where((0, drizzle_orm_1.and)(...filters, query
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(db_1.doctorProfiles.fullName, `%${query}%`), (0, drizzle_orm_1.ilike)(db_1.doctorProfiles.currentHospital, `%${query}%`), (0, drizzle_orm_1.ilike)(db_1.doctorProfiles.specialization, `%${query}%`))
            : undefined))
            .limit(50);
        res.json(results);
    }
    catch (err) {
        console.error("[SEARCH DOCTORS ERROR]:", err);
        res.status(500).json({ error: "Failed to search doctors" });
    }
};
exports.searchDoctors = searchDoctors;
/** POST /api/v1/doctors/register */
const registerDoctor = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid data", details: parse.error.format() });
    }
    const data = parse.data;
    // ── 1. MDCN format validation ──────────────────────────────────────────────
    const formatResult = (0, mdcn_service_1.validateMdcnFormat)(data.mdcnNumber);
    if (!formatResult.valid) {
        return res.status(400).json({ error: formatResult.error, field: "mdcnNumber" });
    }
    // ── 2. Duplicate MDCN check ────────────────────────────────────────────────
    const dupResult = await (0, mdcn_service_1.checkMdcnDuplicate)(formatResult.normalized, userId);
    if (dupResult.isDuplicate) {
        return res.status(409).json({ error: dupResult.error, field: "mdcnNumber" });
    }
    // ── 3. Check for existing profile ─────────────────────────────────────────
    const [existing] = await db_1.db
        .select({ id: db_1.doctorProfiles.id, verificationStatus: db_1.doctorProfiles.verificationStatus })
        .from(db_1.doctorProfiles)
        .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.userId, userId))
        .limit(1);
    if (existing) {
        if (existing.verificationStatus === "approved") {
            return res.status(409).json({ error: "Your doctor profile is already verified." });
        }
        // Reapplication after rejection — update existing record
        if (existing.verificationStatus === "rejected") {
            const [updated] = await db_1.db
                .update(db_1.doctorProfiles)
                .set({
                ...data,
                mdcnNumber: formatResult.normalized,
                languages: JSON.stringify(data.languages),
                consultationTypes: JSON.stringify(data.consultationTypes),
                verificationStatus: "pending",
                rejectionReason: null,
                updatedAt: new Date(),
                submittedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.id, existing.id))
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
        const [profile] = await db_1.db
            .insert(db_1.doctorProfiles)
            .values({
            userId,
            fullName: data.fullName,
            gender: data.gender,
            phone: data.phone,
            mdcnNumber: formatResult.normalized,
            mdcnYear: parseInt(formatResult.normalized.split("/")[2], 10),
            specialization: data.specialization,
            subSpecialization: data.subSpecialization,
            yearsExperience: data.yearsExperience,
            currentHospital: data.currentHospital,
            hospitalState: data.hospitalState,
            hospitalLga: data.hospitalLga,
            isIndependent: data.isIndependent ?? false,
            bio: data.bio,
            languages: JSON.stringify(data.languages),
            consultationTypes: JSON.stringify(data.consultationTypes),
            verificationStatus: "pending",
        })
            .returning();
        // Update user role to CLINICIAN in users table
        await db_1.db
            .update(db_1.users)
            .set({ role: "CLINICIAN", updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_1.users.id, userId));
        await logAudit(profile.id, "SYSTEM", "submit", undefined, "pending", "Initial application");
        await notifyOnSubmission(profile, req);
        res.status(201).json({
            message: "Application submitted successfully. You will receive an email confirmation shortly.",
            profile: formatDoctorProfile(profile),
        });
    }
    catch (err) {
        console.error("[REGISTER DOCTOR]:", err);
        res.status(500).json({ error: "Failed to submit application" });
    }
};
exports.registerDoctor = registerDoctor;
/** GET /api/v1/doctors/me */
const getDoctorProfile = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const [profile] = await db_1.db
            .select()
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.userId, userId))
            .limit(1);
        if (!profile) {
            return res.status(404).json({ error: "Doctor profile not found." });
        }
        res.json(formatDoctorProfile(profile));
    }
    catch (err) {
        console.error("[GET DOCTOR PROFILE]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDoctorProfile = getDoctorProfile;
/** PUT /api/v1/doctors/me */
const updateDoctorProfile = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const [profile] = await db_1.db
            .select({ id: db_1.doctorProfiles.id, verificationStatus: db_1.doctorProfiles.verificationStatus })
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.userId, userId))
            .limit(1);
        if (!profile)
            return res.status(404).json({ error: "Doctor profile not found." });
        // Approved doctors can only update bio, contact, and consultation types
        // Pre-approval doctors can update anything
        const isApproved = profile.verificationStatus === "approved";
        const allowedFields = isApproved
            ? ["bio", "phone", "consultationTypes", "currentHospital", "hospitalState", "hospitalLga", "coverUrl"]
            : Object.keys(req.body);
        const updateData = { updatedAt: new Date() };
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === "avatarUrl") {
                    // Update users table for avatarUrl
                    await db_1.db.update(db_1.users).set({ avatarUrl: req.body[field], updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(db_1.users.id, userId));
                    continue;
                }
                updateData[field] = Array.isArray(req.body[field])
                    ? JSON.parse(JSON.stringify(req.body[field])) // Ensure it's not a reference if coming from body
                    : req.body[field];
                if (Array.isArray(req.body[field])) {
                    updateData[field] = JSON.stringify(req.body[field]);
                }
            }
        }
        // Re-validate MDCN if being updated
        if (updateData.mdcnNumber && !isApproved) {
            const fmt = (0, mdcn_service_1.validateMdcnFormat)(updateData.mdcnNumber);
            if (!fmt.valid)
                return res.status(400).json({ error: fmt.error, field: "mdcnNumber" });
            const dup = await (0, mdcn_service_1.checkMdcnDuplicate)(fmt.normalized, userId);
            if (dup.isDuplicate)
                return res.status(409).json({ error: dup.error });
            updateData.mdcnNumber = fmt.normalized;
        }
        const [updated] = await db_1.db
            .update(db_1.doctorProfiles)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.id, profile.id))
            .returning();
        res.json(formatDoctorProfile(updated));
    }
    catch (err) {
        console.error("[UPDATE DOCTOR PROFILE]:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
};
exports.updateDoctorProfile = updateDoctorProfile;
// ─── Admin routes ─────────────────────────────────────────────────────────────
/** GET /api/v1/doctors/admin/queue */
const getVerificationQueue = async (req, res) => {
    const status = req.query.status || "pending";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 20;
    const offset = (page - 1) * perPage;
    const search = req.query.search;
    const validStatuses = ["pending", "under_review", "approved", "rejected", "suspended"];
    const statusFilter = validStatuses.includes(status) ? status : "pending";
    try {
        const conditions = [(0, drizzle_orm_1.eq)(db_1.doctorProfiles.verificationStatus, statusFilter)];
        if (search) {
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(db_1.doctorProfiles.fullName, `%${search}%`), (0, drizzle_orm_1.ilike)(db_1.doctorProfiles.mdcnNumber, `%${search}%`), (0, drizzle_orm_1.ilike)(db_1.doctorProfiles.specialization, `%${search}%`)));
        }
        const [countRow] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.and)(...conditions));
        const doctors = await db_1.db
            .select()
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.doctorProfiles.submittedAt))
            .limit(perPage)
            .offset(offset);
        res.json({
            doctors: doctors.map(formatDoctorProfile),
            pagination: {
                total: Number(countRow.count),
                page,
                perPage,
                pages: Math.ceil(Number(countRow.count) / perPage),
            },
        });
    }
    catch (err) {
        console.error("[VERIFICATION QUEUE]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getVerificationQueue = getVerificationQueue;
/** GET /api/v1/doctors/admin/queue/stats */
const getQueueStats = async (_req, res) => {
    try {
        const [stats] = await db_1.db
            .select({
            pending: (0, drizzle_orm_1.sql) `count(*) filter (where verification_status = 'pending')`,
            under_review: (0, drizzle_orm_1.sql) `count(*) filter (where verification_status = 'under_review')`,
            approved: (0, drizzle_orm_1.sql) `count(*) filter (where verification_status = 'approved')`,
            rejected: (0, drizzle_orm_1.sql) `count(*) filter (where verification_status = 'rejected')`,
            suspended: (0, drizzle_orm_1.sql) `count(*) filter (where verification_status = 'suspended')`,
            total: (0, drizzle_orm_1.sql) `count(*)`,
        })
            .from(db_1.doctorProfiles);
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [recent] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.gt)(db_1.doctorProfiles.submittedAt, cutoff24h));
        res.json({
            pending: Number(stats.pending),
            under_review: Number(stats.under_review),
            approved: Number(stats.approved),
            rejected: Number(stats.rejected),
            suspended: Number(stats.suspended),
            total: Number(stats.total),
            last24h: Number(recent.count),
        });
    }
    catch (err) {
        console.error("[QUEUE STATS]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getQueueStats = getQueueStats;
/** GET /api/v1/doctors/admin/queue/:id */
const getDoctorDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const [profile] = await db_1.db
            .select()
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.id, id))
            .limit(1);
        if (!profile)
            return res.status(404).json({ error: "Doctor profile not found" });
        const auditLog = await db_1.db
            .select()
            .from(db_1.doctorVerificationAudit)
            .where((0, drizzle_orm_1.eq)(db_1.doctorVerificationAudit.doctorId, id))
            .orderBy((0, drizzle_orm_1.desc)(db_1.doctorVerificationAudit.createdAt));
        // Fetch doctor's email from users table
        const [user] = await db_1.db
            .select({ email: db_1.users.email })
            .from(db_1.users)
            .where((0, drizzle_orm_1.eq)(db_1.users.id, profile.userId))
            .limit(1);
        res.json({
            profile: formatDoctorProfile(profile),
            email: user?.email,
            auditLog,
        });
    }
    catch (err) {
        console.error("[GET DOCTOR DETAIL]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDoctorDetail = getDoctorDetail;
/** PATCH /api/v1/doctors/admin/queue/:id */
const moderateDoctor = async (req, res) => {
    const adminId = req.headers["x-user-id"];
    const { id } = req.params;
    const parse = adminActionSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: "Invalid action", details: parse.error.format() });
    }
    const { action, rejectionReason, note } = parse.data;
    try {
        const [profile] = await db_1.db
            .select()
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.id, id))
            .limit(1);
        if (!profile)
            return res.status(404).json({ error: "Doctor not found" });
        // Fetch doctor email for notification
        const [user] = await db_1.db
            .select({ email: db_1.users.email })
            .from(db_1.users)
            .where((0, drizzle_orm_1.eq)(db_1.users.id, profile.userId))
            .limit(1);
        const statusMap = {
            approve: "approved",
            reject: "rejected",
            suspend: "suspended",
            reinstate: "approved",
            under_review: "under_review",
            note: profile.verificationStatus, // no status change for notes
        };
        const newStatus = statusMap[action];
        const enableCopilot = action === "approve" || action === "reinstate";
        const disableCopilot = action === "reject" || action === "suspend";
        const [updated] = await db_1.db
            .update(db_1.doctorProfiles)
            .set({
            verificationStatus: newStatus,
            isCopilotEnabled: enableCopilot ? true : disableCopilot ? false : profile.isCopilotEnabled,
            rejectionReason: action === "reject" ? (rejectionReason || "Application did not meet verification requirements.") : profile.rejectionReason,
            verifiedBy: (action === "approve" || action === "reinstate") ? adminId : profile.verifiedBy,
            verifiedAt: (action === "approve" || action === "reinstate") ? new Date() : profile.verifiedAt,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.id, id))
            .returning();
        // Also update mdcnVerified on users table
        if (action === "approve" || action === "reinstate") {
            await db_1.db.update(db_1.users).set({ mdcnVerified: true }).where((0, drizzle_orm_1.eq)(db_1.users.id, profile.userId));
        }
        else if (action === "reject" || action === "suspend") {
            await db_1.db.update(db_1.users).set({ mdcnVerified: false }).where((0, drizzle_orm_1.eq)(db_1.users.id, profile.userId));
        }
        await logAudit(id, adminId, action, profile.verificationStatus, newStatus, note);
        // Send email notifications
        if (user?.email) {
            if (action === "approve" || action === "reinstate") {
                await (0, doctor_email_service_1.sendApprovalEmail)({ to: user.email, doctorName: profile.fullName, specialization: profile.specialization });
            }
            else if (action === "reject") {
                await (0, doctor_email_service_1.sendRejectionEmail)({ to: user.email, doctorName: profile.fullName, rejectionReason: rejectionReason || "Application requirements not met." });
            }
            else if (action === "under_review") {
                await (0, doctor_email_service_1.sendUnderReviewNotice)({ to: user.email, doctorName: profile.fullName });
            }
        }
        res.json({
            message: `Doctor ${action === "note" ? "note added" : `${action}d`} successfully.`,
            profile: formatDoctorProfile(updated),
        });
    }
    catch (err) {
        console.error("[MODERATE DOCTOR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.moderateDoctor = moderateDoctor;
/** GET /api/v1/doctors/stats */
const getDoctorStats = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        // 1. Total Consultations (All time)
        const [totalRow] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_1.clinicalCases)
            .where((0, drizzle_orm_1.eq)(db_1.clinicalCases.doctorId, userId));
        // 2. Today's Consultations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [todayRow] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_1.clinicalCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.clinicalCases.doctorId, userId), (0, drizzle_orm_1.gte)(db_1.clinicalCases.createdAt, today)));
        // 3. Pending Reviews (Mocked for now or count of specific cases)
        const pendingReviews = 0; // Future improvement: track reviews
        // 4. Active Cases (Consultations in last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [activeRow] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(db_1.clinicalCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.clinicalCases.doctorId, userId), (0, drizzle_orm_1.gte)(db_1.clinicalCases.createdAt, weekAgo)));
        res.json({
            totalConsultations: Number(totalRow.count),
            todayConsultations: Number(todayRow.count),
            pendingReviews,
            activeCases: Number(activeRow.count),
            referralsSent: 0, // Mocked until referrals are implemented
        });
    }
    catch (err) {
        console.error("[GET DOCTOR STATS ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDoctorStats = getDoctorStats;
// ─── Controller Object (for index.ts) ─────────────────────────────────────────
exports.DoctorsController = {
    getSpecializations: exports.getSpecializations,
    registerDoctor: exports.registerDoctor,
    getDoctorProfile: exports.getDoctorProfile,
    updateDoctorProfile: exports.updateDoctorProfile,
    getVerificationQueue: exports.getVerificationQueue,
    getQueueStats: exports.getQueueStats,
    getDoctorDetail: exports.getDoctorDetail,
    moderateDoctor: exports.moderateDoctor,
    getDoctorStats: exports.getDoctorStats,
    searchDoctors: exports.searchDoctors,
};
// ─── Private helpers ──────────────────────────────────────────────────────────
async function logAudit(doctorId, adminId, action, previousStatus, newStatus, note) {
    await db_1.db.insert(db_1.doctorVerificationAudit).values({
        doctorId,
        adminId,
        action,
        previousStatus: previousStatus || null,
        newStatus: newStatus || null,
        note: note || null,
    }).catch(console.error);
}
async function notifyOnSubmission(profile, req) {
    const userId = req.headers["x-user-id"];
    const [user] = await db_1.db
        .select({ email: db_1.users.email })
        .from(db_1.users)
        .where((0, drizzle_orm_1.eq)(db_1.users.id, userId))
        .limit(1)
        .catch(() => []);
    if (user?.email) {
        await (0, doctor_email_service_1.sendSubmissionConfirmation)({
            to: user.email,
            doctorName: profile.fullName,
            mdcnNumber: profile.mdcnNumber,
            specialization: profile.specialization,
        });
    }
    // Alert admin team
    await (0, doctor_email_service_1.sendAdminNewApplicationAlert)({
        doctorName: profile.fullName,
        mdcnNumber: profile.mdcnNumber,
        specialization: profile.specialization,
        doctorId: profile.id,
    });
}
