"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pharmacies_controller_1 = require("../controllers/pharmacies.controller");
const router = (0, express_1.Router)();
// ─── Middleware: require SUPER_ADMIN role for /admin/* routes ─────────────────
const requireAdmin = (req, res, next) => {
    // In your full auth middleware, this would verify the JWT role claim.
    // Here we check the x-user-role header that your auth middleware would set.
    const role = req.headers["x-user-role"];
    if (role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};
// ─── Public routes ────────────────────────────────────────────────────────────
router.get("/search", pharmacies_controller_1.searchPharmacies);
router.get("/geocode", pharmacies_controller_1.geocode);
router.get("/prices/:drugId", pharmacies_controller_1.getDrugPriceComparison);
router.post("/report-availability", pharmacies_controller_1.reportAvailability);
router.post("/report-price", pharmacies_controller_1.reportPrice);
// ─── Admin moderation routes ──────────────────────────────────────────────────
router.get("/admin/moderation/stats", requireAdmin, pharmacies_controller_1.getModerationStats);
router.get("/admin/moderation", requireAdmin, pharmacies_controller_1.getModerationQueue);
router.patch("/admin/moderation/:id", requireAdmin, pharmacies_controller_1.moderateReport);
router.get("/admin/moderation/:id/audit", requireAdmin, pharmacies_controller_1.getReportAuditTrail);
// ─── Parameterised last (avoid shadowing /admin/*) ────────────────────────────
router.get("/:id", pharmacies_controller_1.getPharmacyById);
exports.default = router;
