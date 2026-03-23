import { Router } from "express";
import { analyzeCase, generateSoapNote } from "../controllers/copilot.controller";
import { requireVerifiedDoctor } from "../middleware/doctor.middleware";

const router = Router();

/**
 * All copilot routes require a verified doctor profile.
 */
router.use(requireVerifiedDoctor);

// POST /api/v1/copilot/analyze
router.post("/analyze", analyzeCase);

// POST /api/v1/copilot/note
router.post("/note", generateSoapNote);

export default router;
