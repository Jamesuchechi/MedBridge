import { create } from "zustand";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (userId: string, id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const useNotificationStore = create<NotificationState>((set, _get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications`, {
        headers: { "x-user-id": userId }
      });
      if (res.ok) {
        const data = await res.json();
        set({ 
          notifications: data, 
          unreadCount: data.filter((n: Notification) => !n.isRead).length 
        });
      }
    } finally {
      set({ loading: false });
    }
  },

  addNotification: (notification: Notification) => {
    set(state => {
      const exists = state.notifications.find(n => n.id === notification.id);
      if (exists) return state;
      
      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.isRead).length
      };
    });
  },

  markAsRead: async (userId: string, id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "x-user-id": userId }
      });
      if (res.ok) {
        set(state => {
          const newNotifications = state.notifications.map(n => 
            n.id === id ? { ...n, isRead: true } : n
          );
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.isRead).length
          };
        });
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/mark-all-read`, {
        method: "POST",
        headers: { "x-user-id": userId }
      });
      if (res.ok) {
        set(state => {
          const newNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
          return {
            notifications: newNotifications,
            unreadCount: 0
          };
        });
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }
}));
