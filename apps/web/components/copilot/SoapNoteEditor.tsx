"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoapNoteEditor({ 
  note, 
  onBack, 
  onSave 
}: { 
  note: string;
  onBack: () => void;
  onSave: (editedNote: string) => void;
}) {
  const [editedNote, setEditedNote] = useState(note);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="soap-editor-container" style={{ display: 'flex', gap: 24 }}>
      
      {/* ── Main Editor ────────────────────────────────────────────── */}
      <div style={{ flex: 1.5 }}>
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
            <button className="save-btn" onClick={() => onSave(editedNote)}>
              Save to Patient Record
            </button>
          </div>
        </GlassCard>
      </div>

      {/* ── Sidebar Guide ──────────────────────────────────────────── */}
      <div style={{ flex: 1 }}>
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
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
            Note: Saving this will append the note to the patient's digital health record and link it to this encounter.
          </p>
        </div>
      </div>

      <style jsx>{`
        .editor-card { padding: 24px; }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .section-title { 
          font-family: 'Syne', sans-serif; 
          font-size: 16px; 
          font-weight: 700; 
          margin: 0;
          color: var(--accent2, #3d9bff);
          text-transform: uppercase;
        }
        
        .copy-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text2);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--accent2); }
        
        .soap-textarea {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.7;
          resize: none;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .soap-textarea:focus { border-color: var(--accent2); background: rgba(0,0,0,0.25); }
        
        .editor-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
        .back-link { 
          background: none; 
          border: none; 
          color: var(--text3); 
          font-size: 14px; 
          cursor: pointer; 
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--text2); }
        
        .save-btn {
          background: linear-gradient(135deg, #3d9bff, #1a73e8);
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(61,155,255,0.2);
          transition: all 0.2s;
        }
        .save-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(61,155,255,0.3); }
        
        .guide-card { padding: 24px; }
        .guide-title { 
          font-family: 'Syne', sans-serif; 
          font-size: 14px; 
          font-weight: 800; 
          color: var(--text); 
          margin-bottom: 20px;
          text-transform: uppercase;
        }
        .guide-item { margin-bottom: 20px; }
        .guide-item strong { display: block; font-size: 12px; color: var(--accent2); margin-bottom: 4px; }
        .guide-item p { font-size: 12px; color: var(--text2); line-height: 1.6; margin: 0; }
        
        @media (max-width: 900px) {
          .soap-editor-container { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
