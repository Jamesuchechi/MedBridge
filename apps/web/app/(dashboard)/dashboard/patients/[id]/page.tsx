"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import * as Ic from "lucide-react";
import AnalysisResults, { AnalysisResponse, Differential } from "@/components/copilot/AnalysisResults";
import SoapNoteEditor from "@/components/copilot/SoapNoteEditor";
import Link from "next/link";

interface Vitals {
  [key: string]: string | number;
}

interface ClinicalCase {
  id: string;
  patientName: string;
  name?: string; // Fallback from API
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  vitals: Vitals;
  analysis: {
    summary: string;
    differentials: Differential[];
    investigations: string[];
  };
  soapNote: string;
  createdAt: string;
  isShared?: boolean;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<ClinicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"details" | "note">("details");
  const [savingNote, setSavingNote] = useState(false);

  const supabase = createClient();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchDetail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const res = await fetch(`${API_URL}/api/v1/patients/${id}`, {
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.user_metadata?.role || "CLINICIAN"
          }
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch case detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, supabase, API_URL]);

  const handleSaveNote = async (editedNote: string) => {
    if (!data) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSavingNote(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/copilot/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": "CLINICIAN"
        },
        body: JSON.stringify({
          id: data.id,
          patientName: data.patientName,
          patientAge: data.patientAge,
          patientSex: data.patientSex,
          chiefComplaint: data.chiefComplaint,
          vitals: data.vitals,
          analysis: data.analysis,
          soapNote: editedNote,
        })
      });
      if (res.ok) {
        setData({ ...data, soapNote: editedNote });
        setView("details");
        alert("Clinical note updated successfully.");
      }
    } catch (err) {
      console.error("Save note failed:", err);
      alert("Failed to save clinical note.");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner" />
        <p>Loading clinical record...</p>
        <style>{styles}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pd-empty">
        <Ic.AlertCircle size={48} />
        <h2>Clinical Case Not Found</h2>
        <p>The record you are looking for might have been moved or deleted.</p>
        <Link href="/dashboard/patients" className="pd-back-btn">Back to Patients</Link>
        <style>{styles}</style>
      </div>
    );
  }

  const analysis: AnalysisResponse = {
    summary: data.analysis.summary,
    differentials: data.analysis.differentials,
    investigations: data.analysis.investigations,
    soapNote: data.soapNote,
  };

  return (
    <div className="pd-container">
      <style>{styles}</style>
      
      <header className="pd-header">
        <Link href="/dashboard/patients" className="pd-breadcrumb">
          <Ic.ChevronLeft size={16} /> Patients
        </Link>
        <div className="pd-patient-summary">
          <div className="pd-avatar">{data.patientName[0]}</div>
          <div className="pd-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="pd-name">{data.patientName}</h1>
              {data.isShared && (
                <span className="shared-badge">
                  <Ic.Shield size={12} /> Shared Access
                </span>
              )}
            </div>
            <p className="pd-meta">
              {data.patientAge} years • {data.patientSex} • Case #{data.id.slice(0, 8)}
            </p>
          </div>
          <div className="pd-date">
            <Ic.Calendar size={14} /> Recorded on {new Date(data.createdAt).toLocaleDateString()}
          </div>
        </div>
      </header>

      {view === "details" ? (
        <div className="pd-content">
          <div className="pd-complaint-box">
             <div className="pd-section-label">Chief Complaint</div>
             <p className="pd-complaint-text">{data.chiefComplaint}</p>
          </div>

          {Object.keys(data.vitals || {}).length > 0 && (
            <div className="pd-vitals-grid">
              {Object.entries(data.vitals).map(([k, v]) => (
                <div key={k} className="pd-vital-card">
                   <div className="pd-vital-label">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                   <div className="pd-vital-value">{v}</div>
                </div>
              ))}
            </div>
          )}

          <div className="pd-analysis-wrapper">
             <AnalysisResults 
                analysis={analysis} 
                onEditNote={() => setView("note")} 
                onRestart={() => window.location.assign("/dashboard/copilot")}
                onRefer={() => {}} // Not implemented in this view yet
                loadingNote={false}
             />
          </div>
        </div>
      ) : (
        <div className="pd-note-wrapper">
           <SoapNoteEditor 
              note={data.soapNote} 
              onBack={() => setView("details")} 
              onSave={handleSaveNote}
              isSaving={savingNote}
           />
        </div>
      )}
    </div>
  );
}

const styles = `
.pd-container { padding: 2rem; max-width: 1200px; margin: 0 auto; min-height: 100vh; animation: PD-ENTER 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes PD-ENTER { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.pd-breadcrumb { display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 14px; text-decoration: none; margin-bottom: 24px; transition: color 0.2s; }
.pd-breadcrumb:hover { color: var(--accent-secondary); }

.pd-header { margin-bottom: 40px; }

.pd-patient-summary { display: flex; align-items: center; gap: 20px; background: var(--bg-card); border: 1px solid var(--glass-border); padding: 24px; border-radius: 20px; backdrop-filter: blur(12px); }
.pd-avatar { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: var(--accent-secondary); }
.pd-name { margin: 0 0 4px 0; font-family: var(--font-syne), sans-serif; font-size: 28px; font-weight: 800; }
.pd-meta { margin: 0; color: var(--text-secondary); font-size: 15px; }
.pd-date { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); background: var(--bg-primary); padding: 8px 16px; border-radius: 100px; border: 1px solid var(--glass-border); }

.pd-complaint-box { background: var(--bg-card); border: 1px solid var(--glass-border); padding: 28px; border-radius: 20px; margin-bottom: 24px; }
.pd-section-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent-secondary); letter-spacing: 1px; margin-bottom: 12px; }
.pd-complaint-text { font-size: 18px; font-weight: 500; line-height: 1.6; margin: 0; color: var(--text-primary); }

.pd-vitals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
.pd-vital-card { background: var(--bg-card); border: 1px solid var(--glass-border); padding: 20px; border-radius: 16px; }
.pd-vital-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; letter-spacing: 0.5px; }
.pd-vital-value { font-family: var(--font-syne), sans-serif; font-size: 20px; font-weight: 800; color: var(--accent-primary); }

.pd-loading, .pd-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center; gap: 16px; }
.pd-spinner { width: 40px; height: 40px; border: 3.5px solid var(--glass-border); border-top-color: var(--accent-secondary); border-radius: 50%; animation: PD-SPIN 1s linear infinite; }
@keyframes PD-SPIN { to { transform: rotate(360deg); } }

.pd-back-btn { margin-top: 12px; padding: 12px 24px; background: var(--accent-secondary); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; }

@media (max-width: 768px) {
  .pd-patient-summary { flex-direction: column; text-align: center; gap: 16px; }
  .pd-date { margin-left: auto; margin-right: auto; }
  .pd-name { font-size: 24px; }
}

.shared-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(61, 155, 255, 0.1);
  color: var(--accent2);
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  border: 1px solid rgba(61, 155, 255, 0.2);
}
`;
