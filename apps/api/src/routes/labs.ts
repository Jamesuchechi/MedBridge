import { Router } from "express";
import { LabsController } from "../controllers/labs.controller";

const router = Router();

router.get("/", LabsController.getLabs);
router.get("/search", LabsController.searchLabs);
router.get("/:id", LabsController.getLabDetails);

export default router;
