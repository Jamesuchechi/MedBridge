"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Differential {
  diagnosis: string;
  reasoning: string;
  confidence: number; // 0-1
  urgency: "green" | "amber" | "red";
}

export interface AnalysisResponse {
  summary: string;
  differentials: Differential[];
  investigations: string[];
  soapNote: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalysisResults({ 
  analysis, 
  onEditNote, 
  onRestart,
  loadingNote
}: { 
  analysis: AnalysisResponse;
  onEditNote: () => void;
  onRestart: () => void;
  loadingNote?: boolean;
}) {
  return (
    <div className="analysis-results" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* ── Summary Section ─────────────────────────────────────────── */}
      <GlassCard className="result-section">
        <h3 className="section-title">Clinical Summary</h3>
        <p className="summary-text">{analysis.summary}</p>
      </GlassCard>

      {/* ── Differentials Section ───────────────────────────────────── */}
      <div className="differentials-grid">
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Differential Diagnoses</h3>
          {analysis.differentials.map((diff, i) => (
            <GlassCard key={i} className={`diff-card urgency-${diff.urgency}`}>
              <div className="diff-header">
                <span className="diff-name">{diff.diagnosis}</span>
                <div className="confidence-wrapper">
                  <span className="conf-label">Confidence</span>
                  <div className="conf-bar-bg">
                    <div className="conf-bar-fill" style={{ width: `${diff.confidence * 100}%` }} />
                  </div>
                  <span className="conf-pct">{Math.round(diff.confidence * 100)}%</span>
                </div>
              </div>
              <p className="diff-reasoning">{diff.reasoning}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── Investigations Section ─────────────────────────────────── */}
        <div style={{ flex: 1 }}>
          <GlassCard className="investigations-section">
            <h3 className="section-title">Suggested Investigations</h3>
            <ul className="invest-list">
              {analysis.investigations.map((inv, i) => (
                <li key={i} className="invest-item">
                  <span className="check-icon">○</span>
                  {inv}
                </li>
              ))}
            </ul>
            <div className="disclaimer-mini">
              * Order priority based on local prevalence and cost-effectiveness.
            </div>
          </GlassCard>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              className="action-btn primary" 
              onClick={onEditNote}
              disabled={loadingNote}
            >
              {loadingNote ? "Generating Note..." : "Generate & Edit SOAP Note"}
            </button>
            <button className="action-btn secondary" onClick={onRestart} disabled={loadingNote}>
              New Case Analysis
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .result-section { padding: 24px; }
        .section-title { 
          font-family: 'Syne', sans-serif; 
          font-size: 16px; 
          font-weight: 700; 
          margin-bottom: 16px;
          color: var(--accent2, #3d9bff);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-text { font-size: 15px; line-height: 1.6; color: var(--text2); }
        
        .differentials-grid { display: flex; gap: 24px; }
        
        .diff-card { padding: 20px; border-left: 4px solid transparent; }
        .diff-card.urgency-green { border-left-color: #10b981; }
        .diff-card.urgency-amber { border-left-color: #f59e0b; }
        .diff-card.urgency-red { border-left-color: #ef4444; }
        
        .diff-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .diff-name { font-size: 16px; font-weight: 700; color: var(--text); }
        
        .confidence-wrapper { display: flex; align-items: center; gap: 10px; }
        .conf-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text3); }
        .conf-bar-bg { width: 60px; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .conf-bar-fill { height: 100%; background: var(--accent2, #3d9bff); border-radius: 3px; }
        .conf-pct { font-size: 11px; font-weight: 700; color: var(--accent2, #3d9bff); min-width: 30px; }
        
        .diff-reasoning { font-size: 13px; color: var(--text2); line-height: 1.5; margin: 0; }
        
        .investigations-section { padding: 24px; height: fit-content; }
        .invest-list { list-style: none; padding: 0; margin: 0; }
        .invest-item { 
          display: flex; 
          gap: 12px; 
          padding: 12px 0; 
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 13px;
          color: var(--text2);
        }
        .invest-item:last-child { border-bottom: none; }
        .check-icon { color: var(--accent2, #3d9bff); font-weight: bold; }
        
        .disclaimer-mini { font-size: 11px; color: var(--text3); margin-top: 20px; font-style: italic; }
        
        .action-btn {
          width: 200%;
          padding: 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .action-btn.primary {
          width: 100%;
          background: linear-gradient(135deg, #3d9bff, #1a73e8);
          color: white;
          box-shadow: 0 4px 15px rgba(61,155,255,0.2);
        }
        .action-btn.secondary {
          width: 100%;
          background: rgba(255,255,255,0.05);
          color: var(--text2);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .action-btn:hover { transform: translateY(-1px); }
        .action-btn.primary:hover { box-shadow: 0 6px 20px rgba(61,155,255,0.3); }
        .action-btn.secondary:hover { background: rgba(255,255,255,0.08); }
        
        @media (max-width: 1024px) {
          .differentials-grid { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
