import { Router } from "express";
import {
  searchDrugs,
  getDrugById,
  getDrugCategories,
  checkInteractions,
  explainDrug,
} from "../controllers/drugs.controller";

const router = Router();

// GET /api/v1/drugs/search?q=paracetamol&category=Analgesic&rx=false&page=1
router.get("/search", searchDrugs);

// GET /api/v1/drugs/categories
router.get("/categories", getDrugCategories);

// POST /api/v1/drugs/interactions  { drugNames: ["Warfarin", "Aspirin"] }
router.post("/interactions", checkInteractions);

// POST /api/v1/drugs/explain  { drugName: "Paracetamol" }
router.post("/explain", explainDrug);

// GET /api/v1/drugs/:id
router.get("/:id", getDrugById);

export default router;