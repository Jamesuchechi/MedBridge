"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctors_controller_1 = require("../controllers/doctors.controller");
const doctor_middleware_1 = require("../middleware/doctor.middleware");
const router = (0, express_1.Router)();
// ─── Admin guard ──────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
    if (req.headers["x-user-role"] !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};
// ─── Public ───────────────────────────────────────────────────────────────────
// GET /api/v1/doctors/specializations
router.get("/specializations", doctors_controller_1.getSpecializations);
// ─── Doctor (CLINICIAN role) ──────────────────────────────────────────────────
// POST /api/v1/doctors/register  — submit application
router.post("/register", doctor_middleware_1.requireDoctor, doctors_controller_1.registerDoctor);
// GET  /api/v1/doctors/me        — get own profile + status
router.get("/me", doctor_middleware_1.requireDoctor, doctors_controller_1.getDoctorProfile);
// PUT  /api/v1/doctors/me        — update own profile
router.put("/me", doctor_middleware_1.requireDoctor, doctors_controller_1.updateDoctorProfile);
// GET  /api/v1/doctors/stats     — get clinical stats
router.get("/stats", doctor_middleware_1.requireDoctor, doctors_controller_1.getDoctorStats);
// ─── Admin ────────────────────────────────────────────────────────────────────
// GET   /api/v1/doctors/admin/queue/stats
router.get("/admin/queue/stats", requireAdmin, doctors_controller_1.getQueueStats);
// GET   /api/v1/doctors/admin/queue?status=pending&page=1&search=
router.get("/admin/queue", requireAdmin, doctors_controller_1.getVerificationQueue);
// GET   /api/v1/doctors/admin/queue/:id
router.get("/admin/queue/:id", requireAdmin, doctors_controller_1.getDoctorDetail);
// PATCH /api/v1/doctors/admin/queue/:id  { action, rejectionReason?, note? }
router.patch("/admin/queue/:id", requireAdmin, doctors_controller_1.moderateDoctor);
exports.default = router;
