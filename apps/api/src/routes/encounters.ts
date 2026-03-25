import { Router } from "express";
import { EncountersController } from "../controllers/encounters.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.post("/", EncountersController.createEncounter);
router.get("/:id", EncountersController.getEncounter);
router.patch("/:id", EncountersController.updateEncounter);
router.patch("/:id/sign", EncountersController.signEncounter);
router.get("/patient/:patientId", EncountersController.getPatientEncounters);

export default router;
