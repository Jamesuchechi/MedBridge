"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
type VerificationStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";

interface DoctorProfile {
  id:                 string;
  userId:             string;
  fullName:           string;
  gender?:            string;
  phone?:             string;
  mdcnNumber:         string;
  mdcnYear?:          number;
  specialization:     string;
  subSpecialization?: string;
  yearsExperience?:   number;
  currentHospital?:   string;
  hospitalState?:     string;
  isIndependent:      boolean;
  bio?:               string;
  languages:          string[];
  consultationTypes:  string[];
  verificationStatus: VerificationStatus;
  isCopilotEnabled:   boolean;
  rejectionReason?:   string;
  verifiedBy?:        string;
  verifiedAt?:        string;
  submittedAt:        string;
}

interface AuditEntry {
  id:             string;
  adminId:        string;
  action:         string;
  previousStatus: string;
  newStatus:      string;
  note?:          string;
  createdAt:      string;
}

interface QueueStats {
  pending:      number;
  under_review: number;
  approved:     number;
  rejected:     number;
  suspended:    number;
  total:        number;
  last24h:      number;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.dq { width:100%; max-width:1200px; padding:32px 0 80px; animation:dq-in .35s ease; }
@keyframes dq-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

.dq-eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'DM Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:#c77dff; margin-bottom:10px; }
.dq-eyebrow-dot { width:5px;height:5px;border-radius:50%;background:#c77dff;animation:dot 2s infinite; }
@keyframes dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.dq-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3vw,30px); font-weight:800; margin-bottom:6px; }
.dq-title span { color:#c77dff; }
.dq-sub { font-size:14px; color:var(--text2); margin-bottom:28px; }

/* Stats */
.dq-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:28px; }
@media(max-width:800px){ .dq-stats { grid-template-columns:repeat(3,1fr); } }
@media(max-width:500px){ .dq-stats { grid-template-columns:repeat(2,1fr); } }
.dq-stat { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:14px; padding:16px 18px; }
.dq-stat-val { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; line-height:1; margin-bottom:4px; }
.dq-stat-lbl { font-size:10px; color:var(--text3); font-family:'DM Mono',monospace; text-transform:uppercase; }
.dq-stat-sub { font-size:10px; color:var(--text3); margin-top:4px; }
.s-pending     .dq-stat-val { color:#ffb800; }
.s-review      .dq-stat-val { color:#3d9bff; }
.s-approved    .dq-stat-val { color:#00e5a0; }
.s-rejected    .dq-stat-val { color:#ff5c5c; }
.s-suspended   .dq-stat-val { color:#888; }

/* Toolbar */
.dq-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
.dq-tabs { display:flex; gap:4px; background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:12px; padding:4px; overflow-x:auto; }
.dq-tab { padding:8px 14px; border-radius:8px; background:transparent; border:none; color:var(--text2); font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.dq-tab.active { background:var(--tab-color,#c77dff); color:#000; }
.dq-tab-ct { background:rgba(255,255,255,.2); padding:1px 6px; border-radius:100px; font-size:10px; font-family:'DM Mono',monospace; }
.dq-search { flex:1; min-width:180px; padding:10px 14px; background:var(--card-bg,rgba(255,255,255,.04)); border:1.5px solid var(--border,rgba(255,255,255,.08)); border-radius:11px; color:var(--text); font-size:14px; outline:none; }
.dq-search:focus { border-color:rgba(199,125,255,.5); }

/* Doctor list */
.dq-list { display:flex; flex-direction:column; gap:12px; }
.dq-card { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:18px; padding:20px; transition:border-color .2s; }
.dq-card:hover { border-color:rgba(199,125,255,.3); }
.dq-card-header { display:flex; align-items:flex-start; gap:14px; margin-bottom:14px; }
.dq-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#c77dff,#3d9bff); display:flex; align-items:center; justify-content:center; font-family:'Syne',sans-serif; font-weight:700; font-size:16px; color:#000; flex-shrink:0; }
.dq-name { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; }
.dq-specialty { font-size:12px; color:var(--text2); margin-top:2px; }
.dq-mdcn { font-family:'DM Mono',monospace; font-size:11px; color:var(--accent); margin-top:3px; }
.dq-meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.dq-meta-chip { font-size:11px; color:var(--text2); background:var(--glass,rgba(255,255,255,.04)); border:1px solid var(--border,rgba(255,255,255,.08)); padding:3px 10px; border-radius:8px; font-family:'DM Mono',monospace; }
.dq-bio { font-size:13px; color:var(--text2); line-height:1.6; margin-bottom:14px; }

/* Status badges */
.dq-status { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-family:'DM Mono',monospace; font-weight:700; padding:3px 9px; border-radius:100px; text-transform:uppercase; }
.status-pending     { background:rgba(255,184,0,.1); color:#ffb800; border:1px solid rgba(255,184,0,.25); }
.status-under_review{ background:rgba(61,155,255,.1); color:#3d9bff; border:1px solid rgba(61,155,255,.2); }
.status-approved    { background:rgba(0,229,160,.1); color:#00e5a0; border:1px solid rgba(0,229,160,.2); }
.status-rejected    { background:rgba(255,92,92,.1); color:#ff5c5c; border:1px solid rgba(255,92,92,.2); }
.status-suspended   { background:rgba(136,136,136,.1); color:#888; border:1px solid rgba(136,136,136,.2); }

/* Actions */
.dq-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start; }
.dq-act { padding:8px 16px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:1.5px solid; transition:all .15s; font-family:'DM Sans',sans-serif; }
.dq-act:hover { transform:translateY(-1px); }
.dq-act:disabled { opacity:.4; cursor:not-allowed; transform:none; }
.act-review   { border-color:rgba(61,155,255,.4); background:rgba(61,155,255,.08); color:#3d9bff; }
.act-approve  { border-color:rgba(0,229,160,.4);  background:rgba(0,229,160,.08);  color:#00e5a0; }
.act-reject   { border-color:rgba(255,92,92,.4);   background:rgba(255,92,92,.08);   color:#ff5c5c; }
.act-suspend  { border-color:rgba(136,136,136,.4); background:rgba(136,136,136,.08); color:#888; }
.act-reinstate{ border-color:rgba(0,229,160,.4);  background:rgba(0,229,160,.08);  color:#00e5a0; }
.act-audit    { border-color:rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:var(--text3); }

/* Rejection reason form */
.dq-reject-form { margin-top:10px; display:flex; flex-direction:column; gap:8px; }
.dq-reject-input { width:100%; padding:9px 13px; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,92,92,.3); border-radius:10px; color:var(--text); font-size:13px; outline:none; }
.dq-reject-input:focus { border-color:rgba(255,92,92,.6); }
.dq-reject-submit { padding:8px 16px; background:#ff5c5c; color:#fff; border:none; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; }

/* Note form (inline) */
.dq-note-row { margin-top:8px; display:flex; gap:6px; }
.dq-note-input { flex:1; padding:7px 11px; background:rgba(255,255,255,.04); border:1px solid var(--border,rgba(255,255,255,.08)); border-radius:9px; color:var(--text); font-size:12px; outline:none; }
.dq-note-input:focus { border-color:rgba(199,125,255,.5); }
.dq-note-btn { padding:7px 13px; background:rgba(199,125,255,.1); border:1.5px solid rgba(199,125,255,.25); border-radius:9px; color:#c77dff; font-size:12px; font-weight:700; cursor:pointer; }

/* Detail drawer / modal */
.dq-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; }
.dq-drawer { width:100%; max-width:600px; max-height:88vh; overflow-y:auto; background:#0c0e12; border:1px solid rgba(255,255,255,.1); border-radius:24px; padding:36px; position:relative; box-shadow:0 30px 60px rgba(0,0,0,.5); }
.dq-drawer-close { position:absolute; top:18px; right:18px; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.06); border:none; color:var(--text2); display:flex;align-items:center;justify-content:center; cursor:pointer; }
.dq-drawer h3 { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; margin-bottom:20px; }
.dq-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
.dq-detail-field { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:14px; }
.dq-detail-lbl { font-size:10px; font-family:'DM Mono',monospace; text-transform:uppercase; color:var(--text3); margin-bottom:5px; }
.dq-detail-val { font-size:14px; font-weight:600; }
.dq-audit-entry { display:flex; gap:12px; padding:12px 0; border-bottom:1px solid var(--border,rgba(255,255,255,.06)); }
.dq-audit-entry:last-child { border-bottom:none; }
.dq-audit-dot { width:8px; height:8px; border-radius:50%; margin-top:4px; flex-shrink:0; }
.dq-audit-action { font-weight:700; font-size:13px; text-transform:capitalize; }
.dq-audit-meta { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; margin-top:2px; }
.dq-audit-note { font-size:12px; color:var(--text2); margin-top:4px; font-style:italic; }

/* Loader */
.dq-loader { display:flex; justify-content:center; padding:52px; }
.dq-spinner { width:32px;height:32px; border:3px solid var(--border,rgba(255,255,255,.08)); border-top-color:#c77dff; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin{to{transform:rotate(360deg)}}
.dq-empty { text-align:center; padding:52px; color:var(--text3); font-size:14px; }
`;

const Ic = {
  X:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ChevL:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevR:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
};

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000);
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  approve: "#00e5a0", reinstate: "#00e5a0",
  reject: "#ff5c5c", suspend: "#888",
  under_review: "#3d9bff",
  submit: "#c77dff", note: "#aaa",
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({
  doctorId,
  onClose,
}: {
  doctorId: string;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const [data, setData] = useState<{ profile: DoctorProfile; email: string; auditLog: AuditEntry[] } | null>(null);

  useEffect(() => {
    api.get<typeof data>(`/api/v1/doctors/admin/queue/${doctorId}`, {
      headers: { "x-user-id": user?.id || "", "x-user-role": "SUPER_ADMIN" },
    }).then(setData).catch(() => {});
  }, [doctorId, user?.id]);

  return (
    <div className="dq-overlay" onClick={onClose}>
      <div className="dq-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="dq-drawer-close" onClick={onClose}><Ic.X /></button>
        {!data ? (
          <div className="dq-loader"><div className="dq-spinner" /></div>
        ) : (
          <>
            <h3>Dr. {data.profile.fullName}</h3>
            <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 20 }}>
              {data.email} · Submitted {timeAgo(data.profile.submittedAt)}
            </p>

            <div className="dq-detail-grid">
              {[
                { label: "MDCN Number",    value: data.profile.mdcnNumber },
                { label: "Specialization", value: data.profile.specialization },
                { label: "Years Exp.",     value: data.profile.yearsExperience ? `${data.profile.yearsExperience} years` : "—" },
                { label: "Hospital",       value: data.profile.currentHospital || "—" },
                { label: "State",          value: data.profile.hospitalState || "—" },
                { label: "Practice type",  value: data.profile.isIndependent ? "Independent" : "Clinic/Hospital" },
                { label: "Consultation",   value: data.profile.consultationTypes.join(", ") },
                { label: "Languages",      value: data.profile.languages.join(", ") },
                { label: "Copilot",        value: data.profile.isCopilotEnabled ? "Enabled" : "Disabled" },
                { label: "Status",         value: data.profile.verificationStatus },
              ].map(({ label, value }) => (
                <div key={label} className="dq-detail-field">
                  <div className="dq-detail-lbl">{label}</div>
                  <div className="dq-detail-val">{value}</div>
                </div>
              ))}
            </div>

            {data.profile.bio && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontFamily: "DM Mono", color: "var(--text3)", marginBottom: 6, textTransform: "uppercase" }}>Bio</div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{data.profile.bio}</p>
              </div>
            )}

            {data.profile.rejectionReason && (
              <div style={{ padding: "12px 16px", background: "rgba(255,92,92,.08)", border: "1px solid rgba(255,92,92,.2)", borderRadius: 12, marginBottom: 20, fontSize: 13, color: "#ff5c5c" }}>
                <strong>Rejection reason:</strong> {data.profile.rejectionReason}
              </div>
            )}

            {/* Audit log */}
            <div style={{ fontFamily: "DM Mono", fontSize: 10, textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
              Verification History
            </div>
            {data.auditLog.length === 0 ? (
              <p style={{ color: "var(--text3)", fontSize: 13 }}>No actions taken yet.</p>
            ) : (
              data.auditLog.map((e) => (
                <div key={e.id} className="dq-audit-entry">
                  <div className="dq-audit-dot" style={{ background: ACTION_COLORS[e.action] || "#aaa" }} />
                  <div>
                    <div className="dq-audit-action" style={{ color: ACTION_COLORS[e.action] }}>
                      {e.action}
                      {e.previousStatus && e.newStatus && (
                        <span style={{ fontWeight: 400, color: "var(--text3)", fontSize: 11 }}>
                          {" "}{e.previousStatus} → {e.newStatus}
                        </span>
                      )}
                    </div>
                    <div className="dq-audit-meta">
                      {e.adminId === "SYSTEM" ? "System" : `Admin ${e.adminId.slice(0, 8)}...`} · {timeAgo(e.createdAt)}
                    </div>
                    {e.note && <div className="dq-audit-note">"{e.note}"</div>}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
function DoctorCard({
  doctor,
  onAction,
  onViewDetail,
  actioning,
}: {
  doctor:        DoctorProfile;
  onAction:      (id: string, action: string, extra?: Record<string, string>) => Promise<void>;
  onViewDetail:  (id: string) => void;
  actioning:     boolean;
}) {
  const [showRejectForm,  setShowRejectForm]  = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showNoteField,   setShowNoteField]   = useState(false);
  const [noteText,        setNoteText]        = useState("");

  const initials = doctor.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const s = doctor.verificationStatus;

  return (
    <div className="dq-card">
      {/* Header */}
      <div className="dq-card-header">
        <div className="dq-avatar">{initials}</div>
        <div style={{ flex: 1 }}>
          <div className="dq-name">Dr. {doctor.fullName}</div>
          <div className="dq-specialty">{doctor.specialization}{doctor.subSpecialization ? ` · ${doctor.subSpecialization}` : ""}</div>
          <div className="dq-mdcn">{doctor.mdcnNumber}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span className={`dq-status status-${s}`}>{s.replace("_", " ")}</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "DM Mono" }}>
            {timeAgo(doctor.submittedAt)}
          </span>
        </div>
      </div>

      {/* Meta chips */}
      <div className="dq-meta">
        {doctor.hospitalState && <span className="dq-meta-chip">📍 {doctor.hospitalState}</span>}
        {doctor.currentHospital && <span className="dq-meta-chip">🏥 {doctor.currentHospital}</span>}
        {doctor.yearsExperience && <span className="dq-meta-chip">{doctor.yearsExperience}yr exp</span>}
        <span className="dq-meta-chip">{doctor.isIndependent ? "Independent" : "Hospital"}</span>
        {doctor.consultationTypes.map((t) => <span key={t} className="dq-meta-chip">{t}</span>)}
      </div>

      {doctor.bio && <div className="dq-bio">{doctor.bio.slice(0, 180)}{doctor.bio.length > 180 ? "..." : ""}</div>}

      {doctor.rejectionReason && (
        <div style={{ fontSize: 12, color: "#ff7c2b", marginBottom: 12, padding: "8px 12px", background: "rgba(255,124,43,.08)", borderRadius: 10 }}>
          Prev. rejection: {doctor.rejectionReason}
        </div>
      )}

      {/* Action buttons */}
      <div className="dq-actions">
        {s === "pending" && (
          <button className="dq-act act-review" disabled={actioning}
            onClick={() => onAction(doctor.id, "under_review")}>
            Mark Under Review
          </button>
        )}
        {(s === "pending" || s === "under_review") && (
          <button className="dq-act act-approve" disabled={actioning}
            onClick={() => onAction(doctor.id, "approve")}>
            <Ic.Check /> Approve
          </button>
        )}
        {(s === "pending" || s === "under_review") && !showRejectForm && (
          <button className="dq-act act-reject" disabled={actioning}
            onClick={() => setShowRejectForm(true)}>
            Reject
          </button>
        )}
        {s === "approved" && (
          <button className="dq-act act-suspend" disabled={actioning}
            onClick={() => onAction(doctor.id, "suspend")}>
            Suspend
          </button>
        )}
        {s === "suspended" && (
          <button className="dq-act act-reinstate" disabled={actioning}
            onClick={() => onAction(doctor.id, "reinstate")}>
            Reinstate
          </button>
        )}
        <button className="dq-act act-audit" onClick={() => onViewDetail(doctor.id)}>
          <Ic.History /> History
        </button>
      </div>

      {/* Rejection form */}
      {showRejectForm && (
        <div className="dq-reject-form">
          <input
            className="dq-reject-input"
            placeholder="Rejection reason (required for doctor notification)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="dq-reject-submit"
              disabled={!rejectionReason.trim()}
              onClick={() => {
                onAction(doctor.id, "reject", { rejectionReason });
                setShowRejectForm(false);
              }}
            >
              Confirm Rejection
            </button>
            <button
              style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 13 }}
              onClick={() => setShowRejectForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Note field */}
      {!showNoteField ? (
        <button
          style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginTop: 8, padding: 0 }}
          onClick={() => setShowNoteField(true)}
        >
          + Add internal note
        </button>
      ) : (
        <div className="dq-note-row">
          <input
            className="dq-note-input"
            placeholder="Internal note (not sent to doctor)..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          />
          <button
            className="dq-note-btn"
            disabled={!noteText.trim()}
            onClick={() => { onAction(doctor.id, "note", { note: noteText }); setShowNoteField(false); setNoteText(""); }}
          >
            Save
          </button>
          <button style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }} onClick={() => setShowNoteField(false)}>
            <Ic.X />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DoctorVerificationQueuePage() {
  const { user } = useAuthStore();
  const [stats,    setStats]    = useState<QueueStats | null>(null);
  const [doctors,  setDoctors]  = useState<DoctorProfile[]>([]);
  const [paginate, setPaginate] = useState({ total: 0, page: 1, pages: 1 });
  const [tab,      setTab]      = useState<VerificationStatus>("pending");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const searchValue = searchParams.get("search") || undefined;

  const headers = useMemo(() => ({
    "x-user-id": user?.id || "",
    "x-user-role": user?.role || "",
  }), [user?.id, user?.role]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await api.get<QueueStats>("/api/v1/doctors/admin/queue/stats", { headers });
      setStats(s);
    } catch { /* non-critical */ }
  }, [headers]);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any>(`/api/v1/doctors/admin/queue?status=${tab}&page=${page}${searchValue ? `&search=${searchValue}` : ""}`, { headers });
      setDoctors(data.doctors);
      setPaginate(data.pagination);
    } catch { /* handle */ }
    finally { setLoading(false); }
  }, [tab, page, searchValue, headers]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleAction = async (id: string, action: string, extra?: Record<string, string>) => {
    setActioning((prev) => new Set(prev).add(id));
    try {
      await api.patch(`/api/v1/doctors/admin/queue/${id}`, { action, ...extra }, { headers } as Parameters<typeof api.patch>[2]);
      await Promise.all([fetchDoctors(), fetchStats()]);
    } catch (e) { console.error(e); }
    finally { setActioning((prev) => { const s = new Set(prev); s.delete(id); return s; }); }
  };

  const TABS: { key: VerificationStatus; label: string; color: string }[] = [
    { key: "pending",      label: "Pending",      color: "#ffb800" },
    { key: "under_review", label: "Under Review", color: "#3d9bff" },
    { key: "approved",     label: "Approved",     color: "#00e5a0" },
    { key: "rejected",     label: "Rejected",     color: "#ff5c5c" },
    { key: "suspended",    label: "Suspended",    color: "#888" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="dq">
        <div className="dq-eyebrow"><div className="dq-eyebrow-dot" /> Admin Panel</div>
        <h1 className="dq-title">Doctor <span>Verification Queue</span></h1>
        <p className="dq-sub">Review MDCN credentials, approve clinicians, and manage their access to Doctor Copilot.</p>

        {/* Stats */}
        {stats && (
          <div className="dq-stats">
            <div className="dq-stat s-pending">
              <div className="dq-stat-val">{stats.pending}</div>
              <div className="dq-stat-lbl">Pending</div>
              <div className="dq-stat-sub">{stats.last24h} today</div>
            </div>
            <div className="dq-stat s-review">
              <div className="dq-stat-val">{stats.under_review}</div>
              <div className="dq-stat-lbl">Under Review</div>
            </div>
            <div className="dq-stat s-approved">
              <div className="dq-stat-val">{stats.approved}</div>
              <div className="dq-stat-lbl">Approved</div>
            </div>
            <div className="dq-stat s-rejected">
              <div className="dq-stat-val">{stats.rejected}</div>
              <div className="dq-stat-lbl">Rejected</div>
            </div>
            <div className="dq-stat s-suspended">
              <div className="dq-stat-val">{stats.suspended}</div>
              <div className="dq-stat-lbl">Suspended</div>
              <div className="dq-stat-sub">{stats.total} total</div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="dq-toolbar">
          <div className="dq-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`dq-tab ${tab === t.key ? "active" : ""}`}
                style={{ "--tab-color": t.color } as React.CSSProperties}
                onClick={() => { setTab(t.key); setPage(1); }}
              >
                {t.label}
                {stats && <span className="dq-tab-ct">{stats[t.key]}</span>}
              </button>
            ))}
          </div>
          <input
            className="dq-search"
            placeholder="Search by name, MDCN, or specialty..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="dq-loader"><div className="dq-spinner" /></div>
        ) : doctors.length === 0 ? (
          <div className="dq-empty">
            <Ic.Check />
            <div style={{ marginTop: 16 }}>No {tab.replace("_", " ")} applications.</div>
          </div>
        ) : (
          <div className="dq-list">
            {doctors.map((d) => (
              <DoctorCard
                key={d.id}
                doctor={d}
                onAction={handleAction}
                onViewDetail={setDetailId}
                actioning={actioning.has(d.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {paginate.pages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "DM Mono" }}>
              {(page - 1) * 20 + 1}–{Math.min(page * 20, paginate.total)} of {paginate.total} doctors
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={{ width: 34, height: 34, borderRadius: 9, background: "var(--card-bg,rgba(255,255,255,.04))", border: "1px solid var(--border,rgba(255,255,255,.08))", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <Ic.ChevL />
              </button>
              <button
                style={{ width: 34, height: 34, borderRadius: 9, background: "var(--card-bg,rgba(255,255,255,.04))", border: "1px solid var(--border,rgba(255,255,255,.08))", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                disabled={page >= paginate.pages}
                onClick={() => setPage(p => p + 1)}
              >
                <Ic.ChevR />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailId && <DetailDrawer doctorId={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}
