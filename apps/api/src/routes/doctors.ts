import { Router, Request, Response, NextFunction } from "express";
import {
  getSpecializations,
  registerDoctor,
  getDoctorProfile,
  updateDoctorProfile,
  getVerificationQueue,
  getQueueStats,
  getDoctorDetail,
  moderateDoctor,
  getDoctorStats,
} from "../controllers/doctors.controller";
import { requireDoctor } from "../middleware/doctor.middleware";

const router = Router();

// ─── Admin guard ──────────────────────────────────────────────────────────────
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers["x-user-role"] !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ─── Public ───────────────────────────────────────────────────────────────────
// GET /api/v1/doctors/specializations
router.get("/specializations", getSpecializations);

// ─── Doctor (CLINICIAN role) ──────────────────────────────────────────────────
// POST /api/v1/doctors/register  — submit application
router.post("/register", requireDoctor, registerDoctor);

// GET  /api/v1/doctors/me        — get own profile + status
router.get("/me", requireDoctor, getDoctorProfile);

// PUT  /api/v1/doctors/me        — update own profile
router.put("/me", requireDoctor, updateDoctorProfile);

// GET  /api/v1/doctors/stats     — get clinical stats
router.get("/stats", requireDoctor, getDoctorStats);

// ─── Admin ────────────────────────────────────────────────────────────────────
// GET   /api/v1/doctors/admin/queue/stats
router.get("/admin/queue/stats", requireAdmin, getQueueStats);

// GET   /api/v1/doctors/admin/queue?status=pending&page=1&search=
router.get("/admin/queue", requireAdmin, getVerificationQueue);

// GET   /api/v1/doctors/admin/queue/:id
router.get("/admin/queue/:id", requireAdmin, getDoctorDetail);

// PATCH /api/v1/doctors/admin/queue/:id  { action, rejectionReason?, note? }
router.patch("/admin/queue/:id", requireAdmin, moderateDoctor);

export default router;
