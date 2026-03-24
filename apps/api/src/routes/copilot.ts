import { Router } from "express";
import { analyzeCase, generateSoapNote, saveCase } from "../controllers/copilot.controller";
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

// POST /api/v1/copilot/save
router.post("/save", saveCase);

export default router;
