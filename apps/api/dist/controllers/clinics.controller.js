"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicsController = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
class ClinicsController {
    /** Register a new clinic. Called by CLINIC_ADMIN at signup/onboarding. */
    static async registerClinic(req, res) {
        const userId = req.headers["x-user-id"];
        const { name, email, phone, address, state, lga, cacNumber } = req.body;
        if (!name || !email || !state || !cacNumber) {
            return res.status(400).json({ error: "Missing required fields (name, email, state, cacNumber)." });
        }
        try {
            // 1. Create clinic
            const [newClinic] = await db_1.db
                .insert(db_1.clinics)
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
            await db_1.db
                .update(db_1.users)
                .set({
                clinicId: newClinic.id,
                role: "CLINIC_ADMIN",
            })
                .where((0, drizzle_orm_1.eq)(db_1.users.id, userId));
            // 3. Log the submission
            await db_1.db.insert(db_1.clinicVerificationAudit).values({
                clinicId: newClinic.id,
                adminId: userId, // Admin who submitted it (the user themselves)
                action: "submit",
                newStatus: "pending",
                note: "Initial registration submitted.",
            });
            return res.status(201).json(newClinic);
        }
        catch (err) {
            console.error("[registerClinic]:", err);
            return res.status(500).json({ error: "Failed to register clinic." });
        }
    }
    /** Get clinic detail for the current user. */
    static async getMyClinic(req, res) {
        const { clinicId } = req;
        if (!clinicId) {
            return res.status(403).json({ error: "Not associated with a clinic." });
        }
        try {
            const [clinic] = await db_1.db.select().from(db_1.clinics).where((0, drizzle_orm_1.eq)(db_1.clinics.id, clinicId)).limit(1);
            if (!clinic) {
                return res.status(404).json({ error: "Clinic record not found." });
            }
            return res.status(200).json(clinic);
        }
        catch (err) {
            console.error("[getMyClinic]:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    /** (ADMIN) List clinics in verification queue. */
    static async getQueue(req, res) {
        const status = req.query.status || "pending";
        const page = parseInt(req.query.page || "1", 10);
        const limit = 20;
        const offset = (page - 1) * limit;
        try {
            const data = await db_1.db
                .select()
                .from(db_1.clinics)
                .where((0, drizzle_orm_1.eq)(db_1.clinics.verificationStatus, status))
                .limit(limit)
                .offset(offset)
                .orderBy((0, drizzle_orm_1.desc)(db_1.clinics.createdAt));
            const [{ count }] = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(db_1.clinics)
                .where((0, drizzle_orm_1.eq)(db_1.clinics.verificationStatus, status));
            return res.status(200).json({
                clinics: data,
                pagination: {
                    total: Number(count),
                    page,
                    pages: Math.ceil(Number(count) / limit),
                },
            });
        }
        catch (err) {
            console.error("[getQueue]:", err);
            return res.status(500).json({ error: "Failed to fetch queue." });
        }
    }
    /** (ADMIN) Update clinic verification status. */
    static async updateStatus(req, res) {
        const { id } = req.params;
        const { action, note } = req.body;
        const adminId = req.headers["x-user-id"];
        const statusMap = {
            approve: "approved",
            reject: "rejected",
        };
        const newStatus = statusMap[action];
        if (!newStatus)
            return res.status(400).json({ error: "Invalid action." });
        try {
            const [oldClinic] = await db_1.db.select().from(db_1.clinics).where((0, drizzle_orm_1.eq)(db_1.clinics.id, id)).limit(1);
            if (!oldClinic)
                return res.status(404).json({ error: "Clinic not found." });
            await db_1.db.transaction(async (tx) => {
                await tx
                    .update(db_1.clinics)
                    .set({
                    verificationStatus: newStatus,
                    verifiedBy: adminId,
                    verifiedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(db_1.clinics.id, id));
                await tx.insert(db_1.clinicVerificationAudit).values({
                    clinicId: id,
                    adminId,
                    action,
                    previousStatus: oldClinic.verificationStatus,
                    newStatus,
                    note,
                });
            });
            return res.status(200).json({ status: "updated", newStatus });
        }
        catch (err) {
            console.error("[updateStatus]:", err);
            return res.status(500).json({ error: "Failed to update status." });
        }
    }
    /** Invite staff to clinic. */
    static async inviteStaff(req, res) {
        const { clinicId } = req;
        const { email, role } = req.body;
        if (!clinicId)
            return res.status(403).json({ error: "Forbidden: No clinic associated." });
        if (!email || !role)
            return res.status(400).json({ error: "Email and role required." });
        try {
            const token = (0, uuid_1.v4)();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
            const [invitation] = await db_1.db.insert(db_1.clinicInvitations).values({
                clinicId,
                email,
                role: role.toUpperCase(),
                token,
                expiresAt,
            }).returning();
            // In production, an email service would be triggered here
            console.log(`[INVITE]: Sent to ${email} with token ${token} for clinic ${clinicId}`);
            return res.status(201).json(invitation);
        }
        catch (err) {
            console.error("[inviteStaff]:", err);
            return res.status(500).json({ error: "Failed to create staff invitation." });
        }
    }
}
exports.ClinicsController = ClinicsController;
