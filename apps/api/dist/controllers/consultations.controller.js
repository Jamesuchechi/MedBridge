"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationsController = void 0;
const db_1 = require("@medbridge/db");
const schema_1 = require("@medbridge/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const notification_service_1 = require("../services/notification.service");
exports.ConsultationsController = {
    /**
     * Create consultation request
     * POST /api/v1/consultations
     */
    createRequest: async (req, res) => {
        try {
            const patientId = req.headers["x-user-id"];
            const { doctorId, message } = req.body;
            if (!patientId || !doctorId) {
                return res.status(400).json({ error: "Patient ID and Doctor ID are required" });
            }
            // Check for existing pending request
            const existing = await db_1.db
                .select()
                .from(schema_1.consultationRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.consultationRequests.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.consultationRequests.doctorId, doctorId), (0, drizzle_orm_1.eq)(schema_1.consultationRequests.status, "pending")))
                .limit(1);
            if (existing.length > 0) {
                return res.status(400).json({ error: "You already have a pending request for this doctor" });
            }
            const [newRequest] = await db_1.db
                .insert(schema_1.consultationRequests)
                .values({
                patientId,
                doctorId,
                message,
                status: "pending"
            })
                .returning();
            // Get patient name for notification
            const [patientUser] = await db_1.db
                .select({ name: schema_1.users.name })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, patientId))
                .limit(1);
            // Notify the doctor
            await notification_service_1.NotificationService.createNotification({
                userId: doctorId,
                title: "New Consultation Request",
                message: `${patientUser?.name || "A patient"} has requested a consultation with you.`,
                type: "info",
                link: `/dashboard/consultations`
            });
            res.status(201).json(newRequest);
        }
        catch (err) {
            console.error("[CREATE CONSULTATION ERROR]:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    /**
     * List requests for the logged in user
     * GET /api/v1/consultations
     */
    listRequests: async (req, res) => {
        try {
            const userId = req.headers["x-user-id"];
            const role = req.headers["x-user-role"];
            if (!userId) {
                return res.status(400).json({ error: "User ID is required" });
            }
            let results;
            if (role === "CLINICIAN" || role === "doctor") {
                results = await db_1.db
                    .select({
                    id: schema_1.consultationRequests.id,
                    status: schema_1.consultationRequests.status,
                    message: schema_1.consultationRequests.message,
                    createdAt: schema_1.consultationRequests.createdAt,
                    patientName: schema_1.users.name,
                    patientEmail: schema_1.users.email,
                })
                    .from(schema_1.consultationRequests)
                    .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.consultationRequests.patientId, schema_1.users.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.consultationRequests.doctorId, userId))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.consultationRequests.createdAt));
            }
            else {
                results = await db_1.db
                    .select({
                    id: schema_1.consultationRequests.id,
                    status: schema_1.consultationRequests.status,
                    message: schema_1.consultationRequests.message,
                    createdAt: schema_1.consultationRequests.createdAt,
                    doctorName: schema_1.doctorProfiles.fullName,
                    specialization: schema_1.doctorProfiles.specialization,
                })
                    .from(schema_1.consultationRequests)
                    .innerJoin(schema_1.doctorProfiles, (0, drizzle_orm_1.eq)(schema_1.consultationRequests.doctorId, schema_1.doctorProfiles.userId))
                    .where((0, drizzle_orm_1.eq)(schema_1.consultationRequests.patientId, userId))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.consultationRequests.createdAt));
            }
            res.json(results);
        }
        catch (err) {
            console.error("[LIST CONSULTATIONS ERROR]:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    /**
     * Update request status (Doctor resolution)
     * PATCH /api/v1/consultations/:id/status
     */
    updateStatus: async (req, res) => {
        try {
            const doctorId = req.headers["x-user-id"];
            const { id } = req.params;
            const { status } = req.body; // accepted, declined
            if (!["accepted", "declined", "completed"].includes(status)) {
                return res.status(400).json({ error: "Invalid status" });
            }
            const [updated] = await db_1.db
                .update(schema_1.consultationRequests)
                .set({ status, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.consultationRequests.id, id), (0, drizzle_orm_1.eq)(schema_1.consultationRequests.doctorId, doctorId)))
                .returning();
            if (!updated) {
                return res.status(404).json({ error: "Request not found or unauthorized" });
            }
            // Get doctor name for notification
            const [doctorProfile] = await db_1.db
                .select({ fullName: schema_1.doctorProfiles.fullName })
                .from(schema_1.doctorProfiles)
                .where((0, drizzle_orm_1.eq)(schema_1.doctorProfiles.userId, doctorId))
                .limit(1);
            // Notify the patient
            await notification_service_1.NotificationService.createNotification({
                userId: updated.patientId,
                title: "Consultation Request Updated",
                message: `Dr. ${doctorProfile?.fullName || "A doctor"} has ${status} your consultation request.`,
                type: status === "accepted" ? "success" : "warning",
                link: `/dashboard/consultations`
            });
            res.json(updated);
        }
        catch (err) {
            console.error("[UPDATE CONSULTATION ERROR]:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
};
