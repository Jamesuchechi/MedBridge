import { Router } from "express";
import { getMyPatients, getCaseDetail } from "../controllers/patients.controller";
import { requireVerifiedDoctor } from "../middleware/doctor.middleware";

const router = Router();

// All patient routes for doctors require verification
router.use(requireVerifiedDoctor);

// GET /api/v1/patients
router.get("/", getMyPatients);

// GET /api/v1/patients/:id
router.get("/:id", getCaseDetail);

export default router;
