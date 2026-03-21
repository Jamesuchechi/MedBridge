"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const symptoms_controller_1 = require("../controllers/symptoms.controller");
const router = (0, express_1.Router)();
router.post("/analyze", symptoms_controller_1.analyzeSymptoms);
router.get("/history", symptoms_controller_1.getHistory);
router.get("/:id", symptoms_controller_1.getById);
exports.default = router;
