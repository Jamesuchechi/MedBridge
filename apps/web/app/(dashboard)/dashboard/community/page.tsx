"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

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

interface AvailabilityReport {
  id: string;
  drugName: string;
  isInStock: boolean;
  createdAt: string;
  expiresAt: string;
}

interface PharmacyDetail extends Pharmacy {
  availability: AvailabilityReport[];
  prices: PriceReport[];
}

interface PriceReport {
  id: string;
  drugName: string;
  price: number;
  quantity?: string;
  createdAt: string;
}

// ─── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.crx { width:100%; max-width:1100px; padding:32px 0 80px; animation:crx-in .35s ease; }
@keyframes crx-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

.crx-eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'DM Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
.crx-eyebrow-dot { width:5px;height:5px;border-radius:50%;background:var(--accent);animation:dot 2s infinite; }
@keyframes dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.crx-title { font-family:'Syne',sans-serif; font-size:clamp(22px,3vw,32px); font-weight:800; margin-bottom:6px; line-height:1.1; }
.crx-title span { background:linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.crx-subtitle { font-family:'DM Sans',sans-serif; font-size:14px; color:rgba(255,255,255,0.5); margin-bottom:28px; }

.crx-search { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; }
.crx-input-wrap { flex:1; min-width:240px; position:relative; }
.crx-input { width:100%; padding:14px 16px; padding-left:42px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; color:#fff; font-family:'DM Sans',sans-serif; font-size:14px; outline:none; transition:all .2s; }
.crx-input:focus { border-color:var(--accent); background:rgba(255,255,255,0.06); }
.crx-input::placeholder { color:rgba(255,255,255,0.3); }
.crx-input-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.3); pointer-events:none; }

.crx-select { padding:14px 16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; color:#fff; font-family:'DM Sans',sans-serif; font-size:14px; outline:none; cursor:pointer; min-width:140px; }
.crx-select:focus { border-color:var(--accent); }
.crx-select option { background:#0d1220; color:#fff; }

.crx-btn { padding:14px 24px; background:linear-gradient(135deg,var(--accent),#00c896); border:none; border-radius:10px; color:#000; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:8px; }
.crx-btn:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(0,229,160,0.3); }
.crx-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

.crx-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
.crx-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:20px; transition:all .2s; cursor:pointer; }
.crx-card:hover { border-color:var(--accent); background:rgba(255,255,255,0.05); transform:translateY(-2px); }
.crx-card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
.crx-card-name { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:#fff; }
.crx-card-verified { font-size:9px; font-family:'DM Mono',monospace; padding:3px 6px; background:rgba(0,229,160,0.15); color:var(--accent); border-radius:4px; letter-spacing:.05em; }
.crx-card-address { font-family:'DM Sans',sans-serif; font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
.crx-card-meta { display:flex; gap:12px; font-family:'DM Mono',monospace; font-size:11px; color:rgba(255,255,255,0.4); }
.crx-card-meta span { display:flex; align-items:center; gap:4px; }

.crx-loading { display:flex; justify-content:center; padding:60px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; }
.crx-empty { text-align:center; padding:60px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; }
.crx-empty-icon { font-size:48px; margin-bottom:16px; opacity:0.3; }

.crx-detail { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; margin-top:24px; }
.crx-detail-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
.crx-detail-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; }
.crx-detail-close { background:none; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-size:24px; padding:4px; }
.crx-detail-close:hover { color:#fff; }

.crx-availability { margin-top:16px; }
.crx-availability-title { font-family:'DM Mono',monospace; font-size:11px; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:.1em; margin-bottom:12px; }
.crx-availability-list { display:flex; flex-direction:column; gap:8px; }
.crx-availability-item { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.04); border-radius:8px; }
.crx-availability-drug { font-family:'DM Sans',sans-serif; font-size:14px; }
.crx-availability-status { font-family:'DM Mono',monospace; font-size:11px; padding:4px 8px; border-radius:4px; }
.crx-availability-status.in-stock { background:rgba(0,229,160,0.15); color:var(--accent); }
.crx-availability-status.out-of-stock { background:rgba(255,91,91,0.15); color:#ff5b5b; }

.crx-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
.crx-modal { background:#0d1220; border:1px solid rgba(255,255,255,0.1); border-radius:16px; max-width:500px; width:100%; max-height:90vh; overflow-y:auto; }
.crx-modal-header { padding:20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; }
.crx-modal-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; }
.crx-modal-body { padding:20px; }
.crx-modal-footer { padding:20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:flex-end; gap:10px; }

.form-group { margin-bottom:16px; }
.form-label { display:block; font-family:'DM Mono',monospace; font-size:11px; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; }
.form-input { width:100%; padding:12px 14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-family:'DM Sans',sans-serif; font-size:14px; outline:none; }
.form-input:focus { border-color:var(--accent); }
.form-select { width:100%; padding:12px 14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-family:'DM Sans',sans-serif; font-size:14px; outline:none; cursor:pointer; }
.form-select option { background:#0d1220; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Phone: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Shield: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Package: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa",
  "Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger",
  "Ogun","Ondo","Osun","Oyo","Plateau","Sokoto","Taraba","Yobe","Zamfara",
  "FCT"
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyDetail | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ drugName: "", isInStock: true });

  const searchPharmacies = useCallback(async () => {
    if (!searchQuery.trim() && !selectedState) {
      setPharmacies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedState) params.set("state", selectedState);
      params.set("radius", "10000");

      const res = await api.get<{ pharmacies: Pharmacy[] }>(`/api/v1/pharmacies/search?${params}`);
      setPharmacies(res.pharmacies || []);
    } catch (err) {
      console.error("Failed to search pharmacies:", err);
      toast.error("Failed to find pharmacies");
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedState]);

  useEffect(() => {
    searchPharmacies();
  }, [searchPharmacies]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchPharmacies();
  };

  const openPharmacyDetail = async (pharmacy: Pharmacy) => {
    try {
      const res = await api.get<PharmacyDetail>(`/api/v1/pharmacies/${pharmacy.osmId || pharmacy.id}`);
      setSelectedPharmacy(res || { ...pharmacy, availability: [], prices: [] });
    } catch {
      setSelectedPharmacy({ ...pharmacy, availability: [], prices: [] });
    }
  };

  const submitAvailabilityReport = async () => {
    if (!selectedPharmacy?.id && !selectedPharmacy?.osmId) {
      toast.error("Please select a pharmacy first");
      return;
    }
    try {
      await api.post("/api/v1/pharmacies/report-availability", {
        pharmacyId: selectedPharmacy.osmId || selectedPharmacy.id,
        drugName: reportForm.drugName,
        isInStock: reportForm.isInStock,
      });
      toast.success("Report submitted! Thanks for helping the community.");
      setShowReportModal(false);
      setReportForm({ drugName: "", isInStock: true });
    } catch {
      toast.error("Failed to submit report");
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="crx">
        <div className="crx-eyebrow">
          <span className="crx-eyebrow-dot" />
          Community
        </div>
        <h1 className="crx-title">
          Find <span>Pharmacies</span> Near You
        </h1>
        <p className="crx-subtitle">
          Discover nearby pharmacies and check drug availability in your community
        </p>

        <div className="crx-search">
          <div className="crx-input-wrap">
            <span className="crx-input-icon"><Icons.Search /></span>
            <input
              type="text"
              className="crx-input"
              placeholder="Search pharmacy name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <select
            className="crx-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="">All States</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <button className="crx-btn" onClick={searchPharmacies} disabled={loading}>
            <Icons.Search /> Search
          </button>
        </div>

        {loading ? (
          <div className="crx-loading">Searching pharmacies...</div>
        ) : pharmacies.length === 0 ? (
          <div className="crx-empty">
            <div className="crx-empty-icon">🏪</div>
            <p>No pharmacies found in this area</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Try a different search or state</p>
          </div>
        ) : (
          <div className="crx-grid">
            {pharmacies.map((pharmacy, idx) => (
              <div
                key={pharmacy.osmId || pharmacy.id || idx}
                className="crx-card"
                onClick={() => openPharmacyDetail(pharmacy)}
              >
                <div className="crx-card-header">
                  <span className="crx-card-name">{pharmacy.name}</span>
                  {pharmacy.isVerified && <span className="crx-card-verified">VERIFIED</span>}
                </div>
                <div className="crx-card-address">
                  <Icons.MapPin /> {pharmacy.address}
                </div>
                <div className="crx-card-meta">
                  {pharmacy.phone && (
                    <span><Icons.Phone /> {pharmacy.phone}</span>
                  )}
                  {pharmacy.openingHours && (
                    <span><Icons.Clock /> {pharmacy.openingHours}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPharmacy && (
          <div className="crx-detail">
            <div className="crx-detail-header">
              <h2 className="crx-detail-title">{selectedPharmacy.name}</h2>
              <button className="crx-detail-close" onClick={() => setSelectedPharmacy(null)}>
                <Icons.X />
              </button>
            </div>
            
            <div className="crx-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className="crx-btn" onClick={() => setShowReportModal(true)}>
                <Icons.Package /> Report Availability
              </button>
            </div>

            <div className="crx-availability">
              <h3 className="crx-availability-title">Availability Reports</h3>
              <div className="crx-availability-list">
                {selectedPharmacy.availability?.length > 0 ? (
                  selectedPharmacy.availability.map((report) => (
                    <div key={report.id} className="crx-availability-item">
                      <span className="crx-availability-drug">{report.drugName}</span>
                      <span className={`crx-availability-status ${report.isInStock ? 'in-stock' : 'out-of-stock'}`}>
                        {report.isInStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No reports yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="crx-backdrop">
            <div className="crx-modal">
              <div className="crx-modal-header">
                <h3 className="crx-modal-title">Report Availability</h3>
                <button className="crx-detail-close" onClick={() => setShowReportModal(false)}>
                  <Icons.X />
                </button>
              </div>
              <div className="crx-modal-body">
                <div className="form-group">
                  <label className="form-label">Drug Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Paracetamol"
                    value={reportForm.drugName}
                    onChange={(e) => setReportForm({ ...reportForm, drugName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={reportForm.isInStock ? "yes" : "no"}
                    onChange={(e) => setReportForm({ ...reportForm, isInStock: e.target.value === "yes" })}
                  >
                    <option value="yes">In Stock</option>
                    <option value="no">Out of Stock</option>
                  </select>
                </div>
              </div>
              <div className="crx-modal-footer">
                <button className="crx-select" onClick={() => setShowReportModal(false)}>Cancel</button>
                <button className="crx-btn" onClick={submitAvailabilityReport}>Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
