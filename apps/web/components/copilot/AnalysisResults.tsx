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
        <div className="diff-main-col">
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
        <div className="diff-side-col">
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

          <div className="action-btns-container">
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
        .result-section { padding: 28px; border-radius: 20px; box-sizing: border-box; }
        .section-title { 
          font-family: var(--font-syne, 'Syne'), sans-serif; 
          font-size: 14px; 
          font-weight: 800; 
          margin-bottom: 20px;
          color: var(--accent-secondary, #3d9bff);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .summary-text { font-size: 15px; line-height: 1.7; color: var(--text-secondary); }
        
        .differentials-grid { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 24px; 
          width: 100%;
          box-sizing: border-box;
        }
        .diff-main-col {
          flex: 1 1 500px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .diff-side-col {
          flex: 1 1 300px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }
        
        .diff-card { 
          padding: 24px; 
          border-left: 4px solid transparent; 
          border-radius: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .diff-card:hover {
          transform: translateX(4px);
        }
        .diff-card.urgency-green { border-left-color: #10b981; background: rgba(16, 185, 129, 0.05); }
        .diff-card.urgency-amber { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
        .diff-card.urgency-red { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
        
        .diff-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .diff-name { font-size: 17px; font-weight: 700; color: var(--text-primary); }
        
        .confidence-wrapper { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .conf-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
        .conf-bar-bg { width: 80px; height: 6px; background: var(--glass-border); border-radius: 100px; overflow: hidden; }
        .conf-bar-fill { 
          height: 100%; 
          background: linear-gradient(to right, var(--accent-secondary), var(--accent-primary)); 
          border-radius: 100px; 
        }
        .conf-pct { font-size: 12px; font-weight: 800; color: var(--accent-secondary); min-width: 35px; }
        
        .diff-reasoning { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
        
        .investigations-section { padding: 28px; height: fit-content; border-radius: 20px; box-sizing: border-box; }
        .invest-list { list-style: none; padding: 0; margin: 0; }
        .invest-item { 
          display: flex; 
          gap: 14px; 
          padding: 14px 0; 
          border-bottom: 1px solid var(--glass-border);
          font-size: 14px;
          color: var(--text-secondary);
        }
        .invest-item:last-child { border-bottom: none; }
        .check-icon { color: var(--accent-primary); font-weight: bold; }
        
        .disclaimer-mini { font-size: 11px; color: var(--text-muted); margin-top: 24px; font-style: italic; }
        
        .action-btns-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .action-btn {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: none;
          font-family: var(--font-syne), sans-serif;
          letter-spacing: 0.5px;
          box-sizing: border-box;
        }
        .action-btn.primary {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          color: #03050a;
          box-shadow: 0 8px 25px rgba(0, 229, 160, 0.2);
        }
        .action-btn.secondary {
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--glass-border);
        }
        .action-btn:hover { transform: translateY(-2px); }
        .action-btn.primary:hover { box-shadow: 0 12px 30px rgba(0, 229, 160, 0.3); filter: brightness(1.1); }
        .action-btn.secondary:hover { background: var(--bg-card-hover); border-color: var(--accent-secondary); }
        
        @media (max-width: 600px) {
          .result-section, .investigations-section { padding: 20px; }
          .diff-card { padding: 20px; }
          .diff-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .confidence-wrapper { width: 100%; justify-content: space-between; }
          .conf-bar-bg { flex: 1; max-width: none; }
          .diff-main-col, .diff-side-col { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}
