"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clinics_controller_1 = require("../controllers/clinics.controller");
const clinic_middleware_1 = require("../middleware/clinic.middleware");
const router = (0, express_1.Router)();
// Publicly accessible for registered users who want to register their clinic
router.post("/register", (req, res) => clinics_controller_1.ClinicsController.registerClinic(req, res));
router.get("/me", (req, res) => clinics_controller_1.ClinicsController.getMyClinic(req, res));
// Verified Clinic Admin only
router.post("/invite", clinic_middleware_1.requireClinicAdmin, clinic_middleware_1.requireVerifiedClinic, (req, res) => clinics_controller_1.ClinicsController.inviteStaff(req, res));
// Admin only queue
router.get("/admin/queue", (req, res) => {
    const role = req.headers["x-user-role"]?.toUpperCase();
    if (role !== "SUPER_ADMIN")
        return res.status(403).json({ error: "Admin access required" });
    return clinics_controller_1.ClinicsController.getQueue(req, res);
});
router.patch("/admin/queue/:id", (req, res) => {
    const role = req.headers["x-user-role"]?.toUpperCase();
    if (role !== "SUPER_ADMIN")
        return res.status(403).json({ error: "Admin access required" });
    return clinics_controller_1.ClinicsController.updateStatus(req, res);
});
exports.default = router;
