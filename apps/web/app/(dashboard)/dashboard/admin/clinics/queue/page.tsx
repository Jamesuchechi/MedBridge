"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
type VerificationStatus = "pending" | "approved" | "rejected";

interface ClinicProfile {
  id:                 string;
  name:               string;
  email:              string;
  phone:              string;
  address:            string;
  state:              string;
  lga?:               string;
  cacNumber:          string;
  verificationStatus: VerificationStatus;
  adminNotes?:        string;
  verifiedBy?:        string;
  verifiedAt?:        string;
  createdAt:          string;
}

// ─── CSS (Sharing styles with doctor queue for consistency) ───────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.cq { width:100%; max-width:1200px; padding:32px 0 80px; animation:cq-in .35s ease; }
@keyframes cq-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

.cq-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3vw,30px); font-weight:800; margin-bottom:6px; }
.cq-title span { color:#c77dff; }
.cq-sub { font-size:14px; color:var(--text2); margin-bottom:28px; }

.cq-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
.cq-tabs { display:flex; gap:4px; background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:12px; padding:4px; }
.cq-tab { padding:8px 16px; border-radius:8px; background:transparent; border:none; color:var(--text2); font-size:13px; font-weight:600; cursor:pointer; }
.cq-tab.active { background:#c77dff; color:#000; }

.cq-list { display:flex; flex-direction:column; gap:12px; }
.cq-card { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:18px; padding:24px; }
.cq-card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
.cq-name { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; }
.cq-cac { font-family:'DM Mono',monospace; font-size:11px; color:#c77dff; margin-top:2px; }

.cq-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:16px; margin-bottom:20px; }
.cq-meta-item { display:flex; flex-direction:column; gap:2px; }
.cq-meta-lbl { font-size:10px; text-transform:uppercase; color:var(--text3); font-family:'DM Mono',monospace; }
.cq-meta-val { font-size:13px; color:var(--text2); }

.cq-actions { display:flex; gap:8px; }
.cq-btn { padding:8px 16px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:1.5px solid; transition:all .15s; }
.cq-btn-approve { border-color:#00e5a0; background:rgba(0,229,160,.08); color:#00e5a0; }
.cq-btn-reject { border-color:#ff5c5c; background:rgba(255,92,92,.08); color:#ff5c5c; }

.status-badge { font-family:'DM Mono',monospace; font-size:10px; font-weight:700; padding:3px 9px; border-radius:100px; text-transform:uppercase; border:1px solid; }
.status-pending { background:rgba(255,184,0,.1); color:#ffb800; border-color:rgba(255,184,0,.2); }
.status-approved { background:rgba(0,229,160,.1); color:#00e5a0; border-color:rgba(0,229,160,.2); }
.status-rejected { background:rgba(255,92,92,.1); color:#ff5c5c; border-color:rgba(255,92,92,.2); }
`;

export default function ClinicVerificationQueuePage() {
  const { user } = useAuthStore();
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [tab, setTab] = useState<VerificationStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ clinics: ClinicProfile[] }>(`/api/v1/clinics/admin/queue?status=${tab}`, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        }
      });
      setClinics(data.clinics);
    } catch { /* handle */ }
    finally { setLoading(false); }
  }, [tab, user]);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  const handleAction = async (id: string, action: string) => {
    setActioning(id);
    try {
      await api.patch(`/api/v1/clinics/admin/queue/${id}`, { action }, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        }
      });
      await fetchClinics();
    } catch (e: unknown) {
      console.error(e);
    }
    finally { setActioning(null); }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="cq p-6">
        <h1 className="cq-title">Clinic <span>Verification Queue</span></h1>
        <p className="cq-sub">Review CAC registrations and approve medical facilities.</p>

        <div className="cq-toolbar">
          <div className="cq-tabs">
            {["pending", "approved", "rejected"].map((t) => (
              <button
                key={t}
                className={`cq-tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t as VerificationStatus)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center p-12">Loading...</div>
        ) : clinics.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground bg-card-bg border border-card-border rounded-2xl">
            No {tab} clinic applications.
          </div>
        ) : (
          <div className="cq-list">
            {clinics.map((c) => (
              <div key={c.id} className="cq-card">
                <div className="cq-card-header">
                  <div>
                    <h3 className="cq-name">{c.name}</h3>
                    <div className="cq-cac">{c.cacNumber}</div>
                  </div>
                  <span className={`status-badge status-${c.verificationStatus}`}>
                    {c.verificationStatus}
                  </span>
                </div>

                <div className="cq-grid">
                  <div className="cq-meta-item">
                    <span className="cq-meta-lbl">Location</span>
                    <span className="cq-meta-val">{c.state}{c.lga ? `, ${c.lga}` : ""}</span>
                  </div>
                  <div className="cq-meta-item">
                    <span className="cq-meta-lbl">Contact</span>
                    <span className="cq-meta-val">{c.email}<br />{c.phone}</span>
                  </div>
                  <div className="cq-meta-item">
                    <span className="cq-meta-lbl">Applied</span>
                    <span className="cq-meta-val">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {tab === "pending" && (
                  <div className="cq-actions">
                    <button
                      className="cq-btn cq-btn-approve"
                      disabled={!!actioning}
                      onClick={() => handleAction(c.id, "approve")}
                    >
                      {actioning === c.id ? "Approving..." : "Approve Clinic"}
                    </button>
                    <button
                      className="cq-btn cq-btn-reject"
                      disabled={!!actioning}
                      onClick={() => handleAction(c.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
