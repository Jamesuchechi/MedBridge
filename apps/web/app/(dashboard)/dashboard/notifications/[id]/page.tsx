"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNotificationStore, Notification } from "@/store/notification.store";
import { format } from "date-fns";
import { useAuthStore } from "@/store/auth.store";

const Ic = {
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

export default function NotificationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { markAsRead } = useNotificationStore();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!user?.id || !id) return;
      
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${API_URL}/api/v1/notifications/${id}`, {
          headers: { "x-user-id": user.id }
        });
        
        if (res.ok) {
          const data = await res.json();
          setNotification(data);
          if (!data.isRead) {
            markAsRead(user.id, id as string);
          }
        }
      } catch (err) {
        console.error("Failed to fetch notification detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [user?.id, id, markAsRead]);

  if (loading) {
    return <div className="loading-state">Loading notification...</div>;
  }

  if (!notification) {
    return (
      <div className="error-state">
        <h2>Notification not found</h2>
        <button onClick={() => router.push("/dashboard/notifications")}>Back to Notifications</button>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <button className="back-link" onClick={() => router.push("/dashboard/notifications")}>
        <Ic.ChevronLeft /> Back to all notifications
      </button>

      <div className="detail-card">
        <header className="detail-header">
          <div className="detail-meta">
            <span className={`type-tag ${notification.type}`}>{notification.type}</span>
            <span className="detail-date">{format(new Date(notification.createdAt), "MMMM d, yyyy • h:mm a")}</span>
          </div>
          <h1 className="detail-title">{notification.title}</h1>
        </header>

        <div className="detail-body">
          <p className="detail-message">{notification.message}</p>
        </div>

        {notification.link && (
          <footer className="detail-footer">
            <a href={notification.link} className="action-link">
              View Related Activity <Ic.ExternalLink />
            </a>
          </footer>
        )}
      </div>

      <style>{`
        .detail-container { max-width: 800px; margin: 0 auto; padding-top: 20px; }
        
        .back-link {
          display: flex; align-items: center; gap: 8px; color: var(--text2);
          font-size: 14px; font-weight: 600; margin-bottom: 24px; transition: color .2s;
        }
        .back-link:hover { color: var(--accent); }

        .detail-card {
          background: var(--card-bg); border: 1px solid var(--card-border);
          border-radius: 20px; overflow: hidden;
        }

        .detail-header { padding: 32px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); }
        .detail-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
        
        .type-tag {
          font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 700;
          padding: 4px 10px; border-radius: 100px; text-transform: uppercase;
          background: var(--glass); color: var(--text2);
        }
        .type-tag.success { background: rgba(0,229,160,0.15); color: var(--accent); }
        .type-tag.warning { background: rgba(255,184,0,0.15); color: var(--warn); }
        .type-tag.error { background: rgba(255,92,92,0.15); color: var(--danger); }

        .detail-date { font-size: 13px; color: var(--text3); }
        .detail-title { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; line-height: 1.2; }

        .detail-body { padding: 32px; min-height: 200px; }
        .detail-message { color: var(--text); font-size: 16px; line-height: 1.6; white-space: pre-wrap; }

        .detail-footer { padding: 24px 32px; background: var(--glass); border-top: 1px solid var(--border); }
        .action-link {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--accent); color: #000; padding: 12px 24px;
          border-radius: 12px; font-weight: 700; font-size: 15px; transition: all .2s;
        }
        .action-link:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,229,160,0.4); }

        .loading-state, .error-state { padding: 100px 20px; text-align: center; color: var(--text2); }
      `}</style>
    </div>
  );
}
