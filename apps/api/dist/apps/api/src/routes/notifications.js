"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
// GET /api/v1/notifications
router.get("/", notifications_controller_1.listNotifications);
// GET /api/v1/notifications/:id
router.get("/:id", notifications_controller_1.getNotification);
// PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", notifications_controller_1.markAsRead);
// POST /api/v1/notifications/mark-all-read
router.post("/mark-all-read", notifications_controller_1.markAllAsRead);
exports.default = router;
