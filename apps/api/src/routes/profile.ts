import { Router } from "express";
import { getProfile, upsertProfile, getProfileUploadUrl } from "../controllers/profile.controller";

const router = Router();

router.get("/", getProfile);
router.post("/", upsertProfile);
router.get("/upload-url", getProfileUploadUrl);

export default router;
