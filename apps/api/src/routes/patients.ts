import { Router } from "express";
import { PatientsController } from "../controllers/patients.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All patient management routes require clinic access and verification
router.use(requireVerifiedClinic);

router.get("/", PatientsController.listPatients);
router.get("/:id", PatientsController.getPatientDetail);
router.post("/register", PatientsController.registerPatient);
router.post("/import", upload.single("file"), PatientsController.importPatients);

export default router;
