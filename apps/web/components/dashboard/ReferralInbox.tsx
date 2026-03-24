"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Referral } from "@/types/referral";


const Ic = {
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Clipboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
};

export const ReferralInbox: React.FC<{ userId: string }> = ({ userId }) => {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchReferrals = async () => {
      setLoading(true);
      try {
        const endpoint = tab === "received" ? "received" : "sent";
        const res = await fetch(`${API_URL}/api/v1/referrals/${endpoint}`, {
          headers: { "x-user-id": userId }
        });
        if (res.ok) {
          const data = await res.json();
          setReferrals(data);
        }
      } catch (err) {
        console.error("Failed to fetch referrals:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchReferrals();
  }, [tab, userId, API_URL]);

  return (
    <div className="referral-inbox">
      <div className="inbox-header">
        <div className="tabs">
          <button 
            className={`tab ${tab === "received" ? "active" : ""}`}
            onClick={() => setTab("received")}
          >
            Received Referrals
          </button>
          <button 
            className={`tab ${tab === "sent" ? "active" : ""}`}
            onClick={() => setTab("sent")}
          >
            Sent Referrals
          </button>
        </div>
      </div>

      <div className="referrals-list">
        {loading ? (
          <div className="loading-state">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Ic.Clipboard /></div>
            <h3>No {tab} referrals</h3>
            <p>When you {tab === "received" ? "receive" : "send"} clinical referrals, they will appear here.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="inbox-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Specialty</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id} onClick={() => router.push(`/dashboard/referrals/${r.id}`)}>
                    <td>
                      <div className="patient-info">
                        <span className="p-name">{r.patientName}</span>
                        <span className="p-id">REF-{r.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td><span className="spec-tag">{r.specialty}</span></td>
                    <td>
                      <span className={`priority-badge ${r.priority.toLowerCase()}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{format(new Date(r.createdAt), "MMM d, yyyy")}</td>
                    <td>
                      <button className="view-btn">
                        View Packet <Ic.ArrowRight />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .referral-inbox { display: flex; flex-direction: column; gap: 24px; }
        .inbox-header { display: flex; justify-content: space-between; align-items: center; }
        
        .tabs { display: flex; background: var(--glass); padding: 4px; border-radius: 12px; border: 1px solid var(--border); }
        .tab { 
          padding: 8px 18px; border-radius: 9px; font-size: 14px; font-weight: 600; 
          color: var(--text2); transition: all .2s; cursor: pointer;
        }
        .tab.active { background: var(--accent); color: #000; }
        .tab:not(.active):hover { color: var(--text); }

        .table-container { overflow-x: auto; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; }
        .inbox-table { width: 100%; border-collapse: collapse; text-align: left; }
        .inbox-table th { padding: 16px 20px; font-size: 11px; color: var(--text3); text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .inbox-table tr { cursor: pointer; transition: background .2s; }
        .inbox-table tr:hover { background: var(--glass-h); }
        .inbox-table td { padding: 16px 20px; font-size: 14px; border-bottom: 1px solid var(--border); }
        
        .patient-info { display: flex; flex-direction: column; }
        .p-name { font-weight: 700; color: var(--text); }
        .p-id { font-size: 11px; color: var(--text3); font-family: 'DM Mono', monospace; }

        .spec-tag { background: var(--glass); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        
        .priority-badge { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; }
        .priority-badge.routine { background: rgba(0,229,160,0.1); color: var(--accent); }
        .priority-badge.urgent { background: rgba(255,184,0,0.1); color: var(--warn); }
        .priority-badge.stat { background: rgba(255,92,92,0.1); color: var(--danger); }

        .status-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; text-transform: capitalize; border: 1px solid var(--border); }
        .status-badge.pending { color: var(--text3); }
        .status-badge.accepted { border-color: var(--accent); color: var(--accent); }
        .status-badge.rejected { border-color: var(--danger); color: var(--danger); }
        .status-badge.completed { background: var(--accent); color: #000; }

        .view-btn { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--accent); }
        
        .loading-state { padding: 80px; text-align: center; color: var(--text2); }
        .empty-state { padding: 80px; text-align: center; }
        .empty-icon { color: var(--text3); margin-bottom: 20px; }
        .empty-state h3 { font-size: 20px; margin-bottom: 8px; }
        .empty-state p { color: var(--text2); }
      `}</style>
    </div>
  );
};
