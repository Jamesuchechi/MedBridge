"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import CaseAnalysisForm, { CaseData } from "@/components/copilot/CaseAnalysisForm";
import AnalysisResults, { AnalysisResponse } from "@/components/copilot/AnalysisResults";
import SoapNoteEditor from "@/components/copilot/SoapNoteEditor";

type View = "form" | "results" | "note";

export default function CopilotPage() {
  const [view, setView] = useState<View>("form");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAnalyze = async (data: CaseData) => {
    setCaseData(data);
    setLoading(true);
    
    try {
      const result = await api.post<AnalysisResponse>("/api/v1/copilot/analyze", data);
      setAnalysis(result);
      setView("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const error = err as any;
      console.error("Analysis failed:", error);
      alert(error.message || "Failed to analyze case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [generatingNote, setGeneratingNote] = useState(false);

  const handleEditNote = async () => {
    if (!caseData || !analysis) return;
    
    // Check if we already have a note in the analysis object
    // (In case the backend pre-generated it or we already fetched it)
    if (analysis.soapNote) {
      setView("note");
      return;
    }

    setGeneratingNote(true);
    try {
      const result = await api.post<{ soapNote: string }>("/api/v1/copilot/note", {
        caseData,
        analysis
      });
      setAnalysis({ ...analysis, soapNote: result.soapNote });
      setView("note");
    } catch (err: unknown) {
      const error = err as any;
      console.error("SOAP generation failed:", error);
      alert("Failed to generate clinical note.");
    } finally {
      setGeneratingNote(false);
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
    <div className="cp-container" style={{ padding: '0 0 40px 0' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Doctor <span style={{ color: 'var(--accent2, #3d9bff)' }}>Copilot</span>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 15 }}>
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
          loadingNote={generatingNote}
        />
      )}

      {view === "note" && analysis && (
        <SoapNoteEditor 
          note={analysis.soapNote} 
          onBack={handleBackToResults} 
          onSave={() => alert("Note saved to patient records (Simulated)")} 
        />
      )}
      
      <div style={{ marginTop: 40, opacity: 0.5, fontSize: 12, textAlign: 'center' }}>
        <p><strong>Disclaimer:</strong> This is an AI-powered clinical assistant. All suggestions must be reviewed by a licensed medical professional. MedBridge Copilot is not a substitute for clinical judgment.</p>
      </div>
    </div>
  );
}
