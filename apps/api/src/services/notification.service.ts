import { db, notifications } from "@medbridge/db";
import { emitToUser } from "../lib/socket";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export const NotificationService = {
  /**
   * Creates a notification in the database and emits it via socket.io.
   */
  async createNotification(params: CreateNotificationParams) {
    try {
      const [notification] = await db.insert(notifications).values({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "info",
        link: params.link || null,
        isRead: false,
      }).returning();

      // Emit real-time event
      emitToUser(params.userId, "notification:new", notification);

      return notification;
    } catch (error) {
      console.error("[NOTIFICATION SERVICE ERROR]:", error);
      throw error;
    }
  }
};
