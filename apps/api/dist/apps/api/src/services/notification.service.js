"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const db_1 = require("@medbridge/db");
const socket_1 = require("../lib/socket");
exports.NotificationService = {
    /**
     * Creates a notification in the database and emits it via socket.io.
     */
    async createNotification(params) {
        try {
            const [notification] = await db_1.db.insert(db_1.notifications).values({
                userId: params.userId,
                title: params.title,
                message: params.message,
                type: params.type || "info",
                link: params.link || null,
                isRead: false,
            }).returning();
            // Emit real-time event
            (0, socket_1.emitToUser)(params.userId, "notification:new", notification);
            return notification;
        }
        catch (error) {
            console.error("[NOTIFICATION SERVICE ERROR]:", error);
            throw error;
        }
    }
};
