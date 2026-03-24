"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, Clock, CheckCircle2, XCircle, 
  MessageSquare, User, Shield, ExternalLink
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { format } from "date-fns";

interface ConsultationRequest {
  id: string;
  status: "pending" | "accepted" | "declined" | "completed";
  message?: string;
  createdAt: string;
  patientName?: string;
  patientId?: string;
  doctorName?: string;
  doctorId?: string;
  doctorUserId?: string;
  patientUserId?: string;
  specialization?: string;
}

export default function ConsultationsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API_URL}/api/v1/consultations`, {
        headers: { 
          "x-user-id": user.id,
          "x-user-role": user.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId: string, status: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API_URL}/api/v1/consultations/${requestId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "" 
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleGrantConsent = async (doctorId: string | undefined) => {
    if (!doctorId) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API_URL}/api/v1/consent/grant`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "" 
        },
        body: JSON.stringify({ doctorId })
      });

      if (res.ok) {
        alert("Medical record access granted to the doctor.");
        fetchRequests();
      }
    } catch (err) {
      console.error("Consent error:", err);
    }
  };

  const filteredRequests = requests.filter((r: ConsultationRequest) => filter === "all" || r.status === filter);

  const isDoctor = user?.role === "CLINICIAN";

  return (
    <div className="consultations-page">
      <style>{`
        .consultations-page { max-width: 1000px; margin: 0 auto; }
        .page-header { margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-desc { color: var(--text2); font-size: 16px; }

        .filter-tabs { display: flex; gap: 8px; background: var(--card-bg); padding: 6px; border-radius: 14px; border: 1px solid var(--card-border); }
        .filter-tab { 
          padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; color: var(--text3); 
          transition: all .2s; cursor: pointer;
        }
        .filter-tab:hover { color: var(--text); background: var(--glass); }
        .filter-tab.active { background: var(--accent); color: #000; }

        .requests-list { display: flex; flex-direction: column; gap: 16px; }
        .request-card { 
          background: var(--card-bg); border: 1px solid var(--card-border); 
          border-radius: 20px; overflow: hidden; padding: 24px;
          display: grid; grid-template-columns: 1fr auto; gap: 24px;
        }
        .req-main { display: flex; gap: 20px; }
        .req-avatar { 
          width: 56px; height: 56px; border-radius: 14px; background: var(--bg3);
          display: flex; align-items: center; justify-content: center; color: var(--accent);
          font-weight: 800; font-size: 18px; flex-shrink: 0;
        }
        .req-content { flex: 1; }
        .req-header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .req-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; }
        .status-badge { 
          font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
          padding: 3px 8px; border-radius: 100px; font-family: 'DM Mono', monospace;
        }
        .status-pending { background: rgba(255,184,0,0.12); color: var(--warn); }
        .status-accepted { background: rgba(0,229,160,0.12); color: var(--accent); }
        .status-declined { background: rgba(255,92,92,0.12); color: var(--danger); }
        .status-completed { background: rgba(61,155,255,0.12); color: var(--accent2); }

        .req-info { display: flex; gap: 16px; color: var(--text2); font-size: 13px; margin-bottom: 12px; }
        .info-item { display: flex; align-items: center; gap: 6px; }
        .info-item svg { width: 14px; color: var(--text3); }

        .req-message { 
          background: var(--bg3); padding: 12px 16px; border-radius: 12px; 
          font-size: 14px; color: var(--text); border-left: 3px solid var(--accent);
        }

        .req-actions { display: flex; flex-direction: column; gap: 10px; min-width: 160px; }
        .action-btn { 
          width: 100%; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .2s;
        }
        .btn-accept { background: var(--accent); color: #000; }
        .btn-decline { background: rgba(255,92,92,0.08); color: var(--danger); border: 1px solid rgba(255,92,92,0.2); }
        .btn-consent { background: var(--accent2); color: #fff; }
        .btn-view { background: var(--glass); color: var(--text); border: 1px solid var(--border); }

        .consent-info {
          margin-top: 12px; padding: 12px; background: rgba(61,155,255,0.06); 
          border-radius: 12px; border: 1px solid rgba(61,155,255,0.15);
          display: flex; align-items: flex-start; gap: 10px;
        }
        .consent-info svg { width: 16px; color: var(--accent2); flex-shrink: 0; margin-top: 2px; }
        .consent-text { font-size: 12px; color: var(--text2); line-height: 1.5; }

        .loading-state, .empty-state { padding: 80px; text-align: center; color: var(--text3); background: var(--card-bg); border-radius: 20px; border: 1px dashed var(--border); }
      `}</style>

      <header className="page-header">
        <div>
          <h1 className="page-title">Consultations</h1>
          <p className="page-desc">{isDoctor ? "Manage incoming patient requests." : "Track your consultation requests and records."}</p>
        </div>
        <div className="filter-tabs">
          {["all", "pending", "accepted", "completed"].map(t => (
            <button 
              key={t}
              className={`filter-tab ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Loading your consultations...</div>
      ) : filteredRequests.length > 0 ? (
        <div className="requests-list">
          {filteredRequests.map((req: ConsultationRequest) => (
            <div key={req.id} className="request-card">
              <div className="req-main">
                <div className="req-avatar">
                  {isDoctor ? <User /> : <User />}
                </div>
                <div className="req-content">
                  <div className="req-header">
                    <span className="req-name">{isDoctor ? req.patientName : req.doctorName}</span>
                    <span className={`status-badge status-${req.status}`}>{req.status}</span>
                  </div>
                  <div className="req-info">
                    <div className="info-item"><Calendar /> {format(new Date(req.createdAt), "MMM d, yyyy")}</div>
                    <div className="info-item"><Clock /> {format(new Date(req.createdAt), "h:mm a")}</div>
                    {!isDoctor && <div className="info-item"><Shield /> {req.specialization}</div>}
                  </div>
                  {req.message && (
                    <div className="req-message">
                      {req.message}
                    </div>
                  )}
                  
                  {isDoctor && req.status === "accepted" && (
                    <div className="consent-info">
                      <Shield />
                      <div className="consent-text">
                        <strong>Clinical Note:</strong> You can view this patient's full clinical history once they grant you digital record access.
                      </div>
                    </div>
                  )}
                  
                  {!isDoctor && req.status === "accepted" && (
                    <div className="consent-info">
                      <Shield />
                      <div className="consent-text">
                        <strong>Security Reminder:</strong> Grant record access to allow Dr. {req.doctorName} to view your MedBridge medical records for this consultation.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="req-actions">
                {isDoctor && req.status === "pending" && (
                  <>
                    <button className="action-btn btn-accept" onClick={() => handleUpdateStatus(req.id, "accepted")}>
                      <CheckCircle2 size={16} /> Accept
                    </button>
                    <button className="action-btn btn-decline" onClick={() => handleUpdateStatus(req.id, "declined")}>
                      <XCircle size={16} /> Decline
                    </button>
                  </>
                )}
                
                {isDoctor && req.status === "accepted" && req.patientId && (
                  <button className="action-btn btn-view" onClick={() => window.location.href = `/dashboard/patients/${req.patientId}`}>
                    <ExternalLink size={16} /> View Records
                  </button>
                )}

                {!isDoctor && req.status === "accepted" && (
                  <button className="action-btn btn-consent" onClick={() => handleGrantConsent(req.doctorId || req.doctorUserId)}>
                    <Shield size={16} /> Grant Access
                  </button>
                )}

                <button className="action-btn btn-view">
                  <MessageSquare size={16} /> Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No consultation requests found for this filter.
        </div>
      )}
    </div>
  );
}
