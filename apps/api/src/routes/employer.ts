import { Router } from "express";
import { EmployerController } from "../controllers/employer.controller";
import { requireEmployerAccess, requireVerifiedEmployer } from "../middleware/employer.middleware";

const router = Router();

// Publicly accessible for registered users who want to register their company
router.post("/register", (req, res) => EmployerController.registerEmployer(req, res));
router.get("/me", (req, res) => EmployerController.getMyEmployer(req, res));

// Verified Employer only
router.get("/profile", requireEmployerAccess, requireVerifiedEmployer, (req, res) => EmployerController.getMyEmployer(req, res));
router.get("/employees", requireEmployerAccess, requireVerifiedEmployer, (req, res) => EmployerController.getEmployees(req, res));
router.post("/invite", requireEmployerAccess, requireVerifiedEmployer, (req, res) => EmployerController.inviteEmployee(req, res));

export default router;
