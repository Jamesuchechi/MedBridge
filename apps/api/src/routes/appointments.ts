import { Router } from "express";
import { AppointmentsController } from "../controllers/appointments.controller";
import { requireVerifiedClinic } from "../middleware/clinic.middleware";

const router = Router();

router.use(requireVerifiedClinic);

router.get("/", AppointmentsController.listAppointments);
router.post("/", AppointmentsController.createAppointment);
router.patch("/:id/status", AppointmentsController.updateStatus);
router.get("/slots", AppointmentsController.getAvailableSlots);

export default router;
