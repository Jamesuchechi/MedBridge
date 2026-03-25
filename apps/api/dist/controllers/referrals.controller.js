"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralsController = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const notification_service_1 = require("../services/notification.service");
exports.ReferralsController = {
    createReferral: async (req, res) => {
        const sendingDoctorId = req.headers["x-user-id"];
        if (!sendingDoctorId)
            return res.status(401).json({ error: "Unauthorized" });
        const { patientId, patientName, patientAge, patientSex, receivingDoctorId, receivingFacility, specialty, priority, urgencyScore, notes, clinicalSummary } = req.body;
        if (!patientName || !specialty || !clinicalSummary) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        try {
            const [newReferral] = await db_1.db.insert(db_1.referrals).values({
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
                await notification_service_1.NotificationService.createNotification({
                    userId: receivingDoctorId,
                    title: "New Referral Received",
                    message: `You have received a new ${priority} referral for ${patientName} (${specialty}).`,
                    type: priority === "Stat" || priority === "Urgent" ? "warning" : "info",
                    link: `/dashboard/referrals/${newReferral.id}`
                });
            }
            // If the patient is registered, notify them
            if (patientId) {
                await notification_service_1.NotificationService.createNotification({
                    userId: patientId,
                    title: "New Specialist Referral",
                    message: `Your doctor has initiated a referral for you to a ${specialty} specialist.`,
                    type: "success",
                    link: `/dashboard/referrals` // Or a patient-specific referral view if it exists
                });
            }
            res.status(201).json(newReferral);
        }
        catch (err) {
            console.error("[CREATE REFERRAL ERROR]:", err);
            res.status(500).json({ error: "Failed to create referral" });
        }
    },
    listSentReferrals: async (req, res) => {
        const userId = req.headers["x-user-id"];
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        try {
            const list = await db_1.db
                .select()
                .from(db_1.referrals)
                .where((0, drizzle_orm_1.eq)(db_1.referrals.sendingDoctorId, userId))
                .orderBy((0, drizzle_orm_1.desc)(db_1.referrals.createdAt));
            res.status(200).json(list);
        }
        catch (err) {
            console.error("[LIST SENT REFERRALS ERROR]:", err);
            res.status(500).json({ error: "Failed to fetch sent referrals" });
        }
    },
    listReceivedReferrals: async (req, res) => {
        const userId = req.headers["x-user-id"];
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        try {
            const list = await db_1.db
                .select()
                .from(db_1.referrals)
                .where((0, drizzle_orm_1.eq)(db_1.referrals.receivingDoctorId, userId))
                .orderBy((0, drizzle_orm_1.desc)(db_1.referrals.createdAt));
            res.status(200).json(list);
        }
        catch (err) {
            console.error("[LIST RECEIVED REFERRALS ERROR]:", err);
            res.status(500).json({ error: "Failed to fetch received referrals" });
        }
    },
    getReferralDetail: async (req, res) => {
        const userId = req.headers["x-user-id"];
        const { id } = req.params;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        try {
            const [referral] = await db_1.db
                .select()
                .from(db_1.referrals)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.referrals.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(db_1.referrals.sendingDoctorId, userId), (0, drizzle_orm_1.eq)(db_1.referrals.receivingDoctorId, userId))))
                .limit(1);
            if (!referral) {
                return res.status(404).json({ error: "Referral not found" });
            }
            // Include doctor info
            const [sendingDoctor] = await db_1.db
                .select({ name: db_1.users.name })
                .from(db_1.users)
                .where((0, drizzle_orm_1.eq)(db_1.users.id, referral.sendingDoctorId))
                .limit(1);
            res.status(200).json({ ...referral, sendingDoctorName: sendingDoctor?.name || "Unknown Doctor" });
        }
        catch (err) {
            console.error("[GET REFERRAL DETAIL ERROR]:", err);
            res.status(500).json({ error: "Failed to fetch referral detail" });
        }
    },
    updateReferralStatus: async (req, res) => {
        const userId = req.headers["x-user-id"];
        const { id } = req.params;
        const { status } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!["accepted", "rejected", "completed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        try {
            const [updated] = await db_1.db
                .update(db_1.referrals)
                .set({ status, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.referrals.id, id), (0, drizzle_orm_1.eq)(db_1.referrals.receivingDoctorId, userId)))
                .returning();
            if (!updated) {
                return res.status(404).json({ error: "Referral not found or unauthorized" });
            }
            // Notify sending doctor
            await notification_service_1.NotificationService.createNotification({
                userId: updated.sendingDoctorId,
                title: `Referral ${status.toUpperCase()}`,
                message: `Your referral for ${updated.patientName} has been ${status} by the receiving specialist.`,
                type: status === "rejected" ? "error" : "success",
                link: `/dashboard/referrals`
            });
            res.status(200).json(updated);
        }
        catch (err) {
            console.error("[UPDATE REFERRAL STATUS ERROR]:", err);
            res.status(500).json({ error: "Failed to update referral status" });
        }
    },
    searchSpecialists: async (req, res) => {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: "Query is required" });
        }
        try {
            const results = await db_1.db
                .select({
                id: db_1.users.id,
                name: db_1.doctorProfiles.fullName,
                specialization: db_1.doctorProfiles.specialization,
                hospital: db_1.doctorProfiles.currentHospital,
                hospitalState: db_1.doctorProfiles.hospitalState,
            })
                .from(db_1.doctorProfiles)
                .innerJoin(db_1.users, (0, drizzle_orm_1.eq)(db_1.doctorProfiles.userId, db_1.users.id))
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(db_1.doctorProfiles.fullName, `%${query}%`), (0, drizzle_orm_1.ilike)(db_1.doctorProfiles.specialization, `%${query}%`), (0, drizzle_orm_1.ilike)(db_1.doctorProfiles.currentHospital, `%${query}%`)))
                .limit(20);
            res.status(200).json(results);
        }
        catch (err) {
            console.error("[SEARCH SPECIALISTS ERROR]:", err);
            res.status(500).json({ error: "Failed to search specialists" });
        }
    }
};
