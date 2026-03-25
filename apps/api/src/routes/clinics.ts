import { Router } from "express";
import { ClinicsController } from "../controllers/clinics.controller";
import { requireClinicAdmin, requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

// Publicly accessible for registered users who want to register their clinic
router.post("/register", (req, res) => ClinicsController.registerClinic(req, res));
router.get("/me", (req, res) => ClinicsController.getMyClinic(req, res));

// Verified Clinic Admin only
router.get("/my-clinic", requireClinicAdmin, requireVerifiedClinic, (req, res) => ClinicsController.getMyClinic(req, res));
router.get("/staff", requireClinicAdmin, requireVerifiedClinic, (req, res) => ClinicsController.getClinicStaff(req, res));
router.post("/invite", requireClinicAdmin, requireVerifiedClinic, (req, res) => ClinicsController.inviteStaff(req, res));

// Admin only queue
router.get("/admin/queue", (req, res) => {
  const role = (req.headers["x-user-role"] as string | undefined)?.toUpperCase();
  if (role !== "SUPER_ADMIN") return res.status(403).json({ error: "Admin access required" });
  return ClinicsController.getQueue(req, res);
});

router.patch("/admin/queue/:id", (req, res) => {
  const role = (req.headers["x-user-role"] as string | undefined)?.toUpperCase();
  if (role !== "SUPER_ADMIN") return res.status(403).json({ error: "Admin access required" });
  return ClinicsController.updateStatus(req, res);
});

export default router;
