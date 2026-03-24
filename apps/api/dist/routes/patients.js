"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const patients_controller_1 = require("../controllers/patients.controller");
const doctor_middleware_1 = require("../middleware/doctor.middleware");
const router = (0, express_1.Router)();
// All patient routes for doctors require verification
router.use(doctor_middleware_1.requireVerifiedDoctor);
// GET /api/v1/patients
router.get("/", patients_controller_1.getMyPatients);
// GET /api/v1/patients/:id
router.get("/:id", patients_controller_1.getCaseDetail);
exports.default = router;
