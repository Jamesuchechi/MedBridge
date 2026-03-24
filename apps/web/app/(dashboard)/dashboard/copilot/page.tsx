"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import CaseAnalysisForm, { CaseData } from "@/components/copilot/CaseAnalysisForm";
import AnalysisResults, { AnalysisResponse } from "@/components/copilot/AnalysisResults";
import SoapNoteEditor from "@/components/copilot/SoapNoteEditor";
import { Modal } from "@/components/ui/Modal";
import { ReferralForm } from "@/components/dashboard/ReferralForm";

type View = "form" | "results" | "note";

export default function CopilotPage() {
  const [view, setView] = useState<View>("form");
  const { user } = useAuthStore();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingNote, setGeneratingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAnalyze = async (data: CaseData) => {
    if (!user) return;
    setCaseData(data);
    setLoading(true);
    
    try {
      const result = await api.post<AnalysisResponse>("/api/v1/copilot/analyze", data, {
        headers: {
          "x-user-id": user.id,
          "x-user-role": "CLINICIAN"
        }
      });
      setAnalysis(result);
      setView("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error("Analysis failed:", err);
      const message = err instanceof Error ? err.message : "Failed to analyze case. Please try again.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = async () => {
    if (!caseData || !analysis || !user) return;
    
    if (analysis.soapNote) {
      setView("note");
      return;
    }

    setGeneratingNote(true);
    try {
      const result = await api.post<{ soapNote: string }>("/api/v1/copilot/note", {
        caseData,
        analysis
      }, {
        headers: {
          "x-user-id": user.id,
          "x-user-role": "CLINICIAN"
        }
      });
      setAnalysis({ ...analysis, soapNote: result.soapNote });
      setView("note");
    } catch (err: unknown) {
      console.error("SOAP generation failed:", err);
      alert("Failed to generate clinical note.");
    } finally {
      setGeneratingNote(false);
    }
  };

  const handleSaveNote = async (editedNote: string) => {
    if (!caseData || !analysis || !user) return;
    
    setSavingNote(true);
    try {
      await api.post("/api/v1/copilot/save", {
        patientName: caseData.patientName,
        patientAge: caseData.patientAge,
        patientSex: caseData.patientSex,
        chiefComplaint: caseData.chiefComplaint,
        vitals: caseData.vitals,
        analysis: analysis,
        soapNote: editedNote,
      }, {
        headers: {
          "x-user-id": user.id,
          "x-user-role": "CLINICIAN"
        }
      });
      
      alert("Clinical case saved successfully.");
      window.location.assign("/dashboard/patients");
    } catch (err: unknown) {
      console.error("Save failed:", err);
      alert("Failed to save clinical case.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleBackToResults = () => setView("results");
  const handleRestart = () => {
    if (confirm("Clear current case and start over?")) {
      setView("form");
      setCaseData(null);
      setAnalysis(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="cp-container">
      <header className="cp-header">
        <h1 className="cp-title">
          Doctor <span className="cp-accent">Copilot</span>
        </h1>
        <p className="cp-subtitle">
          Advanced clinical intelligence for differential diagnosis and SOAP documentation.
        </p>
      </header>

      {view === "form" && (
        <CaseAnalysisForm 
          initialData={caseData} 
          onSubmit={handleAnalyze} 
          loading={loading} 
        />
      )}

      {view === "results" && analysis && (
        <AnalysisResults 
          analysis={analysis} 
          onEditNote={handleEditNote} 
          onRestart={handleRestart} 
          onRefer={() => setShowReferralModal(true)}
          loadingNote={generatingNote}
        />
      )}

      {view === "note" && analysis && (
        <SoapNoteEditor 
          note={analysis.soapNote} 
          onBack={handleBackToResults} 
          onSave={handleSaveNote}
          isSaving={savingNote}
        />
      )}

      <Modal 
        isOpen={showReferralModal} 
        onClose={() => setShowReferralModal(false)}
        title="Refer to Specialist"
      >
        <ReferralForm 
          initialData={{
            patientName: caseData?.patientName || "",
            patientAge: caseData?.patientAge || "",
            patientSex: caseData?.patientSex || "",
            clinicalSummary: analysis || {}
          }}
          onSuccess={(ref) => {
            setShowReferralModal(false);
            alert(`Referral sent successfully to ${ref.receivingFacility || "Specialist"}`);
            window.location.assign("/dashboard/referrals");
          }}
          onCancel={() => setShowReferralModal(false)}
        />
      </Modal>
      
      <div className="cp-disclaimer">
        <p><strong>Disclaimer:</strong> This is an AI-powered clinical assistant. All suggestions must be reviewed by a licensed medical professional. MedBridge Copilot is not a substitute for clinical judgment.</p>
      </div>

      <style jsx>{`
        .cp-container {
          padding: 0 0 60px 0;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          color: var(--text-primary);
        }
        .cp-header {
          margin-bottom: 48px;
          padding: 0 24px;
          box-sizing: border-box;
        }
        .cp-title {
          font-family: var(--font-syne, 'Syne'), sans-serif;
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -1px;
          line-height: 1.1;
        }
        .cp-accent {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cp-subtitle {
          color: var(--text-secondary);
          font-size: clamp(14px, 2vw, 16px);
          max-width: 600px;
          line-height: 1.6;
        }
        .cp-disclaimer {
          margin-top: 60px;
          padding: 24px;
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          color: var(--text-muted);
          font-size: 13px;
          text-align: center;
          line-height: 1.6;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .cp-disclaimer strong {
          color: var(--text-secondary);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 4px;
        }

        @media (max-width: 768px) {
          .cp-container { padding: 0 16px 40px 16px; }
          .cp-header { margin-bottom: 32px; text-align: center; padding: 0; }
          .cp-subtitle { margin: 0 auto; }
        }
      `}</style>
    </div>
  );
}
