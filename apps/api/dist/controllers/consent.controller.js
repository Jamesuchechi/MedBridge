"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentController = void 0;
const db_1 = require("@medbridge/db");
const schema_1 = require("@medbridge/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const notification_service_1 = require("../services/notification.service");
exports.ConsentController = {
    /**
     * Grant consent to a doctor
     * POST /api/v1/consent/grant
     */
    grantConsent: async (req, res) => {
        try {
            const patientId = req.headers["x-user-id"];
            const { doctorId, expiresAt } = req.body;
            if (!patientId || !doctorId) {
                return res.status(400).json({ error: "Patient ID and Doctor ID are required" });
            }
            // Check if consent already exists
            const existing = await db_1.db
                .select()
                .from(schema_1.patientDoctorConsent)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.doctorId, doctorId)))
                .limit(1);
            if (existing.length > 0) {
                // Update existing consent to active
                const [updated] = await db_1.db
                    .update(schema_1.patientDoctorConsent)
                    .set({
                    status: "active",
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    updatedAt: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.id, existing[0].id))
                    .returning();
                return res.json(updated);
            }
            const [newConsent] = await db_1.db
                .insert(schema_1.patientDoctorConsent)
                .values({
                patientId,
                doctorId,
                status: "active",
                expiresAt: expiresAt ? new Date(expiresAt) : null
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
                title: "Medical Record Access Granted",
                message: `${patientUser?.name || "A patient"} has granted you access to view their full MedBridge health profile.`,
                type: "success",
                link: `/dashboard/patients/${patientId}`
            });
            res.status(201).json(newConsent);
        }
        catch (err) {
            console.error("[GRANT CONSENT ERROR]:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    /**
     * Revoke consent from a doctor
     * POST /api/v1/consent/revoke
     */
    revokeConsent: async (req, res) => {
        try {
            const patientId = req.headers["x-user-id"];
            const { doctorId } = req.body;
            const [revoked] = await db_1.db
                .update(schema_1.patientDoctorConsent)
                .set({ status: "revoked", updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.doctorId, doctorId)))
                .returning();
            if (!revoked) {
                return res.status(404).json({ error: "Consent record not found" });
            }
            res.json(revoked);
        }
        catch (err) {
            console.error("[REVOKE CONSENT ERROR]:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    /**
     * List doctors with active consent
     * GET /api/v1/consent/doctors
     */
    listConsentedDoctors: async (req, res) => {
        try {
            const patientId = req.headers["x-user-id"];
            const results = await db_1.db
                .select({
                id: schema_1.patientDoctorConsent.id,
                doctorId: schema_1.patientDoctorConsent.doctorId,
                status: schema_1.patientDoctorConsent.status,
                expiresAt: schema_1.patientDoctorConsent.expiresAt,
                fullName: schema_1.doctorProfiles.fullName,
                specialization: schema_1.doctorProfiles.specialization,
                currentHospital: schema_1.doctorProfiles.currentHospital,
            })
                .from(schema_1.patientDoctorConsent)
                .innerJoin(schema_1.doctorProfiles, (0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.doctorId, schema_1.doctorProfiles.userId))
                .where((0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.patientId, patientId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.patientDoctorConsent.createdAt));
            res.json(results);
        }
        catch (err) {
            console.error("[LIST CONSENTED DOCTORS ERROR]:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    /**
     * Internal/Service helper to check consent
     */
    checkConsent: async (patientId, doctorId) => {
        const [consent] = await db_1.db
            .select()
            .from(schema_1.patientDoctorConsent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.doctorId, doctorId), (0, drizzle_orm_1.eq)(schema_1.patientDoctorConsent.status, "active")))
            .limit(1);
        if (!consent)
            return false;
        // Check expiration
        if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
            return false;
        }
        return true;
    }
};
