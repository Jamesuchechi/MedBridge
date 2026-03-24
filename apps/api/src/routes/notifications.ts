import { Router } from "express";
import { listNotifications, getNotification, markAsRead, markAllAsRead } from "../controllers/notifications.controller";

const router = Router();

// GET /api/v1/notifications
router.get("/", listNotifications);

// GET /api/v1/notifications/:id
router.get("/:id", getNotification);

// PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", markAsRead);

// POST /api/v1/notifications/mark-all-read
router.post("/mark-all-read", markAllAsRead);

export default router;
