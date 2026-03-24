import { Router } from "express";
import { ReferralsController } from "../controllers/referrals.controller";

const router = Router();

// GET /api/v1/referrals/search?query=...
router.get("/search", ReferralsController.searchSpecialists);

// POST /api/v1/referrals
router.post("/", ReferralsController.createReferral);

// GET /api/v1/referrals/sent
router.get("/sent", ReferralsController.listSentReferrals);

// GET /api/v1/referrals/received
router.get("/received", ReferralsController.listReceivedReferrals);

// GET /api/v1/referrals/:id
router.get("/:id", ReferralsController.getReferralDetail);

// PATCH /api/v1/referrals/:id/status
router.patch("/:id/status", ReferralsController.updateReferralStatus);


export default router;
