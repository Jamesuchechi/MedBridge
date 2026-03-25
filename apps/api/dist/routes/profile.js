"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const router = (0, express_1.Router)();
router.get("/", profile_controller_1.getProfile);
router.post("/", profile_controller_1.upsertProfile);
router.get("/upload-url", profile_controller_1.getProfileUploadUrl);
exports.default = router;
