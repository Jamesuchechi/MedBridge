"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referrals_controller_1 = require("../controllers/referrals.controller");
const router = (0, express_1.Router)();
// GET /api/v1/referrals/search?query=...
router.get("/search", referrals_controller_1.ReferralsController.searchSpecialists);
// POST /api/v1/referrals
router.post("/", referrals_controller_1.ReferralsController.createReferral);
// GET /api/v1/referrals/sent
router.get("/sent", referrals_controller_1.ReferralsController.listSentReferrals);
// GET /api/v1/referrals/received
router.get("/received", referrals_controller_1.ReferralsController.listReceivedReferrals);
// GET /api/v1/referrals/:id
router.get("/:id", referrals_controller_1.ReferralsController.getReferralDetail);
// PATCH /api/v1/referrals/:id/status
router.patch("/:id/status", referrals_controller_1.ReferralsController.updateReferralStatus);
exports.default = router;
