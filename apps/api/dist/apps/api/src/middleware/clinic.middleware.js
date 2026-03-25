"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerifiedClinic = exports.requireClinicAdmin = exports.requireClinicAccess = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
/** User must have CLINIC_ADMIN or CLINIC_STAFF role. */
const requireClinicAccess = (req, res, next) => {
    const role = req.headers["x-user-role"]?.toUpperCase();
    if (role !== "CLINIC_ADMIN" && role !== "CLINIC_STAFF") {
        return res.status(403).json({
            error: "Clinic access required.",
            message: "This feature is only available to registered clinic administrators and staff.",
        });
    }
    next();
};
exports.requireClinicAccess = requireClinicAccess;
/** User must have CLINIC_ADMIN role. */
const requireClinicAdmin = (req, res, next) => {
    const role = req.headers["x-user-role"]?.toUpperCase();
    if (role !== "CLINIC_ADMIN") {
        return res.status(403).json({
            error: "Clinic admin access required.",
            message: "This feature is restricted to clinic administrators.",
        });
    }
    next();
};
exports.requireClinicAdmin = requireClinicAdmin;
/** Clinic must be approved. */
const requireVerifiedClinic = async (req, res, next) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        // Optimization: Join users and clinics to verify status in a single query
        const [result] = await db_1.db
            .select({
            clinicId: db_1.users.clinicId,
            verificationStatus: db_1.clinics.verificationStatus,
        })
            .from(db_1.users)
            .innerJoin(db_1.clinics, (0, drizzle_orm_1.eq)(db_1.users.clinicId, db_1.clinics.id))
            .where((0, drizzle_orm_1.eq)(db_1.users.id, userId))
            .limit(1);
        if (!result?.clinicId) {
            return res.status(403).json({
                error: "Not associated with an active clinic.",
                code: "NO_CLINIC",
            });
        }
        // Attach to request for controllers to use
        req.clinicId = result.clinicId;
        req.clinicStatus = result.verificationStatus;
        if (result.verificationStatus !== "approved") {
            const messages = {
                pending: "Your clinic application is pending review. You'll receive an email when it's approved.",
                rejected: "Your clinic application was not approved. Please contact support for details.",
            };
            return res.status(403).json({
                error: "Clinic verification required.",
                code: "CLINIC_NOT_VERIFIED",
                status: result.verificationStatus,
                message: messages[result.verificationStatus] || "Verification pending.",
            });
        }
        next();
    }
    catch (err) {
        console.error("[requireVerifiedClinic]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.requireVerifiedClinic = requireVerifiedClinic;
