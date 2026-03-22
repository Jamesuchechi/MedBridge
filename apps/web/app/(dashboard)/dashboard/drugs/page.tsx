"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Drug {
  id: string;
  name: string;
  genericName: string;
  nafdacNumber?: string;
  manufacturer?: string;
  category: string;
  form?: string;
  strength?: string;
  brandNames: string[];
  uses: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  priceRangeMin: number;
  priceRangeMax: number;
  priceDisplay?: string;
  requiresPrescription: boolean;
  controlled: boolean;
  atcCode?: string;
}

interface SearchResult {
  hits: Drug[];
  total: number;
  page: number;
  source: string;
}

interface InteractionPair {
  drug1: string;
  drug2: string;
  severity: "none" | "minor" | "moderate" | "severe" | "contraindicated";
  mechanism: string;
  clinicalEffect: string;
  management: string;
}

interface InteractionResult {
  drugs: string[];
  interactions: InteractionPair[];
  severity: string;
  summary: string;
  disclaimer: string;
}

interface DrugExplanation {
  drugName: string;
  explanation: string;
  keyPoints: string[];
  warning?: string;
  disclaimer: string;
}



// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Search:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Pill:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>,
  Warning:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  X:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight:() => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Plus:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Zap:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Info:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Lock:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Naira:    () => <span style={{ fontWeight: 700, fontSize: '14px' }}>₦</span>,
  Message:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.di-page { width: 100%; max-width: 1100px; padding: 32px 0 80px; animation: di-enter .35s ease; }
@keyframes di-enter { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: none; } }

.di-header { margin-bottom: 28px; }
.di-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
.di-eyebrow-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: dot-pulse 2s infinite; }
@keyframes dot-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(1.5); } }
.di-title { font-family: 'Syne', sans-serif; font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: var(--text); line-height: 1.1; margin-bottom: 6px; }
.di-title span { background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.di-subtitle { font-size: 14px; color: var(--text2); }

.di-tabs { display: flex; gap: 4px; background: var(--card-bg, rgba(255,255,255,.04)); border: 1px solid var(--card-border, rgba(255,255,255,.08)); border-radius: 12px; padding: 4px; margin-bottom: 24px; width: fit-content; }
.di-tab { display: flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; background: transparent; border: none; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif; }
.di-tab svg { width: 15px; height: 15px; flex-shrink: 0; }
.di-tab.active { background: var(--accent); color: #000; box-shadow: 0 3px 12px rgba(0,229,160,.3); }
.di-tab:hover:not(.active) { background: var(--glass-h, rgba(255,255,255,.08)); color: var(--text); }

.di-search-wrap { position: relative; margin-bottom: 20px; }
.di-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text3); display: flex; }
.di-search-icon svg { width: 18px; height: 18px; }
.di-search-input { width: 100%; padding: 14px 14px 14px 44px; background: var(--card-bg, rgba(255,255,255,.04)); border: 1.5px solid var(--border, rgba(255,255,255,.08)); border-radius: 14px; color: var(--text); font-size: 15px; outline: none; transition: all .2s; font-family: 'DM Sans', sans-serif; }
.di-search-input:focus { border-color: rgba(0,229,160,.5); box-shadow: 0 0 0 3px rgba(0,229,160,.08); }

.di-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.di-filter-btn { padding: 6px 14px; border: 1.5px solid var(--border, rgba(255,255,255,.08)); border-radius: 100px; background: var(--glass, rgba(255,255,255,.04)); color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: 'DM Mono', monospace; }
.di-filter-btn.active { border-color: var(--accent2); background: rgba(61,155,255,.1); color: var(--accent2); }
.di-filter-btn:hover:not(.active) { border-color: var(--border-h, rgba(255,255,255,.16)); }

.di-results-count { font-size: 12px; color: var(--text3); font-family: 'DM Mono', monospace; margin-bottom: 14px; }

.di-drug-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.di-drug-card { background: var(--card-bg, rgba(255,255,255,.04)); border: 1px solid var(--card-border, rgba(255,255,255,.08)); border-radius: 16px; padding: 18px; cursor: pointer; transition: all .22s; }
.di-drug-card:hover { border-color: rgba(0,229,160,.3); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.2); }
.di-drug-card-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.di-drug-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(0,229,160,.1); border: 1px solid rgba(0,229,160,.2); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.di-drug-icon svg { width: 18px; height: 18px; }
.di-drug-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.di-drug-generic { font-size: 11px; color: var(--text3); font-family: 'DM Mono', monospace; }
.di-drug-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.di-badge { font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 100px; text-transform: uppercase; }
.di-badge-cat  { background: rgba(61,155,255,.12); color: var(--accent2, #3d9bff); border: 1px solid rgba(61,155,255,.2); }
.di-badge-rx   { background: rgba(255,92,92,.1); color: #ff5c5c; border: 1px solid rgba(255,92,92,.2); }
.di-badge-otc  { background: rgba(0,229,160,.1); color: var(--accent, #00e5a0); border: 1px solid rgba(0,229,160,.2); }
.di-badge-ctrl { background: rgba(255,184,0,.1); color: #ffb800; border: 1px solid rgba(255,184,0,.2); }
.di-drug-price { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: var(--text); }
.di-drug-form  { font-size: 11px; color: var(--text3); margin-top: 2px; }

.di-empty { text-align: center; padding: 64px 24px; color: var(--text3); }
.di-empty svg { width: 48px; height: 48px; margin: 0 auto 16px; opacity: .3; }

.di-loading { display: flex; align-items: center; justify-content: center; padding: 48px; }
.di-spinner { width: 32px; height: 32px; border: 3px solid var(--border, rgba(255,255,255,.08)); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Detail view */
.di-detail { animation: di-enter .3s ease; }
.di-back-btn { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text2); background: none; border: none; cursor: pointer; margin-bottom: 24px; transition: color .2s; padding: 0; }
.di-back-btn:hover { color: var(--accent); }
.di-detail-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.di-detail-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(0,229,160,.1); border: 1px solid rgba(0,229,160,.2); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.di-detail-icon svg { width: 26px; height: 26px; }
.di-detail-name { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; }
.di-detail-generic { font-size: 14px; color: var(--text3); font-family: 'DM Mono', monospace; margin-top: 2px; }
.di-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 700px) { .di-detail-grid { grid-template-columns: 1fr; } }
.di-detail-card { background: var(--card-bg, rgba(255,255,255,.04)); border: 1px solid var(--card-border, rgba(255,255,255,.08)); border-radius: 16px; padding: 18px; }
.di-detail-card-title { font-size: 11px; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: .1em; color: var(--accent); font-weight: 700; margin-bottom: 12px; }
.di-detail-list { display: flex; flex-direction: column; gap: 6px; }
.di-detail-list-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text2); line-height: 1.5; }
.di-detail-list-item::before { content: "•"; color: var(--accent); flex-shrink: 0; margin-top: 1px; }
.di-detail-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.di-meta-chip { display: flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 8px; background: var(--glass, rgba(255,255,255,.04)); border: 1px solid var(--border, rgba(255,255,255,.08)); font-size: 12px; color: var(--text2); font-family: 'DM Mono', monospace; }
.di-meta-chip svg { width: 13px; height: 13px; }
.di-interaction-warning { display: flex; gap: 12px; padding: 14px; border-radius: 12px; margin-top: 6px; }
.di-interaction-warning.minor         { background: rgba(255,184,0,.07); border: 1px solid rgba(255,184,0,.2); }
.di-interaction-warning.moderate      { background: rgba(255,124,43,.07); border: 1px solid rgba(255,124,43,.22); }
.di-interaction-warning.severe        { background: rgba(255,59,59,.08); border: 1px solid rgba(255,59,59,.25); }
.di-interaction-warning.contraindicated { background: rgba(180,0,0,.12); border: 1.5px solid rgba(255,0,0,.4); }
.di-interaction-warning.none          { background: rgba(0,229,160,.06); border: 1px solid rgba(0,229,160,.15); }

/* Interactions tab */
.di-checker { max-width: 720px; }
.di-checker-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.di-checker-sub { font-size: 13px; color: var(--text2); margin-bottom: 20px; }
.di-drug-tags { display: flex; flex-wrap: wrap; gap: 7px; padding: 12px; min-height: 52px; background: rgba(255,255,255,.04); border: 1.5px solid var(--border); border-radius: 12px; margin-bottom: 12px; cursor: text; }
.di-drug-tags:focus-within { border-color: rgba(0,229,160,.5); box-shadow: 0 0 0 3px rgba(0,229,160,.08); }
.di-drug-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 7px; background: rgba(61,155,255,.1); border: 1px solid rgba(61,155,255,.25); color: var(--accent2); font-size: 12px; font-weight: 700; }
.di-drug-tag-remove { width: 14px; height: 14px; border-radius: 50%; background: rgba(61,155,255,.2); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.di-drug-tag-remove svg { width: 8px; height: 8px; }
.di-drug-tag-input { flex: 1; min-width: 120px; border: none; outline: none; background: transparent; color: var(--text); font-size: 14px; font-family: 'DM Sans', sans-serif; padding: 2px 0; }
.di-drug-tag-input::placeholder { color: var(--text3); }
.di-check-btn { width: 100%; padding: 16px; border-radius: 14px; background: linear-gradient(135deg, var(--accent2), var(--accent)); color: #000; font-size: 15px; font-weight: 800; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all .25s; box-shadow: 0 4px 20px rgba(61,155,255,.25); margin-bottom: 24px; }
.di-check-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(61,155,255,.35); }
.di-check-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.di-severity-banner { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 14px; margin-bottom: 16px; }
.sev-none           { background: rgba(0,229,160,.08); border: 1px solid rgba(0,229,160,.2); color: var(--accent); }
.sev-minor          { background: rgba(255,184,0,.08); border: 1px solid rgba(255,184,0,.2); color: #ffb800; }
.sev-moderate       { background: rgba(255,124,43,.08); border: 1px solid rgba(255,124,43,.25); color: #ff7c2b; }
.sev-severe         { background: rgba(255,59,59,.1); border: 1.5px solid rgba(255,59,59,.3); color: #ff3b3b; }
.sev-contraindicated{ background: rgba(180,0,0,.15); border: 2px solid rgba(255,0,0,.5); color: #ff0000; }
.di-disclaimer-box { font-size: 11px; color: var(--text3); padding: 12px 14px; background: rgba(61,155,255,.05); border: 1px solid rgba(61,155,255,.12); border-radius: 10px; line-height: 1.6; margin-top: 16px; }

/* AI Modal */
.di-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: di-fade-in .2s ease; }
@keyframes di-fade-in { from { opacity: 0; } to { opacity: 1; } }
.di-modal { width: 100%; max-width: 540px; background: #0c0e12; border: 1px solid rgba(255,255,255,.1); border-radius: 24px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 30px 60px rgba(0,0,0,.5); }
.di-modal-close { position: absolute; top: 20px; right: 20px; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.06); border: none; color: var(--text2); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; }
.di-modal-close:hover { background: rgba(255,255,255,.12); color: var(--text); }
.di-ai-header { padding: 32px 32px 20px; }
.di-ai-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; margin-bottom: 8px; }
.di-ai-title span { background: linear-gradient(135deg, var(--accent2), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.di-ai-body { padding: 0 32px 40px; }
.di-ai-box { background: rgba(61,155,255,.05); border: 1px solid rgba(61,155,255,.12); border-radius: 16px; padding: 20px; margin-bottom: 24px; line-height: 1.6; font-size: 14px; color: var(--text); }
.di-explain-keypoint { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; font-size: 13.5px; color: var(--text2); }
.di-explain-keypoint svg { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
.di-explain-warning { display: flex; gap: 12px; padding: 14px 18px; background: rgba(255,59,59,.08); border: 1px solid rgba(255,59,59,.2); border-radius: 12px; color: #ff5c5c; font-size: 13px; font-weight: 500; margin-bottom: 24px; }
.di-ai-btn { width: 100%; padding: 14px; background: rgba(0,229,160,.1); border: 1px solid rgba(0,229,160,.2); color: var(--accent); border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all .2s; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.di-ai-btn:hover { background: rgba(0,229,160,.18); transform: translateY(-2px); }
`;

const SEVERITY_COLORS: Record<string, string> = {
  none:            "#00e5a0",
  minor:           "#ffb800",
  moderate:        "#ff7c2b",
  severe:          "#ff3b3b",
  contraindicated: "#ff0000",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DrugCard({ drug, onClick }: { drug: Drug; onClick: () => void }) {
  return (
    <div className="di-drug-card" onClick={onClick}>
      <div className="di-drug-card-header">
        <div className="di-drug-icon"><Ic.Pill /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="di-drug-name">{drug.name}</div>
          <div className="di-drug-generic">{drug.genericName}</div>
        </div>
      </div>
      <div className="di-drug-badges">
        <span className="di-badge di-badge-cat">{drug.category}</span>
        {drug.requiresPrescription
          ? <span className="di-badge di-badge-rx">Rx Only</span>
          : <span className="di-badge di-badge-otc">OTC</span>}
        {drug.controlled && <span className="di-badge di-badge-ctrl">Controlled</span>}
        {drug.form && <span className="di-badge" style={{ background: 'rgba(199,125,255,.1)', color: '#c77dff', border: '1px solid rgba(199,125,255,.2)' }}>{drug.form}</span>}
      </div>
      <div className="di-drug-price">{drug.priceDisplay || (drug.priceRangeMin ? `₦${drug.priceRangeMin.toLocaleString()} – ₦${drug.priceRangeMax.toLocaleString()}` : "Price unavailable")}</div>
      {drug.strength && <div className="di-drug-form">{drug.strength}</div>}
    </div>
  );
}

function DrugDetail({ drug, onBack, onExplain }: { drug: Drug; onBack: () => void; onExplain: () => void }) {
  return (
    <div className="di-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <button className="di-back-btn" onClick={onBack}><Ic.ChevLeft /> Back to search</button>
        <button className="di-ai-btn" style={{ width: 'auto', margin: 0, padding: '8px 16px' }} onClick={onExplain}>
          <Ic.Message /> Ask AI about this drug
        </button>
      </div>

      <div className="di-detail-header">
        <div className="di-detail-icon"><Ic.Pill /></div>
        <div>
          <div className="di-detail-name">{drug.name}</div>
          <div className="di-detail-generic">{drug.genericName} {drug.strength && `· ${drug.strength}`}</div>
        </div>
      </div>

      <div className="di-detail-meta">
        <span className="di-meta-chip"><Ic.Pill /> {drug.category}</span>
        {drug.form && <span className="di-meta-chip">{drug.form}</span>}
        {drug.manufacturer && <span className="di-meta-chip">{drug.manufacturer}</span>}
        {drug.nafdacNumber && <span className="di-meta-chip" style={{ color: 'var(--accent)', borderColor: 'rgba(0,229,160,.2)' }}>NAFDAC: {drug.nafdacNumber}</span>}
        {drug.atcCode && <span className="di-meta-chip" style={{ fontFamily: 'DM Mono, monospace' }}>ATC: {drug.atcCode}</span>}
        <span className="di-meta-chip" style={{ color: drug.requiresPrescription ? '#ff5c5c' : 'var(--accent)' }}>
          {drug.requiresPrescription ? <><Ic.Lock /> Prescription required</> : "OTC — No prescription needed"}
        </span>
        {drug.controlled && <span className="di-meta-chip" style={{ color: '#ffb800', borderColor: 'rgba(255,184,0,.2)' }}>⚠ Controlled substance</span>}
      </div>

      {/* Price */}
      {(drug.priceRangeMin > 0 || drug.priceDisplay) && (
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(0,229,160,.05)', border: '1px solid rgba(0,229,160,.15)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Estimated Price (Nigeria)</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>
            {drug.priceDisplay || `₦${drug.priceRangeMin.toLocaleString()} – ₦${drug.priceRangeMax.toLocaleString()}`}
          </div>
        </div>
      )}

      <div className="di-detail-grid">
        {drug.uses.length > 0 && (
          <div className="di-detail-card">
            <div className="di-detail-card-title">What it&apos;s used for</div>
            <div className="di-detail-list">
              {drug.uses.map((u, i) => <div key={i} className="di-detail-list-item">{u}</div>)}
            </div>
          </div>
        )}

        {drug.sideEffects.length > 0 && (
          <div className="di-detail-card">
            <div className="di-detail-card-title" style={{ color: '#ffb800' }}>Side effects</div>
            <div className="di-detail-list">
              {drug.sideEffects.map((s, i) => <div key={i} className="di-detail-list-item">{s}</div>)}
            </div>
          </div>
        )}

        {drug.contraindications.length > 0 && (
          <div className="di-detail-card">
            <div className="di-detail-card-title" style={{ color: '#ff5c5c' }}>Do NOT take if</div>
            <div className="di-detail-list">
              {drug.contraindications.map((c, i) => <div key={i} className="di-detail-list-item">{c}</div>)}
            </div>
          </div>
        )}

        {drug.interactions.length > 0 && (
          <div className="di-detail-card">
            <div className="di-detail-card-title" style={{ color: '#c77dff' }}>Known interactions with</div>
            <div className="di-detail-list">
              {drug.interactions.map((d, i) => <div key={i} className="di-detail-list-item">{d}</div>)}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>
              Use the Interaction Checker tab for a full AI-powered analysis.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DrugAIExplainModal({ drug, onClose }: { drug: Drug; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<DrugExplanation | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchExplanation = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user?.id) headers["x-user-id"] = user.id;

        const data = await api.post<DrugExplanation>(
          "/api/v1/drugs/explain",
          { drugName: drug.name },
          { headers }
        );
        setExplanation(data);
      } catch (err) {
        console.error("Failed to fetch explanation:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExplanation();
  }, [drug.name, user]);

  return (
    <div className="di-modal-overlay" onClick={onClose}>
      <div className="di-modal" onClick={e => e.stopPropagation()}>
        <button className="di-modal-close" onClick={onClose}><Ic.X /></button>
        
        <div className="di-ai-header">
          <div className="di-eyebrow" style={{ marginBottom: 4 }}><div className="di-eyebrow-dot" /> Powered by MedBridge AI</div>
          <h2 className="di-ai-title">Understanding <span>{drug.name}</span></h2>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>A plain-English guide to your medication.</div>
        </div>

        <div className="di-ai-body">
          {loading ? (
            <div className="di-loading"><div className="di-spinner" /></div>
          ) : explanation ? (
            <>
              <div className="di-ai-box">
                {explanation.explanation}
              </div>

              {explanation.warning && (
                <div className="di-explain-warning">
                  <Ic.Warning />
                  <div><strong>Important Warning:</strong> {explanation.warning}</div>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div className="di-detail-card-title">Key Points for Patients</div>
                {explanation.keyPoints.map((pt, i) => (
                  <div key={i} className="di-explain-keypoint">
                    <Ic.Plus /> {pt}
                  </div>
                ))}
              </div>

              <div className="di-disclaimer-box" style={{ marginTop: 0 }}>
                <Ic.Info /> {explanation.disclaimer}
              </div>
            </>
          ) : (
            <div className="di-empty">Failed to load explanation. Please try again.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InteractionChecker() {
  const [drugTags, setDrugTags] = useState<string[]>([]);
  const [inputVal, setInputVal]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<InteractionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const addDrug = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !drugTags.includes(trimmed) && drugTags.length < 8) {
      setDrugTags(prev => [...prev, trimmed]);
    }
    setInputVal("");
  };

  const removeDrug = (name: string) => setDrugTags(prev => prev.filter(d => d !== name));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
      e.preventDefault();
      addDrug(inputVal);
    }
    if (e.key === "Backspace" && !inputVal && drugTags.length > 0) {
      setDrugTags(prev => prev.slice(0, -1));
    }
  };

  const handleCheck = async () => {
    if (drugTags.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) headers["x-user-id"] = user.id;

      const data = await api.post<InteractionResult>(
        "/api/v1/drugs/interactions",
        { drugNames: drugTags },
        { headers }
      );
      setResult(data);
    } catch (err) {
      console.error("Interaction check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const sev = result?.severity || "none";
  const sevLabel: Record<string, string> = {
    none: "No significant interactions found",
    minor: "Minor interactions detected",
    moderate: "Moderate interactions — consult pharmacist",
    severe: "Severe interactions — seek medical advice",
    contraindicated: "⛔ CONTRAINDICATED — Do not combine",
  };

  return (
    <div className="di-checker">
      <div className="di-checker-title">Drug Interaction Checker</div>
      <div className="di-checker-sub">Add 2–8 drugs (brand name or generic) and check for interactions. Press Enter or comma to add each drug.</div>

      <div className="di-drug-tags" onClick={() => inputRef.current?.focus()}>
        {drugTags.map(d => (
          <span key={d} className="di-drug-tag">
            {d}
            <span className="di-drug-tag-remove" onClick={() => removeDrug(d)}><Ic.X /></span>
          </span>
        ))}
        <input
          ref={inputRef}
          className="di-drug-tag-input"
          placeholder={drugTags.length === 0 ? "Type a drug name and press Enter..." : "Add another drug..."}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputVal.trim()) addDrug(inputVal); }}
        />
      </div>

      <button
        className="di-check-btn"
        onClick={handleCheck}
        disabled={drugTags.length < 2 || loading}
      >
        {loading
          ? <><div className="di-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Checking interactions...</>
          : <><Ic.Zap /> Check {drugTags.length} drug{drugTags.length !== 1 ? "s" : ""} for interactions</>
        }
      </button>

      {result && (
        <div style={{ animation: 'di-enter .3s ease' }}>
          <div className={`di-severity-banner sev-${sev}`}>
            <Ic.Warning />
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15 }}>{sevLabel[sev] || sevLabel.none}</div>
              <div style={{ fontSize: 12, marginTop: 3, opacity: .85 }}>{result.summary}</div>
            </div>
          </div>

          {result.interactions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.interactions.map((pair, i) => (
                <div key={i} className={`di-interaction-warning ${pair.severity}`}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {pair.drug1} + {pair.drug2}
                      <span style={{ fontSize: 10, fontFamily: 'DM Mono', padding: '2px 7px', borderRadius: 100, marginLeft: 8, background: 'rgba(0,0,0,.2)', color: SEVERITY_COLORS[pair.severity] }}>
                        {pair.severity.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, lineHeight: 1.5 }}><strong>Effect:</strong> {pair.clinicalEffect}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, lineHeight: 1.5 }}><strong>Mechanism:</strong> {pair.mechanism}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, fontWeight: 600 }}>💊 {pair.management}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="di-disclaimer-box"><Ic.Info /> {result.disclaimer}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DrugIntelligencePage() {
  const { user } = useAuthStore();
  const [tab, setTab]             = useState<"search" | "interactions">("search");
  const [query, setQuery]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [rxFilter, setRxFilter]   = useState<string>("");
  const [results, setResults]     = useState<Drug[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [explainingDrug, setExplainingDrug] = useState<Drug | null>(null);

  // Fetch categories once
  useEffect(() => {
    api.get<string[]>("/api/v1/drugs/categories").then(setCategories).catch(() => {});
  }, []);

  // Search with debounce
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, cat: string, rx: string, pg: number) => {
    if (!q.trim() && !cat) {
      setResults([]); setTotal(0); return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim())  params.set("q", q.trim());
      if (cat)       params.set("category", cat);
      if (rx)        params.set("rx", rx);
      params.set("page", String(pg));
      params.set("per_page", "24");

      const headers: Record<string, string> = {};
      if (user?.id) headers["x-user-id"] = user.id;
      const data = await api.get<SearchResult>(`/api/v1/drugs/search?${params}`, { headers });
      setResults(data.hits);
      setTotal(data.total);
    } catch (err) {
      console.error("Drug search failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      doSearch(query, categoryFilter, rxFilter, 1);
    }, 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, categoryFilter, rxFilter, doSearch]);

  if (selectedDrug) {
    return (
      <>
        <style>{CSS}</style>
        <div className="di-page">
          <DrugDetail
            drug={selectedDrug}
            onBack={() => setSelectedDrug(null)}
            onExplain={() => setExplainingDrug(selectedDrug)}
          />
          {explainingDrug && <DrugAIExplainModal drug={explainingDrug} onClose={() => setExplainingDrug(null)} />}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="di-page">
        <div className="di-header">
          <div className="di-eyebrow"><div className="di-eyebrow-dot" /> NAFDAC Database</div>
          <h1 className="di-title">Drug <span>Intelligence</span></h1>
          <p className="di-subtitle">Search 5,000+ NAFDAC-registered drugs. Check interactions. Understand your medications.</p>
        </div>

        <div className="di-tabs">
          <button className={`di-tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
            <Ic.Search /> Drug Search
          </button>
          <button className={`di-tab ${tab === "interactions" ? "active" : ""}`} onClick={() => setTab("interactions")}>
            <Ic.Warning /> Interaction Checker
          </button>
        </div>

        {tab === "search" && (
          <>
            <div className="di-search-wrap">
              <span className="di-search-icon"><Ic.Search /></span>
              <input
                className="di-search-input"
                type="text"
                placeholder="Search by drug name, generic name, or condition..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="di-filters">
              <button className={`di-filter-btn ${!categoryFilter ? "active" : ""}`} onClick={() => setCategoryFilter("")}>All Categories</button>
              {categories.slice(0, 10).map(cat => (
                <button key={cat} className={`di-filter-btn ${categoryFilter === cat ? "active" : ""}`} onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}>
                  {cat}
                </button>
              ))}
              <button className={`di-filter-btn ${rxFilter === "false" ? "active" : ""}`} onClick={() => setRxFilter(rxFilter === "false" ? "" : "false")}>OTC Only</button>
              <button className={`di-filter-btn ${rxFilter === "true" ? "active" : ""}`} onClick={() => setRxFilter(rxFilter === "true" ? "" : "true")}>Prescription Only</button>
            </div>

            {loading && <div className="di-loading"><div className="di-spinner" /></div>}

            {!loading && results.length > 0 && (
              <>
                <div className="di-results-count">{total.toLocaleString()} results</div>
                <div className="di-drug-grid">
                  {results.map(drug => (
                    <DrugCard key={drug.id} drug={drug} onClick={() => setSelectedDrug(drug)} />
                  ))}
                </div>
              </>
            )}

            {!loading && results.length === 0 && (query.trim() || categoryFilter) && (
              <div className="di-empty">
                <Ic.Pill />
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No drugs found</div>
                <div>Try a different name, generic, or category</div>
              </div>
            )}

            {!loading && !query.trim() && !categoryFilter && (
              <div className="di-empty">
                <Ic.Search />
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Search the drug database</div>
                <div>Type a drug name, active ingredient, or medical condition above</div>
              </div>
            )}
          </>
        )}

        {tab === "interactions" && <InteractionChecker />}
      </div>
    </>
  );
}