"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaseData {
  patientAge: string;
  patientSex: string;
  isExistingPatient: boolean;
  chiefComplaint: string;
  vitals: {
    bp: string;
    temp: string;
    pulse: string;
    rr: string;
    spO2: string;
  };
  hpi: string;
  ros: Record<string, boolean>;
  examFindings: string;
}

const EMPTY_CASE: CaseData = {
  patientAge: "",
  patientSex: "male",
  isExistingPatient: false,
  chiefComplaint: "",
  vitals: { bp: "", temp: "", pulse: "", rr: "", spO2: "" },
  hpi: "",
  ros: {},
  examFindings: "",
};

const ROS_CATEGORIES = [
  { id: "gen", label: "General", items: ["Fever", "Chills", "Weight Loss", "Fatigue", "Night Sweats"] },
  { id: "heent", label: "HEENT", items: ["Headache", "Vision Change", "Sore Throat", "Ear Pain", "Nasal Congestion"] },
  { id: "cv", label: "Cardio", items: ["Chest Pain", "Palpitations", "Edema", "Orthopnea"] },
  { id: "resp", label: "Resp", items: ["Cough", "Dyspnea", "Wheezing", "Hemoptysis"] },
  { id: "gi", label: "GI", items: ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain", "Constipation"] },
  { id: "gu", label: "GU", items: ["Dysuria", "Frequency", "Hematuria", "Urgency"] },
  { id: "neuro", label: "Neuro", items: ["Dizziness", "Numbness", "Weakness", "Seizures", "Syncope"] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CaseAnalysisForm({ 
  initialData, 
  onSubmit, 
  loading 
}: { 
  initialData?: CaseData | null;
  onSubmit: (data: CaseData) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<CaseData>(initialData || EMPTY_CASE);

  const toggleRos = (item: string) => {
    setFormData(prev => ({
      ...prev,
      ros: { ...prev.ros, [item]: !prev.ros[item] }
    }));
  };

  const handleVitalChange = (key: keyof CaseData["vitals"], val: string) => {
    setFormData(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [key]: val }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientAge || !formData.chiefComplaint) {
      alert("Please enter patient age and chief complaint.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="case-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Step 1: Patient & Vitals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <GlassCard className="form-section">
            <h3 className="section-title">Patient Profile</h3>
            <div className="field-row" style={{ display: 'flex', gap: 16 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Age (Years)</label>
                <input 
                  type="number" 
                  value={formData.patientAge} 
                  onChange={e => setFormData({ ...formData, patientAge: e.target.value })}
                  placeholder="e.g. 45"
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Sex</label>
                <select 
                  value={formData.patientSex} 
                  onChange={e => setFormData({ ...formData, patientSex: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="form-section">
            <h3 className="section-title">Vitals</h3>
            <div className="vitals-grid">
              <div className="field">
                <label>BP (mmHg)</label>
                <input value={formData.vitals.bp} onChange={e => handleVitalChange("bp", e.target.value)} placeholder="120/80" />
              </div>
              <div className="field">
                <label>Temp (°C)</label>
                <input value={formData.vitals.temp} onChange={e => handleVitalChange("temp", e.target.value)} placeholder="37.0" />
              </div>
              <div className="field">
                <label>Pulse (bpm)</label>
                <input value={formData.vitals.pulse} onChange={e => handleVitalChange("pulse", e.target.value)} placeholder="72" />
              </div>
              <div className="field">
                <label>RR (bpm)</label>
                <input value={formData.vitals.rr} onChange={e => handleVitalChange("rr", e.target.value)} placeholder="16" />
              </div>
              <div className="field">
                <label>SpO2 (%)</label>
                <input value={formData.vitals.spO2} onChange={e => handleVitalChange("spO2", e.target.value)} placeholder="98" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Step 2: Symptoms & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <GlassCard className="form-section">
            <h3 className="section-title">Clinical Presentation</h3>
            <div className="field">
              <label>Chief Complaint</label>
              <input 
                value={formData.chiefComplaint} 
                onChange={e => setFormData({ ...formData, chiefComplaint: e.target.value })}
                placeholder="e.g. 3-day history of fever and headache"
              />
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label>History of Presenting Illness (HPI)</label>
              <textarea 
                rows={4}
                value={formData.hpi} 
                onChange={e => setFormData({ ...formData, hpi: e.target.value })}
                placeholder="Include duration, severity, aggravating/relieving factors..."
              />
            </div>
          </GlassCard>

          <GlassCard className="form-section">
            <h3 className="section-title">Physical Examination</h3>
            <textarea 
              rows={4}
              value={formData.examFindings} 
              onChange={e => setFormData({ ...formData, examFindings: e.target.value })}
              placeholder="Head to toe / Systems findings..."
            />
          </GlassCard>
        </div>
      </div>

      {/* Review of Systems (ROS) */}
      <div style={{ marginTop: 24 }}>
        <GlassCard className="form-section">
          <h3 className="section-title">Review of Systems (ROS)</h3>
        <div className="ros-container">
          {ROS_CATEGORIES.map(cat => (
            <div key={cat.id} className="ros-category">
              <div className="ros-cat-label">{cat.label}</div>
              <div className="ros-items">
                {cat.items.map(item => (
                  <button 
                    key={item} 
                    type="button"
                    className={`ros-item ${formData.ros[item] ? 'active' : ''}`}
                    onClick={() => toggleRos(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <button 
          type="submit" 
          disabled={loading}
          className="submit-btn"
        >
          {loading ? (
            <span className="loading-spinner">Analyzing Clinical Data...</span>
          ) : (
            <>Run Case Analysis</>
          )}
        </button>
      </div>

      <style jsx>{`
        .case-form { width: 100%; }
        .form-section { padding: 24px; }
        .section-title { 
          font-family: 'Syne', sans-serif; 
          font-size: 16px; 
          font-weight: 700; 
          margin-bottom: 20px;
          color: var(--accent2, #3d9bff);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .field { display: flex; flexDirection: column; gap: 8px; margin-bottom: 16px; }
        .field label { font-size: 12px; font-weight: 600; color: var(--text3); }
        .field input, .field select, .field textarea {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px 16px;
          color: var(--text);
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: var(--accent2, #3d9bff);
          background: rgba(255,255,255,0.05);
        }
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .ros-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
        }
        .ros-cat-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; }
        .ros-items { display: flex; flex-wrap: wrap; gap: 6px; }
        .ros-item {
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--text2);
          cursor: pointer;
          transition: all 0.2s;
        }
        .ros-item:hover { background: rgba(255,255,255,0.07); }
        .ros-item.active {
          background: rgba(61,155,255,0.15);
          border-color: #3d9bff;
          color: #3d9bff;
          font-weight: 600;
        }
        .submit-btn {
          background: linear-gradient(135deg, #3d9bff, #1a73e8);
          color: white;
          border: none;
          padding: 16px 40px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(61,155,255,0.3);
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(61,155,255,0.4); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
        .loading-spinner {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </form>
  );
}
