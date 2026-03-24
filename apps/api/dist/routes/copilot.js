"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const copilot_controller_1 = require("../controllers/copilot.controller");
const doctor_middleware_1 = require("../middleware/doctor.middleware");
const router = (0, express_1.Router)();
/**
 * All copilot routes require a verified doctor profile.
 */
router.use(doctor_middleware_1.requireVerifiedDoctor);
// POST /api/v1/copilot/analyze
router.post("/analyze", copilot_controller_1.analyzeCase);
// POST /api/v1/copilot/note
router.post("/note", copilot_controller_1.generateSoapNote);
// POST /api/v1/copilot/save
router.post("/save", copilot_controller_1.saveCase);
exports.default = router;
