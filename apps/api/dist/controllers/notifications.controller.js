"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotification = exports.listNotifications = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const listNotifications = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const userNotifications = await db_1.db
            .select()
            .from(db_1.notifications)
            .where((0, drizzle_orm_1.eq)(db_1.notifications.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(db_1.notifications.createdAt));
        res.status(200).json(userNotifications);
    }
    catch (err) {
        console.error("[LIST NOTIFICATIONS ERROR]:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};
exports.listNotifications = listNotifications;
const getNotification = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const [notification] = await db_1.db
            .select()
            .from(db_1.notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.notifications.id, id), (0, drizzle_orm_1.eq)(db_1.notifications.userId, userId)))
            .limit(1);
        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }
        res.status(200).json(notification);
    }
    catch (err) {
        console.error("[GET NOTIFICATION ERROR]:", err);
        res.status(500).json({ error: "Failed to fetch notification" });
    }
};
exports.getNotification = getNotification;
const markAsRead = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const [updated] = await db_1.db
            .update(db_1.notifications)
            .set({ isRead: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.notifications.id, id), (0, drizzle_orm_1.eq)(db_1.notifications.userId, userId)))
            .returning();
        if (!updated) {
            return res.status(404).json({ error: "Notification not found" });
        }
        res.status(200).json(updated);
    }
    catch (err) {
        console.error("[MARK AS READ ERROR]:", err);
        res.status(500).json({ error: "Failed to mark notification as read" });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        await db_1.db
            .update(db_1.notifications)
            .set({ isRead: true })
            .where((0, drizzle_orm_1.eq)(db_1.notifications.userId, userId));
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error("[MARK ALL READ ERROR]:", err);
        res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
};
exports.markAllAsRead = markAllAsRead;
