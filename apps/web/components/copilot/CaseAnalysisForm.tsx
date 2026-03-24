"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaseData {
  patientName: string;
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
  patientName: "",
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
    if (!formData.patientName || !formData.patientAge || !formData.chiefComplaint) {
      alert("Please enter patient name, age and chief complaint.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="case-form">
      <div className="form-main-grid">
        
        {/* Step 1: Patient & Vitals */}
        <div className="form-column">
          <GlassCard className="form-section">
            <h3 className="section-title">Patient Profile</h3>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Patient Full Name</label>
              <input 
                value={formData.patientName} 
                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Age (Years)</label>
                <input 
                  type="number" 
                  value={formData.patientAge} 
                  onChange={e => setFormData({ ...formData, patientAge: e.target.value })}
                  placeholder="e.g. 45"
                />
              </div>
              <div className="field">
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
        <div className="form-column">
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
            <div className="field">
              <textarea 
                rows={4}
                value={formData.examFindings} 
                onChange={e => setFormData({ ...formData, examFindings: e.target.value })}
                placeholder="Head to toe / Systems findings..."
              />
            </div>
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

      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
        <button 
          type="submit" 
          disabled={loading}
          className="submit-btn"
        >
          {loading ? (
            <span className="loading-spinner">
              <div className="spinner-dot" />
              Analyzing Clinical Data...
            </span>
          ) : (
            <>Run Case Analysis</>
          )}
        </button>
      </div>

      <style jsx>{`
        .case-form { 
          width: 100%; 
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-sizing: border-box;
        }
        .form-main-grid { 
          display: flex; 
          flex-wrap: wrap;
          gap: 24px; 
          width: 100%;
        }
        .form-column { 
          display: flex; 
          flex-direction: column; 
          gap: 24px; 
          flex: 1 1 450px; /* Base width of 450px, but can grow and shrink */
          min-width: 0; /* Important for flex items with text inputs */
        }
        .form-section { padding: 28px; border-radius: 20px; height: 100%; }
        .section-title { 
          font-family: var(--font-syne, 'Syne'), sans-serif; 
          font-size: 14px; 
          font-weight: 800; 
          margin-bottom: 24px;
          color: var(--accent-secondary, #3d9bff);
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-title::after {
          content: '';
          height: 1px;
          flex: 1;
          background: linear-gradient(to right, rgba(61, 155, 255, 0.2), transparent);
        }
        
        .field-row { display: flex; flex-wrap: wrap; gap: 20px; }
        .field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; flex: 1 1 200px; }
        .field:last-child { margin-bottom: 0; }
        .field label { 
          font-size: 11px; 
          font-weight: 700; 
          color: var(--text-muted); 
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-left: 4px;
        }
        .field input, .field select, .field textarea {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 14px 18px;
          color: var(--text-primary);
          font-size: 15px;
          outline: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        .field input:hover, .field select:hover, .field textarea:hover {
          background: var(--bg-card-hover);
          border-color: var(--glass-border-hover);
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: var(--accent-secondary, #3d9bff);
          background: var(--bg-card-hover);
          box-shadow: 0 0 0 4px rgba(61, 155, 255, 0.1), inset 0 2px 4px rgba(0,0,0,0.05);
          transform: translateY(-1px);
        }
        
        .field select option {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          padding: 12px;
        }
        
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }
        @media (max-width: 480px) {
          .vitals-grid {
            grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          }
        }
        
        .ros-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }
        .ros-cat-label { 
          font-size: 10px; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: var(--text-muted); 
          margin-bottom: 12px;
          letter-spacing: 1px;
        }
        .ros-items { display: flex; flex-wrap: wrap; gap: 8px; }
        .ros-item {
          font-size: 11px;
          padding: 8px 12px;
          border-radius: 10px;
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .ros-item:hover { 
          background: var(--bg-card-hover); 
          transform: translateY(-1px);
          border-color: var(--glass-border-hover);
        }
        .ros-item.active {
          background: rgba(61, 155, 255, 0.1);
          border-color: #3d9bff;
          color: #3d9bff;
          font-weight: 600;
          box-shadow: 0 0 15px rgba(61, 155, 255, 0.15);
        }
        
        .submit-btn {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          color: #03050a;
          border: none;
          padding: 18px 56px;
          border-radius: 16px;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 30px rgba(0, 229, 160, 0.2);
          font-family: var(--font-syne, 'Syne'), sans-serif;
          letter-spacing: 0.5px;
          max-width: 100%;
        }
        .submit-btn:hover { 
          transform: translateY(-3px) scale(1.02); 
          box-shadow: 0 15px 40px rgba(0, 229, 160, 0.3);
          filter: brightness(1.1);
        }
        .submit-btn:active { transform: translateY(0) scale(0.98); }
        .submit-btn:disabled { 
          opacity: 0.6; 
          cursor: not-allowed; 
          transform: none; 
          filter: grayscale(0.5);
        }
        
        .loading-spinner {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .spinner-dot {
          width: 8px;
          height: 8px;
          background: currentColor;
          border-radius: 50%;
          animation: pulseDot 1.5s infinite ease-in-out;
        }

        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }

        @media (max-width: 600px) {
          .form-section { padding: 20px; }
          .section-title { font-size: 13px; }
          .ros-container { grid-template-columns: 1fr; }
          .field { flex: 1 1 100%; }
        }
      `}</style>
    </form>
  );
}
