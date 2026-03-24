import { Request, Response } from "express";
import { db, notifications } from "@medbridge/db";
import { eq, desc, and } from "drizzle-orm";

export const listNotifications = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    res.status(200).json(userNotifications);
  } catch (err) {
    console.error("[LIST NOTIFICATIONS ERROR]:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const getNotification = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (err) {
    console.error("[GET NOTIFICATION ERROR]:", err);
    res.status(500).json({ error: "Failed to fetch notification" });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("[MARK AS READ ERROR]:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[MARK ALL READ ERROR]:", err);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};
