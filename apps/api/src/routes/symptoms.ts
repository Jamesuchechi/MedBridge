import { Router } from "express";
import { analyzeSymptoms, getHistory, getById } from "../controllers/symptoms.controller";

const router = Router();

router.post("/analyze", analyzeSymptoms);
router.get("/history", getHistory);
router.get("/:id", getById);

export default router;
