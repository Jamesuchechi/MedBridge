import { Router } from "express";
import { LabOrdersController } from "../controllers/lab-orders.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.post("/", LabOrdersController.createLabOrder);
router.patch("/:id", LabOrdersController.updateLabResults);
router.get("/patient/:patientId", LabOrdersController.getPatientLabOrders);

export default router;
