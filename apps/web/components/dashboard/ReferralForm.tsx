"use client";

import { useState, useEffect } from "react";
import { Referral, ClinicalSummary } from "@/types/referral";

interface Specialist {
  id: string;
  name: string;
  specialization: string;
  hospital: string | null;
  hospitalState: string | null;
}


interface ReferralFormProps {
  initialData?: {
    patientName: string;
    patientAge: string;
    patientSex: string;
    clinicalSummary: ClinicalSummary;
  };
  onSuccess: (referral: Referral) => void;
  onCancel: () => void;
}

const Ic = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Hospital: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><line x1="12" y1="15" x2="12" y2="15" />
    </svg>
  ),
};

export const ReferralForm: React.FC<ReferralFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    patientName: initialData?.patientName || "",
    patientAge: initialData?.patientAge || "",
    patientSex: initialData?.patientSex || "",
    specialty: "",
    priority: "Routine",
    urgencyScore: 1,
    notes: "",
    receivingDoctorId: "",
    receivingFacility: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSpecialists([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/referrals/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSpecialists(data);
        }
      } catch (err) {
        console.error("Specialist search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/referrals`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": (window as unknown as { __USER_ID__?: string }).__USER_ID__ || "" // Fallback for testing, should come from auth store ideally
        },
        body: JSON.stringify({
          ...formData,
          receivingDoctorId: selectedSpecialist?.id || null,
          receivingFacility: selectedSpecialist?.hospital || formData.receivingFacility,
          clinicalSummary: initialData?.clinicalSummary || {}
        })
      });

      if (res.ok) {
        const result = await res.json();
        onSuccess(result);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error("Failed to create referral:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="referral-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Patient Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Patient Name</label>
            <input 
              type="text" 
              value={formData.patientName} 
              onChange={e => setFormData({...formData, patientName: e.target.value})} 
              required 
            />
          </div>
          <div className="form-group-row">
            <div className="form-group">
              <label>Age</label>
              <input 
                type="text" 
                value={formData.patientAge} 
                onChange={e => setFormData({...formData, patientAge: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Sex</label>
              <select 
                value={formData.patientSex} 
                onChange={e => setFormData({...formData, patientSex: e.target.value})} 
                required
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section specialty-section">
        <h3>Specialist & Destination</h3>
        <div className="search-container">
          <label>Search Specialist or Facility</label>
          <div className="search-input-wrapper">
            <Ic.Search />
            <input 
              type="text" 
              placeholder="e.g. Dr. Ngozi, Cardiology, Reddington Hospital..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && <div className="search-loader" />}
          </div>
          
          {specialists.length > 0 && !selectedSpecialist && (
            <div className="search-results">
              {specialists.map(s => (
                <div key={s.id} className="search-result-item" onClick={() => {
                  setSelectedSpecialist(s);
                  setFormData({...formData, specialty: s.specialization, receivingFacility: s.hospital || ""});
                  setSearchQuery(s.name);
                }}>
                  <div className="result-main">
                    <span className="result-name">{s.name}</span>
                    <span className="result-spec">{s.specialization}</span>
                  </div>
                  {s.hospital && (
                    <div className="result-sub">
                      <Ic.Hospital /> {s.hospital} {s.hospitalState && `(${s.hospitalState})`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectedSpecialist && (
          <div className="form-group">
            <label>Specialty Required</label>
            <input 
              type="text" 
              placeholder="e.g. Neurology" 
              value={formData.specialty} 
              onChange={e => setFormData({...formData, specialty: e.target.value})}
              required
            />
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Urgency & Priority</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Priority</label>
            <div className="priority-tabs">
              {["Routine", "Urgent", "Stat"].map(p => (
                <button 
                  key={p} 
                  type="button" 
                  className={`priority-tab ${formData.priority === p ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, priority: p})}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Urgency Score (1-5)</label>
            <div className="score-selector">
              {[1, 2, 3, 4, 5].map(s => (
                <button 
                  key={s} 
                  type="button" 
                  className={`score-btn ${formData.urgencyScore === s ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, urgencyScore: s})}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label>Additional Notes / Referral Reason</label>
          <textarea 
            rows={4} 
            placeholder="Provide context for the specialist..." 
            value={formData.notes} 
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>
      </div>

      <div className="form-footer">
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Sending Referral..." : "Send Clinical Packet"}
        </button>
      </div>

      <style>{`
        .referral-form { display: flex; flex-direction: column; gap: 24px; padding: 12px 0; }
        .form-section h3 { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--text); }
        .form-grid { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        
        label { font-size: 12px; font-weight: 600; color: var(--text3); text-transform: uppercase; }
        input, select, textarea {
          background: var(--glass); border: 1px solid var(--border);
          border-radius: 10px; padding: 10px 14px; color: var(--text);
          font-size: 14px; outline: none; transition: border-color .2s;
        }
        input:focus, select:focus, textarea:focus { border-color: var(--accent); }

        .search-container { position: relative; margin-bottom: 16px; }
        .search-input-wrapper { position: relative; display: flex; align-items: center; }
        .search-input-wrapper svg { position: absolute; left: 12px; color: var(--text3); }
        .search-input-wrapper input { width: 100%; padding-left: 36px; }
        
        .search-loader {
          position: absolute; right: 12px; width: 16px; height: 16px;
          border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .search-results {
          position: absolute; top: 100%; left: 0; right: 0;
          background: var(--sidebar-bg); border: 1px solid var(--border);
          border-top: none; border-radius: 0 0 12px 12px;
          max-height: 240px; overflow-y: auto; z-index: 100;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        .search-result-item {
          padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border);
          transition: background .2s;
        }
        .search-result-item:hover { background: var(--glass-h); }
        .result-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .result-name { font-weight: 700; font-size: 14px; color: var(--text); }
        .result-spec { font-size: 11px; color: var(--accent); font-family: 'DM Mono', monospace; font-weight: 600; }
        .result-sub { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text3); }

        .priority-tabs { display: flex; background: var(--glass); padding: 4px; border-radius: 10px; gap: 4px; }
        .priority-tab { 
          flex: 1; padding: 8px; border-radius: 7px; font-size: 13px; font-weight: 600;
          color: var(--text2); transition: all .2s;
        }
        .priority-tab.active { background: var(--accent2); color: #000; }
        
        .score-selector { display: flex; gap: 8px; }
        .score-btn { 
          width: 38px; height: 38px; border-radius: 9px; background: var(--glass);
          border: 1px solid var(--border); color: var(--text2); font-weight: 700;
          transition: all .2s;
        }
        .score-btn.active { background: var(--accent); border-color: var(--accent); color: #000; }

        .form-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
        .cancel-btn { padding: 12px 20px; border-radius: 10px; color: var(--text2); font-weight: 600; font-size: 14px; }
        .submit-btn { 
          padding: 12px 24px; border-radius: 10px; background: var(--accent);
          color: #000; font-weight: 700; font-size: 14px; transition: all .2s;
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,229,160,0.3); }
        .submit-btn:disabled { opacity: 0.5; transform: none; box-shadow: none; }
      `}</style>
    </form>
  );
};
