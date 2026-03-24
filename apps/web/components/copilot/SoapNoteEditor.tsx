"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoapNoteEditor({ 
  note, 
  onBack, 
  onSave,
  isSaving = false
}: { 
  note: string;
  onBack: () => void;
  onSave: (editedNote: string) => void;
  isSaving?: boolean;
}) {
  const [editedNote, setEditedNote] = useState(note);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="soap-editor-container">
      
      {/* ── Main Editor ────────────────────────────────────────────── */}
      <div className="editor-main-col">
        <GlassCard className="editor-card">
          <div className="editor-header">
            <h3 className="section-title">Clinical Note (SOAP)</h3>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? "✓ Copied" : "Copy to Clipboard"}
            </button>
          </div>
          
          <textarea 
            className="soap-textarea"
            value={editedNote}
            onChange={e => setEditedNote(e.target.value)}
            rows={20}
            placeholder="Review and edit the generated SOAP note here..."
          />
          
          <div className="editor-footer">
            <button className="back-link" onClick={onBack}>
              ← Back to Analysis
            </button>
            <button className="save-btn" onClick={() => onSave(editedNote)} disabled={isSaving}>
              {isSaving ? <div className="loading-spinner-tiny" /> : "Save to Patient Record"}
            </button>
          </div>
        </GlassCard>
      </div>

      {/* ── Sidebar Guide ──────────────────────────────────────────── */}
      <div className="editor-side-col">
        <GlassCard className="guide-card">
          <h4 className="guide-title">SOAP Guide</h4>
          <div className="guide-item">
            <strong>S: Subjective</strong>
            <p>Chief complaint, HPI, ROS, and relevant history reported by the patient.</p>
          </div>
          <div className="guide-item">
            <strong>O: Objective</strong>
            <p>Vitals, physical exam findings, and lab/imaging results observed by you.</p>
          </div>
          <div className="guide-item">
            <strong>A: Assessment</strong>
            <p>Diagnostic conclusions, differentials, and clinical reasoning.</p>
          </div>
          <div className="guide-item">
            <strong>P: Plan</strong>
            <p>Treatment, medications, investigations ordered, and follow-up instructions.</p>
          </div>
        </GlassCard>
        
        <div style={{ marginTop: 20, padding: '0 10px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Note: Saving this will append the note to the patient's digital health record and link it to this encounter.
          </p>
        </div>
      </div>

      <style jsx>{`
        .soap-editor-container { 
          display: flex; 
          flex-wrap: wrap;
          gap: 24px; 
          width: 100%;
          box-sizing: border-box;
        }
        .editor-main-col {
          flex: 1 1 500px;
          min-width: 0;
        }
        .editor-side-col {
          flex: 1 1 300px;
          min-width: 0;
        }
        .editor-card { padding: 28px; border-radius: 20px; box-sizing: border-box; }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .section-title { 
          font-family: var(--font-syne), sans-serif; 
          font-size: 15px; 
          font-weight: 800; 
          margin: 0;
          color: var(--accent-secondary, #3d9bff);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .copy-btn {
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-btn:hover { background: var(--bg-card-hover); border-color: var(--accent-secondary); color: var(--text-primary); }
        
        .soap-textarea {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 24px;
          color: var(--text-primary);
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          line-height: 1.8;
          resize: vertical;
          min-height: 500px;
          outline: none;
          transition: all 0.25s ease;
          box-sizing: border-box;
          box-shadow: inset 0 4px 12px rgba(0,0,0,0.05);
        }
        .soap-textarea:focus { 
          border-color: var(--accent-secondary); 
          background: var(--bg-card-hover); 
          box-shadow: inset 0 4px 12px rgba(0,0,0,0.1), 0 0 0 4px rgba(61,155,255,0.05);
        }
        
        .editor-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; gap: 20px; flex-wrap: wrap; }
        .back-link { 
          background: none; 
          border: none; 
          color: var(--text-muted); 
          font-size: 14px; 
          font-weight: 600;
          cursor: pointer; 
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .back-link:hover { color: var(--text-secondary); transform: translateX(-4px); }
        
        .save-btn {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          color: #03050a;
          border: none;
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 229, 160, 0.15);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          font-family: var(--font-syne), sans-serif;
          box-sizing: border-box;
        }
        .save-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0, 229, 160, 0.25); filter: brightness(1.1); }
        .save-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
        .loading-spinner-tiny {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0,0,0,0.1);
          border-top-color: var(--text-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .guide-card { padding: 28px; border-radius: 20px; box-sizing: border-box; }
        .guide-title { 
          font-family: var(--font-syne, sans-serif); 
          font-size: 13px; 
          font-weight: 800; 
          color: var(--text-primary); 
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .guide-item { margin-bottom: 24px; }
        .guide-item:last-child { margin-bottom: 0; }
        .guide-item strong { display: block; font-size: 11px; color: var(--accent-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .guide-item p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
        
        @media (max-width: 600px) {
          .editor-card, .guide-card { padding: 20px; }
          .editor-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .copy-btn { width: 100%; text-align: center; }
          .editor-footer { flex-direction: column-reverse; align-items: stretch; }
          .save-btn { width: 100%; text-align: center; }
          .back-link { justify-content: center; padding: 12px; }
          .editor-main-col, .editor-side-col { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}
