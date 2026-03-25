import { Router } from "express";
import { PrescriptionsController } from "../controllers/prescriptions.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.post("/", PrescriptionsController.createPrescription);
router.get("/:id", PrescriptionsController.getPrescription);
router.get("/patient/:patientId", PrescriptionsController.getPatientPrescriptions);
router.patch("/:id/discontinue", PrescriptionsController.discontinuePrescription);

export default router;
