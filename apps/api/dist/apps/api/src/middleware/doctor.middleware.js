"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerifiedDoctor = exports.requireDoctor = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
/** User must have CLINICIAN role (set in Supabase user_metadata at signup). */
const requireDoctor = (req, res, next) => {
    const role = req.headers["x-user-role"]?.toUpperCase();
    if (role !== "CLINICIAN" && role !== "DOCTOR") {
        return res.status(403).json({
            error: "Clinician access required.",
            message: "This feature is only available to registered doctors on MedBridge.",
        });
    }
    next();
};
exports.requireDoctor = requireDoctor;
/** User must be a CLINICIAN with an approved, copilot-enabled doctor profile. */
const requireVerifiedDoctor = async (req, res, next) => {
    const role = req.headers["x-user-role"]?.toUpperCase();
    const userId = req.headers["x-user-id"];
    if (role !== "CLINICIAN" && role !== "DOCTOR") {
        return res.status(403).json({
            error: "Clinician access required.",
            code: "NOT_CLINICIAN",
        });
    }
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const [profile] = await db_1.db
            .select({
            verificationStatus: db_1.doctorProfiles.verificationStatus,
            isCopilotEnabled: db_1.doctorProfiles.isCopilotEnabled,
        })
            .from(db_1.doctorProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.doctorProfiles.userId, userId))
            .limit(1);
        if (!profile) {
            return res.status(403).json({
                error: "Doctor profile not found.",
                code: "NO_PROFILE",
                message: "Please complete your doctor registration before accessing this feature.",
            });
        }
        if (profile.verificationStatus !== "approved") {
            const messages = {
                pending: "Your application is pending review. You'll receive an email when it's processed.",
                under_review: "Your application is currently under review. This usually takes less than 24 hours.",
                rejected: "Your application was not approved. Please check your email for details.",
                suspended: "Your account has been suspended. Please contact support.",
            };
            return res.status(403).json({
                error: "Verification required.",
                code: "NOT_VERIFIED",
                verificationStatus: profile.verificationStatus,
                message: messages[profile.verificationStatus] || "Verification pending.",
            });
        }
        if (!profile.isCopilotEnabled) {
            return res.status(403).json({
                error: "Copilot access not yet enabled.",
                code: "COPILOT_DISABLED",
                message: "Your account is approved but copilot access is being configured. Please contact support.",
            });
        }
        next();
    }
    catch (err) {
        console.error("[requireVerifiedDoctor]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.requireVerifiedDoctor = requireVerifiedDoctor;
