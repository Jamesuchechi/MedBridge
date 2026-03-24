"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/store/notification.store";
import { format } from "date-fns";
import { useAuthStore } from "@/store/auth.store";

const Ic = {
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === "all" || !n.isRead;
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                          n.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="notifications-container">
      <header className="page-header">
        <div className="header-content">
          <div className="title-area">
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">Stay updated with your latest clinical and system activities</p>
          </div>
          <button className="mark-all-btn" onClick={() => user?.id && markAllAsRead(user.id)}>
            <Ic.Check /> Mark all as read
          </button>
        </div>

        <div className="filter-bar">
          <div className="tabs">
            <button 
              className={`tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Notifications
            </button>
            <button 
              className={`tab ${filter === "unread" ? "active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              Unread
            </button>
          </div>
          <div className="search-box">
            <Ic.Search />
            <input 
              type="text" 
              placeholder="Search notifications..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Ic.Bell /></div>
            <h3>No notifications found</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div 
              key={n.id} 
              className={`notification-card ${!n.isRead ? 'unread' : ''}`}
              onClick={() => {
                if (!n.isRead && user?.id) markAsRead(user.id, n.id);
                window.location.href = `/dashboard/notifications/${n.id}`;
              }}
            >
              <div className="card-left">
                <div className={`status-indicator ${n.type}`} />
                <div className="card-content">
                  <h4 className="card-title">{n.title}</h4>
                  <p className="card-message">{n.message}</p>
                </div>
              </div>
              <div className="card-right">
                <span className="card-date">{format(new Date(n.createdAt), "MMM d, yyyy • h:mm a")}</span>
                {!n.isRead && <span className="unread-badge">New</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .notifications-container { max-width: 1000px; margin: 0 auto; }
        
        .page-header { margin-bottom: 32px; }
        .header-content { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-subtitle { color: var(--text2); font-size: 15px; }

        .mark-all-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--glass); border: 1px solid var(--border);
          padding: 10px 16px; border-radius: 12px;
          color: var(--text); font-weight: 600; font-size: 14px;
          transition: all .2s;
        }
        .mark-all-btn:hover { background: var(--glass-h); border-color: var(--accent); }

        .filter-bar { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
        .tabs { display: flex; background: var(--glass); padding: 4px; border-radius: 12px; border: 1px solid var(--border); }
        .tab { 
          padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; 
          color: var(--text2); transition: all .2s; 
        }
        .tab.active { background: var(--accent); color: #000; }
        .tab:not(.active):hover { color: var(--text); }

        .search-box { 
          position: relative; flex: 1; max-width: 320px; 
          background: var(--glass); border: 1px solid var(--border);
          border-radius: 12px; display: flex; align-items: center; padding-left: 12px;
        }
        .search-box svg { color: var(--text3); }
        .search-box input { 
          width: 100%; border: none; background: transparent; 
          padding: 10px 12px; color: var(--text); outline: none; font-size: 14px;
        }

        .notifications-list { display: flex; flex-direction: column; gap: 12px; }
        
        .notification-card {
          background: var(--card-bg); border: 1px solid var(--card-border);
          border-radius: 16px; padding: 20px; display: flex; justify-content: space-between;
          align-items: center; cursor: pointer; transition: all .2s;
          position: relative; overflow: hidden;
        }
        .notification-card:hover { transform: translateY(-2px); border-color: var(--border-h); background: var(--glass-h); }
        .notification-card.unread { border-left: 4px solid var(--accent); background: rgba(0,229,160,0.03); }

        .card-left { display: flex; gap: 20px; align-items: center; flex: 1; }
        .status-indicator { width: 12px; height: 12px; border-radius: 50%; background: var(--accent2); }
        .status-indicator.success { background: var(--accent); }
        .status-indicator.warning { background: var(--warn); }
        .status-indicator.error { background: var(--danger); }

        .card-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .card-message { color: var(--text2); font-size: 14px; line-height: 1.5; }

        .card-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .card-date { font-size: 12px; color: var(--text3); }
        .unread-badge { 
          background: var(--accent); color: #000; font-size: 10px; 
          font-weight: 800; padding: 2px 8px; border-radius: 100px;
          text-transform: uppercase; font-family: 'DM Mono', monospace;
        }

        .loading-state, .empty-state { padding: 80px 20px; text-align: center; }
        .empty-icon { width: 64px; height: 64px; background: var(--glass); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--text3); }
        .empty-state h3 { font-size: 20px; margin-bottom: 8px; }
        .empty-state p { color: var(--text2); }

        @media (max-width: 768px) {
          .header-content { flex-direction: column; gap: 20px; }
          .filter-bar { flex-direction: column; align-items: flex-start; }
          .search-box { max-width: 100%; }
          .notification-card { flex-direction: column; align-items: flex-start; gap: 16px; }
          .card-right { align-items: flex-start; width: 100%; pt: 16px; border-top: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
}
