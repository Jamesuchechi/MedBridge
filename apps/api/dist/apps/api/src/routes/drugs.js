"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drugs_controller_1 = require("../controllers/drugs.controller");
const router = (0, express_1.Router)();
// GET /api/v1/drugs/search?q=paracetamol&category=Analgesic&rx=false&page=1
router.get("/search", drugs_controller_1.searchDrugs);
// GET /api/v1/drugs/categories
router.get("/categories", drugs_controller_1.getDrugCategories);
// POST /api/v1/drugs/interactions  { drugNames: ["Warfarin", "Aspirin"] }
router.post("/interactions", drugs_controller_1.checkInteractions);
// POST /api/v1/drugs/explain  { drugName: "Paracetamol" }
router.post("/explain", drugs_controller_1.explainDrug);
// GET /api/v1/drugs/:id
router.get("/:id", drugs_controller_1.getDrugById);
exports.default = router;
