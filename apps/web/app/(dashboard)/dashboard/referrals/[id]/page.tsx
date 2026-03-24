"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuthStore } from "@/store/auth.store";
import { generateReferralPDF } from "@/lib/pdf-generator";
import { Referral, ClinicalSummary, Differential } from "@/types/referral";

const Ic = {
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function ReferralDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchDetail = async () => {
      if (!user?.id || !id) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/referrals/${id}`, {
          headers: { "x-user-id": user.id }
        });
        if (res.ok) {
          const data = await res.json();
          setReferral(data);
        }
      } catch (err) {
        console.error("Failed to fetch referral detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [user?.id, id, API_URL]);

  const handleStatusUpdate = async (status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/referrals/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "" 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setReferral(updated);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="loading-state">Loading clinical packet...</div>;
  if (!referral) return <div className="error-state">Referral not found.</div>;

  const isReceiver = user?.id === referral.receivingDoctorId;
  const clinicalSummary: ClinicalSummary = typeof referral.clinicalSummary === 'string' 
    ? JSON.parse(referral.clinicalSummary) 
    : referral.clinicalSummary;

  return (
    <div className="referral-detail-page">
      <button className="back-link" onClick={() => router.push("/dashboard/referrals")}>
        <Ic.ChevronLeft /> Back to Inbox
      </button>

      <div className="detail-layout">
        <div className="main-content">
          <div className="packet-card">
            <header className="packet-header">
              <div className="header-top">
                <div className="p-badge">Clinical Packet</div>
                <button className="download-pdf-btn" onClick={() => generateReferralPDF(referral)}>
                  Download PDF
                </button>
              </div>
              <h1 className="p-title">Referral for {referral.patientName}</h1>
              <div className="p-meta">
                <span>{referral.patientAge}yr • {referral.patientSex}</span>
                <span className="dot" />
                <span>Priority: <strong>{referral.priority}</strong></span>
              </div>
            </header>

            <div className="packet-body">
              <section className="case-section">
                <h3>Reason for Referral</h3>
                <p className="referral-reason">{referral.notes || "No additional notes provided."}</p>
              </section>

              <section className="case-section">
                <h3>Clinical Summary (AI Analysis)</h3>
                <div className="analysis-box">
                  <div className="analysis-item">
                    <label>Chief Complaint</label>
                    <p>{clinicalSummary.chiefComplaint || "N/A"}</p>
                  </div>
                  <div className="analysis-item">
                    <label>Differential Diagnoses</label>
                    <ul>
                      {clinicalSummary.differentials?.map((d: Differential, idx: number) => (
                        <li key={idx}>
                          <strong>{d.condition || d.diagnosis}</strong> — {d.confidence > 1 ? d.confidence : Math.round(d.confidence * 100)}% match
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="analysis-item">
                    <label>Recommended Tests</label>
                    <div className="tags">
                      {(clinicalSummary.recommendedTests || clinicalSummary.investigations)?.map((t: string, idx: number) => (
                        <span key={idx} className="tag">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <aside className="sidebar-content">
          <div className="status-card">
            <h3>Status Control</h3>
            <div className={`current-status ${referral.status}`}>
              {referral.status.toUpperCase()}
            </div>
            
            {isReceiver && referral.status === "pending" && (
              <div className="status-actions">
                <button 
                  className="accept-btn" 
                  onClick={() => handleStatusUpdate("accepted")}
                  disabled={updating}
                >
                  <Ic.Check /> Accept Referral
                </button>
                <button 
                  className="reject-btn" 
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={updating}
                >
                  <Ic.X /> Reject
                </button>
              </div>
            )}

            {isReceiver && referral.status === "accepted" && (
              <button 
                className="complete-btn" 
                onClick={() => handleStatusUpdate("completed")}
                disabled={updating}
              >
                Mark as Completed
              </button>
            )}
          </div>

          <div className="info-card">
            <h3>Source Information</h3>
            <div className="info-row">
              <label>Sending Doctor</label>
              <span>{referral.sendingDoctorName || "N/A"}</span>
            </div>
            <div className="info-row">
              <label>Facility</label>
              <span>{referral.receivingFacility || "Reddington Hospital"}</span>
            </div>
            <div className="info-row">
              <label>Date Sent</label>
              <span>{format(new Date(referral.createdAt), "MMMM d, yyyy")}</span>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .referral-detail-page { max-width: 1200px; margin: 0 auto; padding-top: 10px; }
        .back-link { display: flex; align-items: center; gap: 8px; color: var(--text3); font-weight: 600; font-size: 14px; margin-bottom: 24px; transition: color .2s; }
        .back-link:hover { color: var(--accent); }

        .detail-layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }
        
        .packet-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 24px; overflow: hidden; }
        .packet-header { padding: 40px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .p-badge { 
          display: inline-block; background: var(--accent); color: #000; 
          font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 800;
          padding: 4px 10px; border-radius: 100px; text-transform: uppercase;
        }
        .download-pdf-btn {
          background: var(--glass); border: 1px solid var(--border); color: var(--text2);
          padding: 6px 14px; border-radius: 9px; font-size: 12px; font-weight: 700;
          transition: all .2s;
        }
        .download-pdf-btn:hover { background: var(--accent); color: #000; border-color: var(--accent); }
        .p-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 12px; }
        .p-meta { display: flex; align-items: center; gap: 12px; color: var(--text2); font-size: 15px; }
        .dot { width: 4px; height: 4px; background: var(--border); border-radius: 50%; }

        .packet-body { padding: 40px; display: flex; flex-direction: column; gap: 40px; }
        .case-section h3 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--text); }
        .referral-reason { font-size: 16px; line-height: 1.6; color: var(--text2); background: var(--glass); padding: 20px; border-radius: 16px; font-style: italic; }

        .analysis-box { display: flex; flex-direction: column; gap: 24px; }
        .analysis-item label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; letter-spacing: 0.5px; }
        .analysis-item p { font-size: 15px; color: var(--text); }
        .analysis-item ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .analysis-item li { font-size: 14px; background: var(--glass); padding: 10px 16px; border-radius: 10px; }
        
        .tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { background: var(--glass); border: 1px solid var(--border); padding: 6px 12px; border-radius: 8px; font-size: 12px; color: var(--text2); }

        .sidebar-content { display: flex; flex-direction: column; gap: 24px; }
        .status-card, .info-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 24px; }
        .status-card h3, .info-card h3 { font-size: 14px; font-weight: 700; margin-bottom: 20px; color: var(--text3); text-transform: uppercase; }
        
        .current-status { 
          padding: 12px; border-radius: 12px; text-align: center; font-weight: 800; font-family: 'DM Mono', monospace; margin-bottom: 24px;
          background: var(--glass); border: 1px solid var(--border); color: var(--text2);
        }
        .current-status.accepted { background: rgba(0,229,160,0.1); border-color: var(--accent); color: var(--accent); }
        .current-status.rejected { background: rgba(255,92,92,0.1); border-color: var(--danger); color: var(--danger); }
        .current-status.completed { background: var(--accent); color: #000; }

        .status-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .accept-btn { 
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: var(--accent); color: #000; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 14px;
        }
        .reject-btn { 
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: rgba(255,92,92,0.1); color: var(--danger); border: 1px solid var(--danger); padding: 12px; border-radius: 12px; font-weight: 700; font-size: 14px;
        }
        .complete-btn { 
          width: 100%; padding: 14px; background: var(--accent-tertiary); color: #000; border-radius: 12px; font-weight: 800;
        }

        .info-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
        .info-row label { font-size: 11px; color: var(--text3); font-weight: 600; }
        .info-row span { font-weight: 700; color: var(--text); }

        .loading-state, .error-state { padding: 100px; text-align: center; color: var(--text2); font-size: 18px; }

        @media (max-width: 1024px) {
          .detail-layout { grid-template-columns: 1fr; }
          .sidebar-content { order: -1; }
        }
      `}</style>
    </div>
  );
}
