"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { track } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pharmacy {
  id?: string;
  osmId?: string;
  name: string;
  address: string;
  state: string;
  lga?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: string | null;
  isVerified?: boolean;
  trustScore?: number;
  reportCount?: number;
}

interface PharmacyDetail extends Pharmacy {
  availability: AvailabilityReport[];
  prices: PriceReport[];
}

interface AvailabilityReport {
  id: string;
  drugName: string;
  isInStock: boolean;
  createdAt: string;
  expiresAt: string;
}

interface PriceReport {
  id: string;
  drugName: string;
  price: number;
  quantity?: string;
  createdAt: string;
}

type ReportModalType = "availability" | "price";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.crx { width:100%; max-width:1100px; padding:32px 0 80px; animation:crx-in .35s ease; }
@keyframes crx-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

.crx-eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'DM Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
.crx-eyebrow-dot { width:5px;height:5px;border-radius:50%;background:var(--accent);animation:dot 2s infinite; }
@keyframes dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.crx-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3vw,32px); font-weight:800; margin-bottom:6px; line-height:1.1; }
.crx-title span { background:linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.crx-sub { font-size:14px; color:var(--text2); margin-bottom:24px; }

/* ── Search bar ── */
.crx-search-bar { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.crx-input-wrap { position:relative; flex:1; min-width:220px; }
.crx-input-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--text3); display:flex; pointer-events:none; }
.crx-input-icon svg { width:17px; height:17px; }
.crx-input { width:100%; padding:13px 13px 13px 40px; background:var(--card-bg,rgba(255,255,255,.04)); border:1.5px solid var(--border,rgba(255,255,255,.08)); border-radius:14px; color:var(--text); font-size:14px; outline:none; transition:all .2s; }
.crx-input:focus { border-color:rgba(0,229,160,.5); box-shadow:0 0 0 3px rgba(0,229,160,.08); }
.crx-locate-btn { padding:0 18px; height:50px; background:rgba(0,229,160,.1); border:1.5px solid rgba(0,229,160,.25); border-radius:14px; color:var(--accent); font-size:13px; font-weight:700; cursor:pointer; display:flex;align-items:center;gap:8px; white-space:nowrap; transition:all .2s; }
.crx-locate-btn:hover { background:rgba(0,229,160,.2); }
.crx-locate-btn:disabled { opacity:.5; cursor:not-allowed; }

/* ── OSM attribution (required by OSM ToS) ── */
.crx-attribution { font-size:10px; color:var(--text3); margin-bottom:18px; }
.crx-attribution a { color:var(--accent2,#3d9bff); }

/* ── Info banner ── */
.crx-banner { display:flex; gap:10px; align-items:flex-start; padding:12px 16px; background:rgba(61,155,255,.06); border:1px solid rgba(61,155,255,.15); border-radius:12px; margin-bottom:20px; font-size:13px; color:var(--text2); }
.crx-banner svg { width:16px; height:16px; flex-shrink:0; margin-top:1px; color:var(--accent2,#3d9bff); }

/* ── Grid ── */
.crx-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:14px; }
.crx-card { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:18px; padding:20px; cursor:pointer; transition:all .22s; position:relative; }
.crx-card:hover { border-color:rgba(0,229,160,.35); transform:translateY(-2px); box-shadow:0 10px 32px rgba(0,0,0,.25); }
.crx-card-verified { position:absolute; top:14px; right:14px; font-size:9px; font-family:'DM Mono',monospace; font-weight:700; padding:2px 7px; border-radius:100px; background:rgba(0,229,160,.1); color:var(--accent); border:1px solid rgba(0,229,160,.25); }
.crx-card-name { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; margin-bottom:6px; padding-right:50px; }
.crx-card-addr { font-size:12px; color:var(--text2); margin-bottom:10px; display:flex; align-items:flex-start; gap:5px; line-height:1.5; }
.crx-card-addr svg { width:12px; height:12px; flex-shrink:0; margin-top:2px; }
.crx-card-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.crx-trust { display:flex; align-items:center; gap:5px; font-size:11px; font-family:'DM Mono',monospace; color:var(--text3); }
.crx-trust-bar { width:40px; height:4px; border-radius:2px; background:var(--border,rgba(255,255,255,.08)); overflow:hidden; }
.crx-trust-fill { height:100%; border-radius:2px; background:var(--accent); }
.crx-reports-badge { font-size:10px; color:var(--text3); font-family:'DM Mono',monospace; }
.crx-card-phone { font-size:11px; color:var(--accent2,#3d9bff); margin-top:6px; }
.crx-directions-link { font-size:11px; color:var(--accent2,#3d9bff); font-weight:700; display:flex;align-items:center;gap:3px; text-decoration:none; margin-left:auto; }
.crx-directions-link:hover { text-decoration:underline; }

/* ── Detail view ── */
.crx-detail { animation:crx-in .3s ease; }
.crx-back { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--text2); background:none; border:none; cursor:pointer; padding:0; margin-bottom:24px; transition:color .2s; }
.crx-back:hover { color:var(--accent); }
.crx-dh { display:flex; align-items:flex-start; gap:16px; margin-bottom:24px; }
.crx-dh-icon { width:52px;height:52px; border-radius:14px; background:rgba(0,229,160,.1); border:1px solid rgba(0,229,160,.2); display:flex;align-items:center;justify-content:center; color:var(--accent); flex-shrink:0; }
.crx-dh-icon svg { width:24px;height:24px; }
.crx-dn { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; }
.crx-da { font-size:13px; color:var(--text2); margin-top:4px; }
.crx-hours { font-size:12px; margin-top:4px; display:flex; align-items:center; gap:5px; }
.crx-hours.open  { color:var(--accent); }
.crx-hours.unknown { color:var(--text3); }

.crx-actions { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
.crx-action-btn { display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:11px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .2s; text-decoration:none; }
.crx-btn-primary { background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#000; }
.crx-btn-outline-green { background:rgba(0,229,160,.08); border:1.5px solid rgba(0,229,160,.25); color:var(--accent); }
.crx-btn-outline-blue  { background:rgba(61,155,255,.08); border:1.5px solid rgba(61,155,255,.25); color:var(--accent2,#3d9bff); }
.crx-action-btn:hover { transform:translateY(-1px); }

.crx-section { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:18px; padding:20px; margin-bottom:16px; }
.crx-st { font-family:'DM Mono',monospace; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--accent); margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; }
.crx-st-count { background:rgba(0,229,160,.1); border:1px solid rgba(0,229,160,.2); padding:1px 8px; border-radius:100px; font-size:9px; }

.crx-avail-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border,rgba(255,255,255,.06)); }
.crx-avail-row:last-child { border-bottom:none; }
.crx-avail-name { font-size:14px; font-weight:600; }
.crx-avail-time { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; margin-top:2px; }
.crx-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-family:'DM Mono',monospace; font-weight:700; padding:3px 9px; border-radius:100px; }
.crx-badge-in   { background:rgba(0,229,160,.1); color:var(--accent); border:1px solid rgba(0,229,160,.2); }
.crx-badge-out  { background:rgba(255,92,92,.1); color:#ff5c5c; border:1px solid rgba(255,92,92,.2); }
.crx-price-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border,rgba(255,255,255,.06)); }
.crx-price-row:last-child { border-bottom:none; }
.crx-price-drug { font-size:14px; font-weight:600; }
.crx-price-qty  { font-size:11px; color:var(--text3); font-family:'DM Mono',monospace; margin-top:2px; }
.crx-price-val  { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:var(--accent); }
.crx-empty-note { font-size:13px; color:var(--text3); padding:8px 0; }

/* ── OSM opening_hours parsing indicator ── */
.crx-oh-row { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; border-bottom:1px solid var(--border,rgba(255,255,255,.05)); }
.crx-oh-row:last-child { border-bottom:none; }
.crx-oh-day { color:var(--text3); }

/* ── Report modal ── */
.crx-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(8px); z-index:9999; display:flex;align-items:center;justify-content:center; padding:20px; animation:crx-fade .2s ease; }
@keyframes crx-fade { from{opacity:0} to{opacity:1} }
.crx-modal { width:100%; max-width:460px; background:#0c0e12; border:1px solid rgba(255,255,255,.1); border-radius:24px; padding:32px; position:relative; box-shadow:0 30px 60px rgba(0,0,0,.5); }
.crx-modal-close { position:absolute; top:18px; right:18px; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.06); border:none; color:var(--text2); display:flex;align-items:center;justify-content:center; cursor:pointer; }
.crx-modal h3 { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; margin-bottom:4px; }
.crx-modal-sub { font-size:12px; color:var(--text3); margin-bottom:20px; }
.crx-field { margin-bottom:14px; }
.crx-label { font-size:12px; font-weight:700; color:var(--text2); display:block; margin-bottom:6px; }
.crx-field-input { width:100%; padding:10px 14px; background:rgba(255,255,255,.04); border:1.5px solid var(--border,rgba(255,255,255,.08)); border-radius:11px; color:var(--text); font-size:14px; outline:none; transition:all .2s; }
.crx-field-input:focus { border-color:rgba(0,229,160,.5); }
.crx-toggle-row { display:flex; gap:8px; }
.crx-toggle { flex:1; padding:10px; border:1.5px solid var(--border,rgba(255,255,255,.08)); border-radius:11px; background:var(--glass,rgba(255,255,255,.03)); color:var(--text2); font-size:13px; font-weight:700; cursor:pointer; transition:all .2s; display:flex;align-items:center;justify-content:center;gap:6px; }
.crx-toggle.yes { border-color:rgba(0,229,160,.5); background:rgba(0,229,160,.1); color:var(--accent); }
.crx-toggle.no  { border-color:rgba(255,92,92,.5); background:rgba(255,92,92,.1); color:#ff5c5c; }
.crx-submit { width:100%; padding:14px; background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#000; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; margin-top:18px; transition:all .2s; }
.crx-submit:hover { transform:translateY(-2px); }
.crx-submit:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.crx-success-icon { width:56px; height:56px; border-radius:50%; background:rgba(0,229,160,.1); color:var(--accent); display:flex;align-items:center;justify-content:center; margin:0 auto 16px; }
.crx-success-icon svg { width:28px; height:28px; }

/* ── Loading / Empty ── */
.crx-loader { display:flex; justify-content:center; padding:52px; }
.crx-spinner { width:32px; height:32px; border:3px solid var(--border,rgba(255,255,255,.08)); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
.crx-empty { text-align:center; padding:64px 24px; color:var(--text3); }
.crx-empty-icon { font-size:48px; margin-bottom:16px; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Search:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Pin:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Locate:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>,
  Back:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  X:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Phone:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.3A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Info:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Ext:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Clock:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Shield:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

// ─── Relative time helper ─────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── OSM opening_hours basic parser ──────────────────────────────────────────
function isOpenNow(openingHoursStr: string | null): boolean | null {
  if (!openingHoursStr) return null;
  // Very basic check for "24/7"
  if (openingHoursStr.includes("24/7")) return true;
  // For proper parsing, use opening_hours.js library in production
  return null; // unknown
}

// ─── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({
  pharmacy,
  type,
  onClose,
  onSuccess,
}: {
  pharmacy: Pharmacy;
  type: ReportModalType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const [drugName, setDrugName] = useState("");
  const [inStock,  setInStock]  = useState<boolean | null>(null);
  const [price,    setPrice]    = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const pharmacyKey = pharmacy.osmId || pharmacy.id || "";
  const headers: Record<string, string> = {};
  if (user?.id) headers["x-user-id"] = user.id;

  const submit = async () => {
    if (!drugName.trim()) return;
    setLoading(true);
    try {
      if (type === "availability") {
        if (inStock === null) { setLoading(false); return; }
        await api.post("/api/v1/pharmacies/report-availability", {
          pharmacyId: pharmacyKey,
          drugName:   drugName.trim(),
          isInStock:  inStock,
        }, { headers });
        track.drugAvailabilityReported({ pharmacyName: pharmacy.name, drugName: drugName.trim(), isInStock: inStock });
      } else {
        const p = parseInt(price.replace(/\D/g, ""), 10);
        if (!p) { setLoading(false); return; }
        await api.post("/api/v1/pharmacies/report-price", {
          pharmacyId: pharmacyKey,
          drugName:   drugName.trim(),
          price:      p,
          quantity:   quantity.trim() || undefined,
        }, { headers });
        track.drugPriceReported({ pharmacyName: pharmacy.name, drugName: drugName.trim(), price: p });
      }
      setDone(true);
      setTimeout(onSuccess, 1400);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crx-overlay" onClick={onClose}>
      <div className="crx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="crx-modal-close" onClick={onClose}><Ic.X /></button>

        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div className="crx-success-icon"><Ic.Check /></div>
            <h3 style={{ marginBottom: 8 }}>Thank you!</h3>
            <p style={{ color: "var(--text2)", fontSize: 13 }}>Your report helps the whole community find medicines.</p>
          </div>
        ) : (
          <>
            <h3>{type === "availability" ? "Report Drug Availability" : "Report Drug Price"}</h3>
            <p className="crx-modal-sub">{pharmacy.name} · {pharmacy.address}</p>

            <div className="crx-field">
              <label className="crx-label">Drug name *</label>
              <input
                className="crx-field-input"
                placeholder="e.g. Paracetamol, Coartem, Amoxicillin..."
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                autoFocus
              />
            </div>

            {type === "availability" ? (
              <div className="crx-field">
                <label className="crx-label">Is it in stock? *</label>
                <div className="crx-toggle-row">
                  <button className={`crx-toggle ${inStock === true ? "yes" : ""}`} onClick={() => setInStock(true)}>
                    <Ic.Check /> In Stock
                  </button>
                  <button className={`crx-toggle ${inStock === false ? "no" : ""}`} onClick={() => setInStock(false)}>
                    <Ic.X /> Out of Stock
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="crx-field">
                  <label className="crx-label">Price in Naira (₦) *</label>
                  <input
                    className="crx-field-input"
                    type="number"
                    placeholder="e.g. 2500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="crx-field">
                  <label className="crx-label">Pack size / Quantity (optional)</label>
                  <input
                    className="crx-field-input"
                    placeholder="e.g. 20 tablets, 1 bottle 200ml, blister pack"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              className="crx-submit"
              onClick={submit}
              disabled={
                loading ||
                !drugName.trim() ||
                (type === "availability" && inStock === null) ||
                (type === "price" && !price.trim())
              }
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Pharmacy Detail ──────────────────────────────────────────────────────────
function PharmacyDetailView({
  pharmacy,
  onBack,
}: {
  pharmacy: Pharmacy;
  onBack: () => void;
}) {
  const [detail,  setDetail]  = useState<PharmacyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<ReportModalType | null>(null);

  const pharmacyKey = pharmacy.id || pharmacy.osmId || "";

  useEffect(() => {
    track.pharmacyDetailViewed({ pharmacyId: pharmacyKey, pharmacyName: pharmacy.name });

    const isUUID = /^[0-9a-f-]{36}$/.test(pharmacyKey);
    if (!isUUID && !pharmacy.osmId) {
      setDetail({ ...pharmacy, availability: [], prices: [] });
      setLoading(false);
      return;
    }

    api.get<PharmacyDetail>(`/api/v1/pharmacies/${pharmacyKey}`)
      .then(setDetail)
      .catch(() => setDetail({ ...pharmacy, availability: [], prices: [] }))
      .finally(() => setLoading(false));
  }, [pharmacyKey, pharmacy]);

  const mapsUrl = pharmacy.lat && pharmacy.lng
    ? `https://www.openstreetmap.org/directions?from=&to=${pharmacy.lat},${pharmacy.lng}`
    : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pharmacy.name + " " + pharmacy.address)}`;

  const openStatus = isOpenNow(pharmacy.openingHours || null);

  const refreshDetail = () => {
    setLoading(true);
    api.get<PharmacyDetail>(`/api/v1/pharmacies/${pharmacyKey}`)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  return (
    <div className="crx-detail">
      <button className="crx-back" onClick={onBack}><Ic.Back /> Back to pharmacies</button>

      <div className="crx-dh">
        <div className="crx-dh-icon"><Ic.Pin /></div>
        <div style={{ flex: 1 }}>
          <div className="crx-dn">
            {pharmacy.name}
            {pharmacy.isVerified && (
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent)", fontFamily: "DM Mono, monospace" }}>
                ✓ Verified
              </span>
            )}
          </div>
          <div className="crx-da">{pharmacy.address}</div>
          {pharmacy.state && (
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{pharmacy.state}</div>
          )}
          <div className={`crx-hours ${openStatus === true ? "open" : "unknown"}`}>
            <Ic.Clock />
            {openStatus === true ? "Open 24/7" :
             pharmacy.openingHours ? pharmacy.openingHours :
             "Hours not available"}
          </div>
          {pharmacy.phone && (
            <div className="crx-card-phone" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <Ic.Phone /> <a href={`tel:${pharmacy.phone}`} style={{ color: "inherit" }}>{pharmacy.phone}</a>
            </div>
          )}
        </div>
        {detail && (
          <div className="crx-trust" style={{ flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "DM Mono" }}>TRUST SCORE</div>
            <div className="crx-trust-bar" style={{ width: 60 }}>
              <div className="crx-trust-fill" style={{ width: `${detail.trustScore || 50}%` }} />
            </div>
            <div style={{ fontSize: 11, fontFamily: "DM Mono", color: "var(--text2)" }}>
              {detail.trustScore ?? 50}/100
            </div>
          </div>
        )}
      </div>

      <div className="crx-actions">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="crx-action-btn crx-btn-primary"
          onClick={() => track.pharmacyDirectionsTapped({ pharmacyId: pharmacyKey, pharmacyName: pharmacy.name })}
        >
          <Ic.Ext /> Get Directions (OSM)
        </a>
        <button className="crx-action-btn crx-btn-outline-green" onClick={() => setModal("availability")}>
          Report Stock
        </button>
        <button className="crx-action-btn crx-btn-outline-blue" onClick={() => setModal("price")}>
          Report Price
        </button>
      </div>

      {loading ? (
        <div className="crx-loader"><div className="crx-spinner" /></div>
      ) : (
        <>
          {/* Availability */}
          <div className="crx-section">
            <div className="crx-st">
              Drug Availability
              <span className="crx-st-count">{detail?.availability.length ?? 0} reports · last 48h</span>
            </div>
            {detail?.availability.length ? (
              detail.availability.map((r) => (
                <div key={r.id} className="crx-avail-row">
                  <div>
                    <div className="crx-avail-name">{r.drugName}</div>
                    <div className="crx-avail-time">Reported {timeAgo(r.createdAt)}</div>
                  </div>
                  <span className={`crx-badge ${r.isInStock ? "crx-badge-in" : "crx-badge-out"}`}>
                    {r.isInStock ? <><Ic.Check /> In Stock</> : <><Ic.X /> Out of Stock</>}
                  </span>
                </div>
              ))
            ) : (
              <p className="crx-empty-note">No availability reports yet. Help the community by reporting!</p>
            )}
          </div>

          {/* Prices */}
          <div className="crx-section">
            <div className="crx-st">
              Community Drug Prices
              <span className="crx-st-count">{detail?.prices.length ?? 0} reports · last 30 days</span>
            </div>
            {detail?.prices.length ? (
              detail.prices.map((p) => (
                <div key={p.id} className="crx-price-row">
                  <div>
                    <div className="crx-price-drug">{p.drugName}</div>
                    {p.quantity && <div className="crx-price-qty">{p.quantity}</div>}
                    <div className="crx-avail-time">Reported {timeAgo(p.createdAt)}</div>
                  </div>
                  <div className="crx-price-val">₦{p.price.toLocaleString()}</div>
                </div>
              ))
            ) : (
              <p className="crx-empty-note">No price reports yet. Report the price you saw!</p>
            )}
          </div>

          {/* Website */}
          {pharmacy.website && (
            <div className="crx-section">
              <div className="crx-st">Contact</div>
              <a
                href={pharmacy.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent2)", fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}
              >
                <Ic.Ext /> {pharmacy.website}
              </a>
            </div>
          )}

          {/* OSM credit */}
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
            Location data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent2)" }}>OpenStreetMap contributors</a>
          </p>
        </>
      )}

      {modal && (
        <ReportModal
          pharmacy={pharmacy}
          type={modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); refreshDetail(); }}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PharmaciesPage() {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<Pharmacy[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [located,  setLocated]  = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Pharmacy | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, lat?: number, lng?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim())  params.set("q", q.trim());
      if (lat != null) params.set("lat", String(lat));
      if (lng != null) params.set("lng", String(lng));

      const data = await api.get<{ pharmacies: Pharmacy[]; total: number; source: string }>(
        `/api/v1/pharmacies/search?${params}`
      );
      setResults(data.pharmacies);
      track.pharmacySearched({
        query: q || undefined,
        usedGeolocation: !!lat,
        resultCount: data.total,
        source: data.source as "overpass" | "nominatim" | "database" | "google_places",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce text search
  useEffect(() => {
    if (!query.trim()) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query, coords?.lat, coords?.lng), 500);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, coords, doSearch]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocated(true);
        setLocating(false);
        doSearch("", c.latitude, c.longitude);
      },
      () => {
        setLocating(false);
        // Fallback: geocode "Lagos Nigeria"
        api.get<{ lat: number; lng: number }>("/api/v1/pharmacies/geocode?q=Lagos+Nigeria")
          .then(({ lat, lng }) => doSearch("", lat, lng))
          .catch(() => doSearch("pharmacy Lagos"));
      },
      { timeout: 8000 }
    );
  };

  if (selected) {
    return (
      <>
        <style>{CSS}</style>
        <div className="crx">
          <PharmacyDetailView pharmacy={selected} onBack={() => setSelected(null)} />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="crx">
        {/* Header */}
        <div className="crx-eyebrow"><div className="crx-eyebrow-dot" /> CommunityRx</div>
        <h1 className="crx-title">Find a <span>Pharmacy</span></h1>
        <p className="crx-sub">
          Search pharmacies near you, check what drugs are in stock, and compare community-reported prices.
          Powered by OpenStreetMap — free, open, no API key needed.
        </p>

        {/* Search */}
        <div className="crx-search-bar">
          <div className="crx-input-wrap">
            <span className="crx-input-icon"><Ic.Search /></span>
            <input
              className="crx-input"
              placeholder="Search by area, LGA, or pharmacy name — e.g. 'Ikeja Lagos', 'Medplus'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button className="crx-locate-btn" onClick={handleLocate} disabled={locating}>
            <Ic.Locate />
            {locating ? "Locating..." : located ? "Near me ✓" : "Use my location"}
          </button>
        </div>

        {/* OSM attribution */}
        <p className="crx-attribution">
          Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.
          Pharmacy locations sourced from OSM — help improve them at <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">openstreetmap.org</a>.
        </p>

        {/* Info */}
        <div className="crx-banner">
          <Ic.Info />
          <span>Click any pharmacy to report drug availability or prices. Your reports help thousands of Nigerians find medicines at fair prices.</span>
        </div>

        {/* Results */}
        {loading && <div className="crx-loader"><div className="crx-spinner" /></div>}

        {!loading && results.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "DM Mono, monospace", marginBottom: 14 }}>
              {results.length} pharmacies found
            </div>
            <div className="crx-grid">
              {results.map((p, i) => {
                const key = p.osmId || p.id || String(i);
                return (
                  <div key={key} className="crx-card" onClick={() => setSelected(p)}>
                    {p.isVerified && <span className="crx-card-verified"><Ic.Shield /> Verified</span>}
                    <div className="crx-card-name">{p.name}</div>
                    <div className="crx-card-addr"><Ic.Pin />{p.address}</div>
                    {p.phone && (
                      <div className="crx-card-phone" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <Ic.Phone /> {p.phone}
                      </div>
                    )}
                    <div className="crx-card-meta">
                      {p.trustScore !== undefined && (
                        <div className="crx-trust">
                          <div className="crx-trust-bar">
                            <div className="crx-trust-fill" style={{ width: `${p.trustScore}%` }} />
                          </div>
                          {p.trustScore}%
                        </div>
                      )}
                      {p.reportCount !== undefined && p.reportCount > 0 && (
                        <span className="crx-reports-badge">{p.reportCount} reports</span>
                      )}
                      <a
                        href={p.lat && p.lng
                          ? `https://www.openstreetmap.org/directions?from=&to=${p.lat},${p.lng}`
                          : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(p.name)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crx-directions-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Directions <Ic.Ext />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!loading && !results.length && (
          <div className="crx-empty">
            <div className="crx-empty-icon">💊</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Find pharmacies near you</div>
            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              Type an area, LGA, or pharmacy name above — or tap <strong>Use my location</strong> to find pharmacies nearby.
            </div>
          </div>
        )}
      </div>
    </>
  );
}