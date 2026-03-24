"use client";

import React, { useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/notification.store";
import { formatDistanceToNow } from "date-fns";

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
}

const Ic = {
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Success: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Warning: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Error: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications(userId);
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <Ic.Success />;
      case "warning": return <Ic.Warning />;
      case "error": return <Ic.Error />;
      default: return <Ic.Info />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "success": return "var(--accent)";
      case "warning": return "var(--warn)";
      case "error": return "var(--danger)";
      default: return "var(--accent2)";
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-header">
        <h3 className="notification-title">Notifications</h3>
        <button className="notification-mark-all" onClick={() => markAllAsRead(userId)}>
          Mark all as read
        </button>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">No notifications yet</div>
        ) : (
          notifications.slice(0, 5).map(n => (
            <div 
              key={n.id} 
              className={`notification-item ${!n.isRead ? 'unread' : ''}`}
              onClick={() => {
                if (!n.isRead) markAsRead(userId, n.id);
                if (n.link) window.location.href = n.link;
              }}
            >
              <div className="notification-icon" style={{ color: getColor(n.type) }}>
                {getIcon(n.type)}
              </div>
              <div className="notification-content">
                <div className="notification-item-title">{n.title}</div>
                <div className="notification-item-message">{n.message}</div>
                <div className="notification-item-time">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </div>
              {!n.isRead && <div className="notification-unread-dot" />}
            </div>
          ))
        )}
      </div>

      <div className="notification-footer">
        <a href="/dashboard/notifications" className="notification-see-all" onClick={onClose}>
          See all notifications
        </a>
      </div>

      <style>{`
        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: var(--sidebar-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          z-index: 1000;
          overflow: hidden;
          animation: dropdown-in .2s ease-out;
        }
        @keyframes dropdown-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .notification-header {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .notification-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .notification-mark-all { font-size: 11px; color: var(--accent); font-weight: 600; }
        .notification-mark-all:hover { opacity: 0.8; }

        .notification-list { max-height: 400px; overflow-y: auto; }
        .notification-empty { padding: 40px 20px; text-align: center; color: var(--text3); font-size: 13px; }

        .notification-item {
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          transition: all .2s;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .notification-item:hover { background: var(--glass-h); }
        .notification-item.unread { background: rgba(0,229,160,0.03); }

        .notification-icon { flex-shrink: 0; margin-top: 2px; }
        .notification-content { flex: 1; min-width: 0; }
        .notification-item-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .notification-item-message { 
          font-size: 12px; color: var(--text2); 
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; 
          overflow: hidden; line-height: 1.4;
        }
        .notification-item-time { font-size: 10px; color: var(--text3); margin-top: 6px; }

        .notification-unread-dot {
          width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
          position: absolute; right: 16px; top: 16px;
        }

        .notification-footer { padding: 12px; border-top: 1px solid var(--border); text-align: center; }
        .notification-see-all { font-size: 12px; font-weight: 600; color: var(--text2); }
        .notification-see-all:hover { color: var(--accent); }
      `}</style>
    </div>
  );
};
