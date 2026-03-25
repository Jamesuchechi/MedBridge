import { Router } from "express";
import { InvoicesController } from "../controllers/invoices.controller";
import { PaymentsController } from "../controllers/payments.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.post("/", InvoicesController.createInvoice);
router.get("/", InvoicesController.getClinicInvoices);
router.get("/:id", InvoicesController.getInvoice);
router.get("/patient/:patientId", InvoicesController.getPatientInvoices);

router.post("/payments", PaymentsController.recordPayment);

export default router;
