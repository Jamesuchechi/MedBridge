"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
type ModerationStatus = "pending" | "flagged" | "approved" | "rejected";
type ModerationAction = "approve" | "reject" | "flag" | "unflag";

interface ModerationReport {
  id:                string;
  drugName:          string;
  price:             number;
  quantity?:         string;
  reportedBy?:       string;
  moderationStatus:  ModerationStatus;
  flagReason?:       string;
  autoFlagReason?:   string;
  isAutoFlagged?:    boolean;
  moderationNote?:   string;
  moderatedBy?:      string;
  moderatedAt?:      string;
  createdAt:         string;
  pharmacyName:      string;
  pharmacyAddress:   string;
  pharmacyState:     string;
  pharmacyId:        string;
}

interface ModerationStats {
  pending:    number;
  flagged:    number;
  approved:   number;
  rejected:   number;
  total:      number;
  autoFlagged: number;
  last24h:    number;
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

interface Pagination {
  total:   number;
  page:    number;
  perPage: number;
  pages:   number;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.mod { width:100%; max-width:1200px; padding:32px 0 80px; animation:mod-in .35s ease; }
@keyframes mod-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

.mod-eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'DM Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:#ff9f43; margin-bottom:10px; }
.mod-eyebrow-dot { width:5px;height:5px;border-radius:50%;background:#ff9f43;animation:dot 2s infinite; }
@keyframes dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.mod-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3vw,30px); font-weight:800; margin-bottom:6px; }
.mod-title span { color:#ff9f43; }
.mod-sub { font-size:14px; color:var(--text2); margin-bottom:28px; }

/* ── Stats bar ── */
.mod-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px; }
@media(max-width:700px){ .mod-stats { grid-template-columns:repeat(2,1fr); } }
.mod-stat { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:16px; padding:18px 20px; }
.mod-stat-val { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; line-height:1; margin-bottom:4px; }
.mod-stat-lbl { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; text-transform:uppercase; letter-spacing:.06em; }
.mod-stat-sub { font-size:10px; color:var(--text3); margin-top:4px; }
.stat-pending  .mod-stat-val { color:#ffb800; }
.stat-flagged  .mod-stat-val { color:#ff7c2b; }
.stat-approved .mod-stat-val { color:#00e5a0; }
.stat-rejected .mod-stat-val { color:#ff5c5c; }

/* ── Toolbar ── */
.mod-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
.mod-filter-tabs { display:flex; gap:4px; background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:12px; padding:4px; }
.mod-tab { padding:8px 16px; border-radius:8px; background:transparent; border:none; color:var(--text2); font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.mod-tab.active { background:var(--tab-color,#ffb800); color:#000; }
.mod-tab-count { background:rgba(255,255,255,.2); padding:1px 6px; border-radius:100px; font-size:10px; font-family:'DM Mono',monospace; }
.mod-search { flex:1; min-width:180px; padding:10px 14px; background:var(--card-bg,rgba(255,255,255,.04)); border:1.5px solid var(--border,rgba(255,255,255,.08)); border-radius:11px; color:var(--text); font-size:14px; outline:none; }
.mod-search:focus { border-color:rgba(255,159,67,.5); }
.mod-batch-btn { padding:10px 16px; background:rgba(0,229,160,.1); border:1.5px solid rgba(0,229,160,.25); border-radius:11px; color:var(--accent); font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all .2s; }
.mod-batch-btn:disabled { opacity:.4; cursor:not-allowed; }
.mod-batch-btn:not(:disabled):hover { background:rgba(0,229,160,.2); }

/* ── Table ── */
.mod-table-wrap { overflow-x:auto; border-radius:18px; border:1px solid var(--card-border,rgba(255,255,255,.08)); }
.mod-table { width:100%; border-collapse:collapse; }
.mod-table th { background:var(--card-bg,rgba(255,255,255,.04)); font-family:'DM Mono',monospace; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text3); padding:12px 16px; text-align:left; border-bottom:1px solid var(--border,rgba(255,255,255,.08)); white-space:nowrap; }
.mod-table th:first-child { width:36px; }
.mod-table td { padding:14px 16px; vertical-align:top; border-bottom:1px solid var(--border,rgba(255,255,255,.06)); font-size:13px; }
.mod-table tr:last-child td { border-bottom:none; }
.mod-table tr:hover td { background:rgba(255,255,255,.02); }
.mod-table tr.selected td { background:rgba(255,159,67,.04); }
.mod-checkbox { width:16px; height:16px; accent-color:var(--accent); cursor:pointer; }
.mod-drug-name { font-weight:700; margin-bottom:2px; }
.mod-drug-meta { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; }
.mod-pharmacy { font-weight:600; margin-bottom:2px; }
.mod-pharmacy-addr { font-size:11px; color:var(--text3); }
.mod-price-val { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:var(--text); }
.mod-price-qty { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; margin-top:2px; }

/* ── Status badges ── */
.mod-status { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-family:'DM Mono',monospace; font-weight:700; padding:3px 9px; border-radius:100px; text-transform:uppercase; }
.status-pending  { background:rgba(255,184,0,.1); color:#ffb800; border:1px solid rgba(255,184,0,.25); }
.status-flagged  { background:rgba(255,124,43,.1); color:#ff7c2b; border:1px solid rgba(255,124,43,.25); }
.status-approved { background:rgba(0,229,160,.1); color:#00e5a0; border:1px solid rgba(0,229,160,.2); }
.status-rejected { background:rgba(255,92,92,.1); color:#ff5c5c; border:1px solid rgba(255,92,92,.2); }
.mod-auto-flag { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-family:'DM Mono',monospace; padding:2px 7px; border-radius:100px; background:rgba(255,59,59,.1); color:#ff3b3b; border:1px solid rgba(255,59,59,.2); margin-top:4px; }
.mod-flag-reason { font-size:11px; color:var(--text2); margin-top:3px; }

/* ── Action buttons in row ── */
.mod-row-actions { display:flex; gap:6px; flex-wrap:wrap; }
.mod-action { padding:5px 11px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; border:1.5px solid; transition:all .15s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
.mod-action:hover { transform:translateY(-1px); }
.mod-action.approve { border-color:rgba(0,229,160,.4); background:rgba(0,229,160,.08); color:#00e5a0; }
.mod-action.reject  { border-color:rgba(255,92,92,.4);  background:rgba(255,92,92,.08);  color:#ff5c5c; }
.mod-action.flag    { border-color:rgba(255,124,43,.4); background:rgba(255,124,43,.08); color:#ff7c2b; }
.mod-action.unflag  { border-color:rgba(61,155,255,.4); background:rgba(61,155,255,.08); color:#3d9bff; }
.mod-action.audit   { border-color:rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text3); }
.mod-action:disabled { opacity:.4; cursor:not-allowed; transform:none; }

/* ── Note input inline ── */
.mod-note-wrap { margin-top:8px; display:flex; gap:6px; }
.mod-note-input { flex:1; padding:6px 10px; background:rgba(255,255,255,.04); border:1px solid var(--border,rgba(255,255,255,.08)); border-radius:8px; color:var(--text); font-size:12px; outline:none; }
.mod-note-input:focus { border-color:rgba(255,159,67,.5); }

/* ── Pagination ── */
.mod-pager { display:flex; align-items:center; justify-content:space-between; padding:16px 0; margin-top:4px; flex-wrap:wrap; gap:12px; }
.mod-pager-info { font-size:12px; color:var(--text3); font-family:'DM Mono',monospace; }
.mod-pager-btns { display:flex; gap:6px; }
.mod-pager-btn { width:34px; height:34px; border-radius:9px; background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--border,rgba(255,255,255,.08)); color:var(--text2); font-size:13px; font-weight:700; cursor:pointer; display:flex;align-items:center;justify-content:center; transition:all .2s; }
.mod-pager-btn.active { background:#ff9f43; color:#000; border-color:#ff9f43; }
.mod-pager-btn:disabled { opacity:.4; cursor:not-allowed; }

/* ── Audit modal ── */
.mod-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(8px); z-index:9999; display:flex;align-items:center;justify-content:center; padding:20px; }
.mod-modal { width:100%; max-width:560px; max-height:85vh; overflow-y:auto; background:#0c0e12; border:1px solid rgba(255,255,255,.1); border-radius:24px; padding:32px; position:relative; box-shadow:0 30px 60px rgba(0,0,0,.5); }
.mod-modal-close { position:absolute; top:18px; right:18px; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.06); border:none; color:var(--text2); display:flex;align-items:center;justify-content:center; cursor:pointer; }
.mod-modal h3 { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; margin-bottom:20px; }
.mod-audit-entry { display:flex; gap:12px; padding:14px 0; border-bottom:1px solid var(--border,rgba(255,255,255,.06)); }
.mod-audit-entry:last-child { border-bottom:none; }
.mod-audit-dot { width:8px; height:8px; border-radius:50%; margin-top:4px; flex-shrink:0; }
.mod-audit-action { font-weight:700; font-size:13px; text-transform:capitalize; }
.mod-audit-meta { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; margin-top:2px; }
.mod-audit-note { font-size:12px; color:var(--text2); margin-top:4px; font-style:italic; }

/* ── Empty / loader ── */
.mod-loader { display:flex;justify-content:center; padding:48px; }
.mod-spinner { width:32px;height:32px; border:3px solid var(--border,rgba(255,255,255,.08)); border-top-color:#ff9f43; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin{to{transform:rotate(360deg)}}
.mod-empty { text-align:center; padding:52px; color:var(--text3); font-size:14px; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  X:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ChevL:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevR:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>,
  Flag:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Warning: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const ACTION_COLORS: Record<string, string> = {
  approve: "#00e5a0",
  reject:  "#ff5c5c",
  flag:    "#ff7c2b",
  unflag:  "#3d9bff",
  note:    "#aaa",
};

// ─── Audit Trail Modal ────────────────────────────────────────────────────────
function AuditModal({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const [data, setData] = useState<{ report: ModerationReport; auditLog: AuditEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ report: ModerationReport; auditLog: AuditEntry[] }>(
      `/api/v1/pharmacies/admin/moderation/${reportId}/audit`,
      { headers: { "x-user-id": user?.id || "", "x-user-role": "SUPER_ADMIN" } }
    )
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportId, user?.id]);

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
        <button className="mod-modal-close" onClick={onClose}><Ic.X /></button>
        <h3>Audit Trail</h3>

        {loading ? (
          <div className="mod-loader"><div className="mod-spinner" /></div>
        ) : !data ? (
          <p style={{ color: "var(--text3)", fontSize: 13 }}>Failed to load audit trail.</p>
        ) : (
          <>
            {/* Report summary */}
            <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.03)", borderRadius: 12, marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{data.report.drugName} — ₦{data.report.price.toLocaleString()}</div>
              <div style={{ color: "var(--text3)", fontFamily: "DM Mono, monospace", fontSize: 11 }}>
                {data.report.pharmacyName} · {formatDate(data.report.createdAt)}
              </div>
            </div>

            {/* Audit entries */}
            {data.auditLog.length === 0 ? (
              <p style={{ color: "var(--text3)", fontSize: 13 }}>No moderation actions taken yet.</p>
            ) : (
              data.auditLog.map((entry) => (
                <div key={entry.id} className="mod-audit-entry">
                  <div
                    className="mod-audit-dot"
                    style={{ background: ACTION_COLORS[entry.action] || "#aaa" }}
                  />
                  <div>
                    <div className="mod-audit-action" style={{ color: ACTION_COLORS[entry.action] }}>
                      {entry.action}
                      {entry.previousStatus && entry.newStatus && (
                        <span style={{ fontWeight: 400, color: "var(--text3)", fontSize: 11 }}>
                          {" "}{entry.previousStatus} → {entry.newStatus}
                        </span>
                      )}
                    </div>
                    <div className="mod-audit-meta">
                      Admin: {entry.adminId.slice(0, 8)}... · {formatDate(entry.createdAt)}
                    </div>
                    {entry.note && <div className="mod-audit-note">"{entry.note}"</div>}
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

// ─── Main Moderation Page ─────────────────────────────────────────────────────
export default function ModerationPage() {
  const { user } = useAuthStore();
  const [stats,     setStats]     = useState<ModerationStats | null>(null);
  const [reports,   setReports]   = useState<ModerationReport[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusTab, setStatusTab] = useState<ModerationStatus>("pending");
  const [drugFilter, setDrugFilter] = useState("");
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [auditId,   setAuditId]   = useState<string | null>(null);
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  const headers = useMemo(() => ({
    "x-user-id":   user?.id || "",
    "x-user-role": "SUPER_ADMIN",
  }), [user?.id]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await api.get<ModerationStats>("/api/v1/pharmacies/admin/moderation/stats", { headers });
      setStats(s);
    } catch { /* non-critical */ }
  }, [headers]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({
        status: statusTab,
        page:   String(page),
        ...(drugFilter ? { drug: drugFilter } : {}),
      });
      const data = await api.get<{ reports: ModerationReport[]; pagination: Pagination }>(
        `/api/v1/pharmacies/admin/moderation?${params}`,
        { headers }
      );
      setReports(data.reports);
      setPagination(data.pagination);
    } catch { /* handle */ }
    finally { setLoading(false); }
  }, [statusTab, page, drugFilter, headers]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  const doAction = async (
    id: string,
    action: ModerationAction,
    opts?: { note?: string; flagReason?: string }
  ) => {
    setActioning((prev) => new Set(prev).add(id));
    try {
      await api.patch(`/api/v1/pharmacies/admin/moderation/${id}`, {
        action,
        note:       opts?.note,
        flagReason: opts?.flagReason,
      }, { headers } as Parameters<typeof api.patch>[2]);
      await Promise.all([fetchReports(), fetchStats()]);
    } catch (e) {
      console.error(e);
    } finally {
      setActioning((prev) => { const s = new Set(prev); s.delete(id); return s; });
      setShowNoteFor(null);
      setNoteValues((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const doBatchApprove = async () => {
    for (const id of selected) await doAction(id, "approve");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === reports.length) setSelected(new Set());
    else setSelected(new Set(reports.map((r) => r.id)));
  };

  const STATUS_TABS: { key: ModerationStatus; label: string; colorVar: string }[] = [
    { key: "pending",  label: "Pending",  colorVar: "#ffb800" },
    { key: "flagged",  label: "Flagged",  colorVar: "#ff7c2b" },
    { key: "approved", label: "Approved", colorVar: "#00e5a0" },
    { key: "rejected", label: "Rejected", colorVar: "#ff5c5c" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="mod">
        {/* Header */}
        <div className="mod-eyebrow"><div className="mod-eyebrow-dot" /> Admin Panel</div>
        <h1 className="mod-title">Price Report <span>Moderation</span></h1>
        <p className="mod-sub">
          Review, approve, and flag community-submitted drug price reports before they go live to users.
        </p>

        {/* Stats */}
        {stats && (
          <div className="mod-stats">
            <div className="mod-stat stat-pending">
              <div className="mod-stat-val">{stats.pending}</div>
              <div className="mod-stat-lbl">Pending Review</div>
              <div className="mod-stat-sub">{stats.last24h} submitted today</div>
            </div>
            <div className="mod-stat stat-flagged">
              <div className="mod-stat-val">{stats.flagged}</div>
              <div className="mod-stat-lbl">Flagged</div>
              <div className="mod-stat-sub">{stats.autoFlagged} auto-flagged</div>
            </div>
            <div className="mod-stat stat-approved">
              <div className="mod-stat-val">{stats.approved}</div>
              <div className="mod-stat-lbl">Approved</div>
              <div className="mod-stat-sub">Live on platform</div>
            </div>
            <div className="mod-stat stat-rejected">
              <div className="mod-stat-val">{stats.rejected}</div>
              <div className="mod-stat-lbl">Rejected</div>
              <div className="mod-stat-sub">{stats.total} total reports</div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="mod-toolbar">
          <div className="mod-filter-tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`mod-tab ${statusTab === tab.key ? "active" : ""}`}
                style={{ "--tab-color": tab.colorVar } as React.CSSProperties}
                onClick={() => { setStatusTab(tab.key); setPage(1); }}
              >
                {tab.label}
                {stats && (
                  <span className="mod-tab-count">
                    {stats[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <input
            className="mod-search"
            placeholder="Filter by drug name..."
            value={drugFilter}
            onChange={(e) => { setDrugFilter(e.target.value); setPage(1); }}
          />

          {statusTab === "pending" && (
            <button
              className="mod-batch-btn"
              disabled={selected.size === 0}
              onClick={doBatchApprove}
            >
              Approve {selected.size > 0 ? `(${selected.size})` : "Selected"}
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="mod-loader"><div className="mod-spinner" /></div>
        ) : reports.length === 0 ? (
          <div className="mod-empty">
            <Ic.Check />
            <div style={{ marginTop: 16 }}>No {statusTab} reports.</div>
          </div>
        ) : (
          <div className="mod-table-wrap">
            <table className="mod-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="mod-checkbox"
                      checked={selected.size === reports.length && reports.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Drug</th>
                  <th>Pharmacy</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const isActioning = actioning.has(r.id);
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? "selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          className="mod-checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td>
                        <div className="mod-drug-name">{r.drugName}</div>
                        {r.quantity && <div className="mod-drug-meta">{r.quantity}</div>}
                        {r.isAutoFlagged && (
                          <div className="mod-auto-flag">
                            <Ic.Warning /> auto-flagged: {r.autoFlagReason}
                          </div>
                        )}
                        {r.flagReason && !r.isAutoFlagged && (
                          <div className="mod-flag-reason">Flag: {r.flagReason}</div>
                        )}
                      </td>
                      <td>
                        <div className="mod-pharmacy">{r.pharmacyName}</div>
                        <div className="mod-pharmacy-addr">{r.pharmacyAddress}</div>
                        <div className="mod-drug-meta">{r.pharmacyState}</div>
                      </td>
                      <td>
                        <div className="mod-price-val">₦{r.price.toLocaleString()}</div>
                        {r.quantity && <div className="mod-price-qty">{r.quantity}</div>}
                      </td>
                      <td>
                        <span className={`mod-status status-${r.moderationStatus}`}>
                          {r.moderationStatus}
                        </span>
                        {r.moderationNote && (
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontStyle: "italic" }}>
                            "{r.moderationNote}"
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "DM Mono" }}>
                          {formatDate(r.createdAt)}
                        </div>
                        {r.reportedBy && (
                          <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "DM Mono", marginTop: 2 }}>
                            by {r.reportedBy.slice(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="mod-row-actions">
                          {r.moderationStatus !== "approved" && (
                            <button
                              className="mod-action approve"
                              disabled={isActioning}
                              onClick={() => doAction(r.id, "approve", { note: noteValues[r.id] })}
                            >
                              <Ic.Check /> Approve
                            </button>
                          )}
                          {r.moderationStatus !== "rejected" && (
                            <button
                              className="mod-action reject"
                              disabled={isActioning}
                              onClick={() => doAction(r.id, "reject", { note: noteValues[r.id] })}
                            >
                              <Ic.X /> Reject
                            </button>
                          )}
                          {r.moderationStatus !== "flagged" && r.moderationStatus !== "rejected" && (
                            <button
                              className="mod-action flag"
                              disabled={isActioning}
                              onClick={() => doAction(r.id, "flag", {
                                flagReason: "spam",
                                note: noteValues[r.id],
                              })}
                            >
                              <Ic.Flag /> Flag
                            </button>
                          )}
                          {r.moderationStatus === "flagged" && (
                            <button
                              className="mod-action unflag"
                              disabled={isActioning}
                              onClick={() => doAction(r.id, "unflag")}
                            >
                              Unflag
                            </button>
                          )}
                          <button
                            className="mod-action audit"
                            onClick={() => setAuditId(r.id)}
                          >
                            <Ic.History /> Audit
                          </button>
                        </div>

                        {/* Inline note toggle */}
                        {showNoteFor !== r.id ? (
                          <button
                            style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginTop: 6, padding: 0 }}
                            onClick={() => setShowNoteFor(r.id)}
                          >
                            + Add note
                          </button>
                        ) : (
                          <div className="mod-note-wrap">
                            <input
                              className="mod-note-input"
                              placeholder="Internal note (optional)..."
                              value={noteValues[r.id] || ""}
                              onChange={(e) => setNoteValues((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              autoFocus
                            />
                            <button
                              style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}
                              onClick={() => setShowNoteFor(null)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mod-pager">
            <span className="mod-pager-info">
              {(page - 1) * pagination.perPage + 1}–{Math.min(page * pagination.perPage, pagination.total)} of {pagination.total} reports
            </span>
            <div className="mod-pager-btns">
              <button
                className="mod-pager-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <Ic.ChevL />
              </button>
              {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`mod-pager-btn ${p === page ? "active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="mod-pager-btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
              >
                <Ic.ChevR />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit trail modal */}
      {auditId && (
        <AuditModal reportId={auditId} onClose={() => setAuditId(null)} />
      )}
    </>
  );
}