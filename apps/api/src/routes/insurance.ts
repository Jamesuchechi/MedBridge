import { Router } from "express";
import { InsuranceController } from "../controllers/insurance.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.get("/providers", InsuranceController.getProviders);
router.get("/patient/:patientId", InsuranceController.getPatientPolicy);
router.post("/patient/:patientId", InsuranceController.updatePatientPolicy);

router.get("/claims", InsuranceController.getClinicClaims);
router.post("/claims", InsuranceController.createClaim);
router.patch("/claims/:id", InsuranceController.updateClaimStatus);

export default router;
