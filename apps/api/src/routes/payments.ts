import { Router } from "express";
import { PaymentsController } from "../controllers/payments.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.post("/", PaymentsController.recordPayment);
router.get("/invoice/:invoiceId", PaymentsController.getInvoicePayments);

export default router;
