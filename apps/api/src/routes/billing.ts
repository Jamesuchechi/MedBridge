import { Router } from "express";
import { BillingController } from "../controllers/billing.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

// Financial reporting requires clinic context
router.use(requireVerifiedClinic);

router.get("/stats", BillingController.getClinicStats);
router.get("/insights", BillingController.getRevenueInsights);

export default router;
