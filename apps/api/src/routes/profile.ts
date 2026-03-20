import { Router } from "express";
import { getProfile, upsertProfile } from "../controllers/profile.controller";

const router = Router();

router.get("/", getProfile);
router.post("/", upsertProfile);

export default router;
