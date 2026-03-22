import { Router, Request, Response, NextFunction } from "express";
import {
  searchPharmacies,
  geocode,
  getPharmacyById,
  reportAvailability,
  reportPrice,
  getDrugPriceComparison,
  getModerationQueue,
  getModerationStats,
  moderateReport,
  getReportAuditTrail,
} from "../controllers/pharmacies.controller";

const router = Router();

// ─── Middleware: require SUPER_ADMIN role for /admin/* routes ─────────────────
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // In your full auth middleware, this would verify the JWT role claim.
  // Here we check the x-user-role header that your auth middleware would set.
  const role = req.headers["x-user-role"] as string | undefined;
  if (role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ─── Public routes ────────────────────────────────────────────────────────────
router.get("/search",           searchPharmacies);
router.get("/geocode",          geocode);
router.get("/prices/:drugId",   getDrugPriceComparison);
router.post("/report-availability", reportAvailability);
router.post("/report-price",    reportPrice);

// ─── Admin moderation routes ──────────────────────────────────────────────────
router.get ("/admin/moderation/stats",      requireAdmin, getModerationStats);
router.get ("/admin/moderation",            requireAdmin, getModerationQueue);
router.patch("/admin/moderation/:id",       requireAdmin, moderateReport);
router.get ("/admin/moderation/:id/audit",  requireAdmin, getReportAuditTrail);

// ─── Parameterised last (avoid shadowing /admin/*) ────────────────────────────
router.get("/:id", getPharmacyById);

export default router;