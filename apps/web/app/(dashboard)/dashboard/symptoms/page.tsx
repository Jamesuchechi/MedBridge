"use client";

import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent, type CSSProperties,
} from "react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type View = "input" | "loading" | "results" | "emergency" | "history" | "detail";
type Urgency = "low" | "moderate" | "high" | "emergency";

interface SymptomCheck {
  id: string;
  symptoms: string[];
  duration: string;
  durationUnit: "hours" | "days" | "weeks";
  severity: number;
  hasFever: boolean;
  location: string;
  knownConditions: string[];
  createdAt: string;
  result?: AnalysisResult;
}

interface Condition {
  name: string;
  probability: number; // 0–100
  description: string;
  icdCode: string;
  afridxAdjusted: boolean;
}

interface AnalysisResult {
  urgency: Urgency;
  urgencyScore: number;
  conditions: Condition[];
  nextSteps: string[];
  afridxInsight: string;
  disclaimer: string;
  checkId: string;
}

interface AnalysisResponse {
  result: AnalysisResult;
  urgency: Urgency;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYMPTOM TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────
const SYMPTOM_TAXONOMY: string[] = [
  "Fever","High fever","Low-grade fever","Headache","Severe headache","Migraine",
  "Fatigue","Extreme fatigue","Body aches","Joint pain","Muscle pain","Back pain",
  "Chest pain","Chest tightness","Shortness of breath","Difficulty breathing",
  "Cough","Dry cough","Productive cough","Coughing blood",
  "Nausea","Vomiting","Diarrhoea","Bloody diarrhoea","Constipation","Abdominal pain",
  "Sore throat","Runny nose","Nasal congestion","Sneezing","Loss of smell","Loss of taste",
  "Rash","Itching","Hives","Yellowing of skin","Yellowing of eyes",
  "Dizziness","Fainting","Loss of consciousness","Confusion","Seizure",
  "Rapid heartbeat","Irregular heartbeat","Swelling in legs","Swollen lymph nodes",
  "Frequent urination","Pain during urination","Blood in urine","Dark urine",
  "Eye pain","Eye redness","Blurred vision","Sensitivity to light",
  "Ear pain","Hearing loss","Ringing in ears",
  "Weight loss","Weight gain","Increased thirst","Increased hunger","Excessive sweating",
  "Night sweats","Chills","Rigors","Cold extremities","Numbness","Tingling",
  "Weakness in limbs","Difficulty walking","Neck stiffness",
  "Vaginal discharge","Pelvic pain","Irregular periods","Breast pain",
  "Testicular pain","Penile discharge",
];

const KNOWN_CONDITIONS = [
  "Hypertension","Diabetes","Asthma","Sickle Cell","HIV/AIDS","Malaria (recurring)",
  "Tuberculosis","Hepatitis B","Heart Disease","Kidney Disease","Epilepsy","Cancer",
];

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Ic = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Activity: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  AlertTriangle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  AlertCircle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Thermometer: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Info: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  Phone: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.3 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  ListPlus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>,
  HeartPulse: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l1.5-3 2 6 1.5-3h6.78"/></svg>,
  ExternalLink: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap');

:root {
  --bg: #03050a; --bg2: #080c14; --bg3: #0d1220;
  --glass: rgba(255,255,255,0.035); --glass-h: rgba(255,255,255,0.065);
  --border: rgba(255,255,255,0.07); --border-h: rgba(255,255,255,0.16);
  --text: #f0f4ff; --text2: rgba(240,244,255,0.5); --text3: rgba(240,244,255,0.22);
  --accent: #00e5a0; --accent2: #3d9bff; --accent3: #c77dff;
  --warn: #ffb800; --danger: #ff5c5c;
  --low: #00e5a0; --moderate: #ffb800; --high: #ff7c2b; --emergency: #ff3b3b;
  --card: rgba(255,255,255,0.03); --card-b: rgba(255,255,255,0.07);
}
[data-theme="light"] {
  --bg: #f8fafc; --bg2: #eff4f9; --bg3: #e2eaf3;
  --glass: rgba(255,255,255,0.7); --glass-h: rgba(255,255,255,0.9);
  --border: rgba(0,0,0,0.08); --border-h: rgba(0,168,112,0.25);
  --text: #0f172a; --text2: rgba(15,23,42,0.6); --text3: rgba(15,23,42,0.35);
  --accent: #00a870; --accent2: #1a6fcc;
  --card: rgba(255,255,255,0.8); --card-b: rgba(0,0,0,0.08);
}

.sc-page {
  width: 100%; max-width: 1200px;
  padding: 32px 0 80px;
  animation: sc-enter .35s ease both;
}
@keyframes sc-enter { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

/* ── ... Remaining CSS from user request ... ── */
.sc-header { margin-bottom: 28px; }
.sc-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Mono', monospace;
  font-size: 10px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 10px; opacity: .85;
}
.sc-eyebrow-dot { width:5px;height:5px;border-radius:50%;background:var(--accent);animation:dot-pulse 2s ease infinite; }
@keyframes dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.sc-title {
  font-family: 'Syne', sans-serif;
  font-size: clamp(22px,3vw,32px); font-weight: 800;
  letter-spacing: -.7px; color: var(--text); line-height: 1.1; margin-bottom: 6px;
}
.sc-title span { background: linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.sc-subtitle { font-size: 14px; color: var(--text2); }

.sc-tabs {
  display: flex; gap: 4px;
  background: var(--card); border: 1px solid var(--card-b);
  border-radius: 12px; padding: 4px;
  margin-bottom: 24px; width: fit-content;
}
.sc-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 8px;
  background: transparent; border: none;
  color: var(--text2); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif;
}
.sc-tab svg { width: 15px; height: 15px; }
.sc-tab:hover { color: var(--text); background: var(--glass-h); }
.sc-tab.active { background: var(--accent); color: #000; box-shadow: 0 3px 12px rgba(0,229,160,.3); }

.sc-card {
  background: var(--card); border: 1px solid var(--card-b);
  border-radius: 20px; padding: 24px; margin-bottom: 16px;
}
.sc-card-title {
  font-family: 'Syne', sans-serif;
  font-size: 15px; font-weight: 700; color: var(--text);
  margin-bottom: 16px;
  display: flex; align-items: center; gap: 8px;
}
.sc-card-title svg { width: 18px; height: 18px; color: var(--accent); flex-shrink: 0; }

.sc-tag-input-wrap {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 10px 12px; min-height: 54px;
  background: rgba(255,255,255,.04);
  border: 1.5px solid var(--border);
  border-radius: 12px; cursor: text;
  transition: all .2s; position: relative;
}
.sc-tag-input-wrap:focus-within {
  border-color: rgba(0,229,160,.5);
  box-shadow: 0 0 0 3px rgba(0,229,160,.08);
}
.sc-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 8px;
  background: rgba(0,229,160,.1); border: 1px solid rgba(0,229,160,.25);
  color: var(--accent); font-size: 12px; font-weight: 700;
  animation: tag-pop .2s cubic-bezier(.175,.885,.32,1.275);
}
@keyframes tag-pop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
.sc-tag-remove {
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(0,229,160,.2); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .15s;
}
.sc-tag-remove:hover { background: rgba(0,229,160,.4); }
.sc-tag-remove svg { width: 8px; height: 8px; }
.sc-tag-text-input {
  flex: 1; min-width: 120px; border: none; outline: none;
  background: transparent; color: var(--text);
  font-size: 14px; font-family: 'DM Sans', sans-serif;
  padding: 2px 0;
}
.sc-tag-text-input::placeholder { color: var(--text3); }

.sc-autocomplete {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  background: var(--bg2); border: 1px solid var(--border-h);
  border-radius: 14px; box-shadow: 0 16px 48px rgba(0,0,0,.4);
  z-index: 100; overflow: hidden;
  animation: ac-in .15s ease;
}
@keyframes ac-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.sc-autocomplete-item {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; cursor: pointer; transition: background .12s;
  font-size: 14px;
}
.sc-autocomplete-item:hover, .sc-autocomplete-item.highlighted { background: var(--glass-h); }
.sc-autocomplete-item-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); opacity: .5; }
.sc-autocomplete-item.highlighted .sc-autocomplete-item-dot { opacity: 1; }

.sc-duration-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sc-duration-input {
  width: 90px; padding: 10px 14px;
  background: rgba(255,255,255,.04); border: 1.5px solid var(--border);
  border-radius: 10px; color: var(--text);
  font-size: 16px; font-family: 'DM Mono', monospace; font-weight: 700;
  outline: none; transition: all .2s; text-align: center;
}
.sc-duration-input:focus { border-color: rgba(0,229,160,.5); box-shadow: 0 0 0 3px rgba(0,229,160,.08); }
.sc-unit-btn {
  padding: 9px 16px; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--glass);
  color: var(--text2); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .2s;
}
.sc-unit-btn.active {
  border-color: var(--accent2); background: rgba(61,155,255,.1);
  color: var(--accent2);
}

.sc-slider {
  width: 100%; height: 6px; border-radius: 100px;
  outline: none; cursor: pointer; -webkit-appearance: none;
  background: linear-gradient(90deg, var(--low) 0%, var(--moderate) 40%, var(--high) 70%, var(--emergency) 100%);
  margin-bottom: 12px;
}
.sc-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 24px; height: 24px; border-radius: 50%;
  background: #fff; border: 3px solid var(--slider-color, var(--accent));
  box-shadow: 0 2px 12px rgba(0,0,0,.3);
  cursor: pointer; transition: transform .15s;
}
.sc-slider-wrap { padding: 4px 0 16px; }
.sc-severity-labels {
  display: flex; justify-content: space-between;
  font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text3);
}
.sc-severity-value {
  text-align: center; margin-top: 8px;
  font-family: 'Syne', sans-serif;
  font-size: 28px; font-weight: 800;
}

.sc-context-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.sc-toggle-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; border-radius: 12px;
  border: 1.5px solid var(--border); background: var(--glass);
  cursor: pointer; transition: all .2s; color: var(--text2); font-size: 14px; font-weight: 600;
}
.sc-toggle-btn svg { width: 20px; height: 20px; flex-shrink: 0; }
.sc-toggle-btn.active {
  border-color: var(--toggle-color, var(--warn));
  background: color-mix(in srgb, var(--toggle-color, var(--warn)) 10%, transparent);
  color: var(--toggle-color, var(--warn));
}
.sc-toggle-indicator {
  margin-left: auto; width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid currentColor;
  display: flex; align-items: center; justify-content: center;
}
.sc-toggle-btn.active .sc-toggle-indicator { background: currentColor; }
.sc-toggle-btn.active .sc-toggle-indicator svg { stroke: #000; }

.sc-cond-chip {
  padding: 5px 12px; border-radius: 100px;
  border: 1.5px solid var(--border); background: var(--glass);
  color: var(--text2); font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all .18s; font-family: 'DM Mono', monospace;
}
.sc-cond-chip.selected {
  border-color: var(--accent3); background: rgba(199,125,255,.1);
  color: var(--accent3);
}

.sc-input {
  width: 100%; padding: 10px 14px 10px 36px;
  background: rgba(255,255,255,.04); border: 1.5px solid var(--border);
  border-radius: 10px; color: var(--text); font-size: 14px;
}
.sc-location-wrap { position: relative; margin-top: 12px; }
.sc-location-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text3); display: flex; }

.sc-submit {
  width: 100%; padding: 18px; border-radius: 16px;
  background: linear-gradient(135deg,var(--accent),var(--accent2));
  color: #000; font-size: 16px; font-weight: 800;
  cursor: pointer; border: none; transition: all .25s;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  box-shadow: 0 4px 24px rgba(0,229,160,.28);
}
.sc-submit svg { width: 22px; height: 22px; flex-shrink: 0; }
.sc-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 36px rgba(0,229,160,.4); }
.sc-submit:disabled { opacity: .5; cursor: not-allowed; }

.sc-loading {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 24px; text-align: center;
}
.sc-loading-ring-svg { animation: spin 1.2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.sc-loading-ring-track { stroke: var(--border); }
.sc-loading-ring-fill {
  stroke: var(--accent); stroke-linecap: round;
  stroke-dasharray: 160; stroke-dashoffset: 40;
}
.sc-loading-steps {
  display: flex; flex-direction: column; gap: 10px;
  margin-top: 28px; width: 100%; max-width: 380px;
}
.sc-loading-step {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px; border-radius: 11px;
  background: var(--card); border: 1px solid var(--card-b);
  font-size: 13px; color: var(--text2);
}
.sc-loading-step.active { color: var(--accent); border-color: rgba(0,229,160,.2); }
.sc-loading-step-icon {
  width: 24px; height: 24px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--glass);
}
.sc-loading-step.active .sc-loading-step-icon { background: rgba(0,229,160,.15); color: var(--accent); }

.sc-urgency-banner {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 18px 20px; border-radius: 16px; margin-bottom: 16px;
  border: 1.5px solid;
}
.sc-urgency-banner.low { background: rgba(0,229,160,.07); border-color: rgba(0,229,160,.25); }
.sc-urgency-banner.moderate { background: rgba(255,184,0,.07); border-color: rgba(255,184,0,.25); }
.sc-urgency-banner.high { background: rgba(255,124,43,.08); border-color: rgba(255,124,43,.28); }
.sc-urgency-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.sc-urgency-icon svg { width: 22px; height: 22px; }
.sc-urgency-banner.low .sc-urgency-icon { background: rgba(0,229,160,.15); color: var(--low); }
.sc-urgency-banner.moderate .sc-urgency-icon { background: rgba(255,184,0,.15); color: var(--moderate); }
.sc-urgency-banner.high .sc-urgency-icon { background: rgba(255,124,43,.15); color: var(--high); }
.sc-urgency-score-pill {
  margin-left: auto; width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.06); font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
}

.sc-condition-item {
  padding: 16px; border-radius: 14px;
  background: var(--glass); border: 1px solid var(--border);
  margin-bottom: 10px;
}
.sc-condition-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.sc-condition-name { font-size: 14px; font-weight: 700; color: var(--text); flex: 1; }
.sc-condition-afridx {
  font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 600;
  padding: 2px 7px; border-radius: 100px; background: rgba(0,229,160,.1); color: var(--accent);
}
.sc-prob-track { flex: 1; height: 5px; background: var(--border); border-radius: 100px; overflow: hidden; }
.sc-prob-fill { height: 100%; border-radius: 100px; animation: prob-grow 1s ease forwards; }
@keyframes prob-grow { from { width: 0; } }

.sc-step-item {
  display: flex; gap: 11px; align-items: flex-start;
  padding: 12px 14px; border-radius: 12px;
  background: var(--glass); border: 1px solid var(--border);
  font-size: 13px; color: var(--text2);
}
.sc-step-num {
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(0,229,160,.12); color: var(--accent);
  display: flex; align-items: center; justify-content: center; font-size: 10px;
}
.sc-step-num svg { width: 12px; height: 12px; }

.sc-afridx-box {
  display: flex; gap: 13px; padding: 16px;
  background: linear-gradient(135deg,rgba(0,229,160,.05),rgba(61,155,255,.05));
  border: 1px solid rgba(0,229,160,.15); border-radius: 14px;
}
.sc-disclaimer {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 13px 15px; background: rgba(61,155,255,.05);
  border-radius: 12px; font-size: 12px; color: var(--text2);
}

.sc-clinic-cta {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  background: rgba(0,229,160,.06); border: 1px solid rgba(0,229,160,.18);
  margin-top: 12px;
}

.sc-emergency {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(20,0,0,.97);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 32px 24px; text-align: center;
}
.sc-emergency-pulse {
  width: 100px; height: 100px; border-radius: 50%; margin-bottom: 28px;
  background: rgba(255,59,59,.15); border: 2px solid rgba(255,59,59,.4);
  display: flex; align-items: center; justify-content: center; color: #ff3b3b;
  animation: e-pulse 1.4s ease-in-out infinite;
}
@keyframes e-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.sc-emergency-call {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 16px; border-radius: 14px; background: #ff3b3b; color: #fff;
  font-size: 16px; font-weight: 800; text-decoration: none;
}

.sc-history-item {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  background: var(--card); border: 1px solid var(--card-b);
  cursor: pointer; transition: transform .2s;
}
.sc-history-item:hover { transform: translateX(3px); border-color: var(--border-h); }
.sc-urgency-dot { width: 10px; height: 10px; border-radius: 50%; }

.sc-metadata-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.sc-meta-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 8px;
  background: var(--glass); border: 1px solid var(--border);
  font-size: 12px; color: var(--text2);
}
.sc-history-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 12px;
  background: rgba(61,155,255,0.08); border: 1px solid rgba(61,155,255,0.2);
  color: var(--accent2); font-size: 13px; font-weight: 600;
  margin-bottom: 16px;
}
.sc-history-banner svg { width: 16px; height: 16px; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const EMERGENCY_KEYWORDS = [
  "chest pain","difficulty breathing","unconscious","loss of consciousness",
  "severe bleeding","coughing blood","seizure","stroke","sudden weakness",
];

function isEmergencyTrigger(symptoms: string[]): boolean {
  const lower = symptoms.map(s => s.toLowerCase());
  return EMERGENCY_KEYWORDS.some(kw => lower.some(s => s.includes(kw)));
}

function urgencyColor(u: Urgency): string {
  return { low: "var(--low)", moderate: "var(--moderate)", high: "var(--high)", emergency: "var(--emergency)" }[u];
}
function urgencyLabel(u: Urgency): string {
  return { low: "Low urgency", moderate: "Moderate urgency", high: "High urgency — see a doctor today", emergency: "EMERGENCY — seek care immediately" }[u];
}
function urgencyDesc(u: Urgency): string {
  return {
    low: "Symptoms are consistent with mild illness. Rest, hydrate, and monitor. See a doctor if symptoms persist or worsen.",
    moderate: "Symptoms warrant professional evaluation within 24–48 hours. Monitor for any worsening signs.",
    high: "Symptom severity indicates you should see a doctor today. Do not delay — same-day consultation recommended.",
    emergency: "This is a medical emergency. Stop what you are doing and seek emergency care immediately.",
  }[u];
}
function probColor(p: number): string {
  if (p >= 70) return "var(--high)";
  if (p >= 45) return "var(--moderate)";
  return "var(--low)";
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SymptomTagInput({ symptoms, setSymptoms }: { symptoms: string[]; setSymptoms: (s: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim().length > 0
    ? SYMPTOM_TAXONOMY.filter(s => s.toLowerCase().includes(query.toLowerCase()) && !symptoms.includes(s)).slice(0, 8)
    : [];

  const add = (sym: string) => {
    if (!symptoms.includes(sym)) setSymptoms([...symptoms, sym]);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filtered.length > 0) {
      add(filtered[0]);
      e.preventDefault();
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="sc-tag-input-wrap" onClick={() => inputRef.current?.focus()}>
        {symptoms.map(s => (
          <span key={s} className="sc-tag">
            {s}
            <span className="sc-tag-remove" onClick={() => setSymptoms(symptoms.filter(x => x !== s))}><Ic.X /></span>
          </span>
        ))}
        <input
          ref={inputRef}
          className="sc-tag-text-input"
          placeholder="Add symptom..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="sc-autocomplete">
          {filtered.map(item => (
            <div key={item} className="sc-autocomplete-item" onMouseDown={() => add(item)}>
              <div className="sc-autocomplete-item-dot" /> {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LOADING_STEPS = ["Reading symptoms...", "AfriDx analysis...", "Cross-referencing database...", "Generating report..."];

function LoadingState() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const int = setInterval(() => setStep(s => (s + 1) % LOADING_STEPS.length), 800);
    return () => clearInterval(int);
  }, []);
  return (
    <div className="sc-card sc-loading">
      <svg width="60" height="60" viewBox="0 0 60 60" className="sc-loading-ring-svg">
        <circle cx="30" cy="30" r="25" fill="none" strokeWidth="4" className="sc-loading-ring-track" />
        <circle cx="30" cy="30" r="25" fill="none" strokeWidth="4" className="sc-loading-ring-fill" />
      </svg>
      <div style={{ marginTop: 24, fontWeight: 700 }}>{LOADING_STEPS[step]}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SymptomCheckerPage() {
  const { user } = useAuthStore();
  const [view, setView] = useState<View>("input");
  const [tab, setTab] = useState<"check" | "history">("check");
  const [showEmergency, setShowEmergency] = useState(false);

  // Form State
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState("1");
  const [durationUnit, setDurationUnit] = useState<"hours" | "days" | "weeks">("days");
  const [severity, setSeverity] = useState(5);
  const [hasFever, setHasFever] = useState(false);
  const [location, setLocation] = useState("");
  const [knownConditions, setKnownConditions] = useState<string[]>([]);

  // Data
  const [history, setHistory] = useState<SymptomCheck[]>([]);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<SymptomCheck | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<SymptomCheck[]>("/api/v1/symptoms/history", {
        headers: { "x-user-id": user.id }
      });
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  }, [user]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  const handleSubmit = async () => {
    if (symptoms.length === 0 || !user) return;
    setSelectedHistory(null);

    if (isEmergencyTrigger(symptoms)) setShowEmergency(true);

    setView("loading");
    try {
      const data = await api.post<AnalysisResponse>("/api/v1/symptoms/analyze", {
        symptoms, duration, durationUnit, severity, hasFever, location, knownConditions
      }, {
        headers: { "x-user-id": user.id }
      });
      setCurrentResult(data.result);
      setView(data.urgency === "emergency" ? "emergency" : "results");
      fetchHistory();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Analysis failed. Please try again.");
      } else {
        toast.error("An unexpected error occurred.");
      }
      console.error("Analysis failed", err);
      setView("input");
    }
  };

  const handleHistoryClick = (h: SymptomCheck) => {
    setSelectedHistory(h);
    setSymptoms(h.symptoms);
    setDuration(h.duration);
    setDurationUnit(h.durationUnit);
    setSeverity(h.severity);
    setHasFever(h.hasFever || false);
    setLocation(h.location || "");
    setKnownConditions(h.knownConditions || []);
    setTab("check");
    setView("results");
    if (h.result) setCurrentResult(h.result);
  };

  const handleNewCheck = () => {
    setSymptoms([]);
    setDuration("1");
    setDurationUnit("days");
    setSeverity(5);
    setHasFever(false);
    setLocation("");
    setKnownConditions([]);
    setSelectedHistory(null);
    setCurrentResult(null);
    setView("input");
  };

  return (
    <>
      <style>{CSS}</style>
      
      {showEmergency && (
        <div className="sc-emergency">
          <div className="sc-emergency-pulse"><Ic.AlertTriangle /></div>
          <h1>Seek Emergency Care</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: 400, marginBottom: 32 }}>Your symptoms match patterns for a medical emergency. Seek help immediately.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 360 }}>
            <a href="tel:112" className="sc-emergency-call"><Ic.Phone /> Call 112</a>
            <button className="sc-tab" onClick={() => setShowEmergency(false)} style={{ color: "#fff" }}>Dismiss & See Analysis</button>
          </div>
        </div>
      )}

      <div className="sc-page">
        <div className="sc-header">
          <div className="sc-eyebrow"><div className="sc-eyebrow-dot" /> AfriDx Engine</div>
          <h1 className="sc-title">Symptom <span>Checker</span></h1>
          <p className="sc-subtitle">AI-powered analysis for Nigerian & West African health regional contexts.</p>
        </div>

        <div className="sc-tabs">
          <button className={`sc-tab ${tab === "check" ? "active" : ""}`} onClick={() => setTab("check")}>Check</button>
          <button className={`sc-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>History ({history.length})</button>
        </div>

        {tab === "check" && (
          <>
            {view === "input" && (
              <div style={{ animation: "sc-enter 0.4s ease" }}>
                <div className="sc-card">
                  <div className="sc-card-title"><Ic.ListPlus /> Symptoms</div>
                  <SymptomTagInput symptoms={symptoms} setSymptoms={setSymptoms} />
                </div>

                <div className="sc-card">
                  <div className="sc-card-title"><Ic.Clock /> Duration</div>
                  <div className="sc-duration-row">
                    <input className="sc-duration-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
                    {["hours", "days", "weeks"].map(u => (
                      <button key={u} className={`sc-unit-btn ${durationUnit === u ? "active" : ""}`} onClick={() => setDurationUnit(u as typeof durationUnit)}>{u}</button>
                    ))}
                  </div>
                </div>

                  <div className="sc-card">
                    <div className="sc-card-title"><Ic.HeartPulse /> Severity</div>
                    <div className="sc-slider-wrap">
                      <input className="sc-slider" type="range" min="1" max="10" value={severity} onChange={e => setSeverity(Number(e.target.value))} />
                      <div className="sc-severity-labels"><span>Mild</span><span>Critical</span></div>
                      <div className="sc-severity-value">{severity}</div>
                    </div>
                  </div>

                  <div className="sc-card">
                    <div className="sc-card-title"><Ic.Activity /> Health Context</div>
                    <div className="sc-context-grid">
                      <button 
                        className={`sc-toggle-btn ${hasFever ? "active" : ""}`} 
                        onClick={() => setHasFever(!hasFever)}
                        style={{ "--toggle-color": "var(--warn)" } as CSSProperties}
                      >
                        <Ic.Thermometer /> Fever
                        <div className="sc-toggle-indicator">{hasFever && <Ic.Check />}</div>
                      </button>
                    </div>
                    
                    <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>Pre-existing Conditions</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {KNOWN_CONDITIONS.map(c => (
                        <button 
                          key={c} 
                          className={`sc-cond-chip ${knownConditions.includes(c) ? "selected" : ""}`}
                          onClick={() => {
                            if (knownConditions.includes(c)) setKnownConditions(knownConditions.filter(x => x !== c));
                            else setKnownConditions([...knownConditions, c]);
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="sc-location-wrap">
                      <div className="sc-location-icon"><Ic.MapPin /></div>
                      <input 
                        className="sc-input" 
                        placeholder="Your location (e.g. Lagos, Nigeria)" 
                        value={location} 
                        onChange={e => setLocation(e.target.value)} 
                      />
                    </div>
                  </div>

                <button className="sc-submit" onClick={handleSubmit} disabled={symptoms.length === 0}>
                  <Ic.Zap /> Analyse with AfriDx
                </button>
              </div>
            )}

            {view === "loading" && <LoadingState />}

            {view === "results" && currentResult && (
              <div style={{ animation: "sc-enter 0.4s ease" }}>
                {selectedHistory && (
                  <div className="sc-history-banner">
                    <Ic.History /> Analysis from {formatDate(selectedHistory.createdAt)}
                  </div>
                )}
                <div className={`sc-urgency-banner ${currentResult.urgency}`}>
                  <div className="sc-urgency-icon"><Ic.AlertCircle /></div>
                  <div>
                    <div className="sc-urgency-title">{urgencyLabel(currentResult.urgency)}</div>
                    <div className="sc-urgency-sub">{urgencyDesc(currentResult.urgency)}</div>
                  </div>
                  <div className="sc-urgency-score-pill">{currentResult.urgencyScore}</div>
                </div>

                <div className="sc-card">
                  <div className="sc-card-title"><Ic.Info /> Case Summary</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <div className="sc-meta-chip"><Ic.History /> {symptoms.join(", ")}</div>
                    <div className="sc-meta-chip"><Ic.Clock /> {duration} {durationUnit}</div>
                    <div className="sc-meta-chip"><Ic.Activity /> Severity {severity}/10</div>
                    {hasFever && <div className="sc-meta-chip"><Ic.Thermometer /> Fever</div>}
                    {location && <div className="sc-meta-chip"><Ic.MapPin /> {location}</div>}
                  </div>
                </div>

                <div className="sc-card">
                  <div className="sc-card-title"><Ic.Activity /> Findings</div>
                  {currentResult.conditions.map(c => (
                    <div key={c.name} className="sc-condition-item">
                      <div className="sc-condition-top">
                        <div className="sc-condition-name">{c.name}</div>
                        {c.afridxAdjusted && <span className="sc-condition-afridx">AfriDx</span>}
                      </div>
                      <div className="sc-prob-track">
                        <div className="sc-prob-fill" style={{ width: `${c.probability}%`, background: probColor(c.probability) }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="sc-afridx-box">
                  <div style={{ color: "var(--accent)" }}><Ic.Sparkles /></div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>{currentResult.afridxInsight}</div>
                </div>

                <a 
                  href={`https://www.google.com/maps/search/clinics+near+${encodeURIComponent(location || "Nigeria")}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="sc-clinic-cta"
                  style={{ textDecoration: "none" }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,229,160,0.15)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic.MapPin />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Find a clinic near you</div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>Locate verified medical facilities in {location || "your area"}</div>
                  </div>
                  <Ic.ExternalLink />
                </a>

                <button className="sc-tab" style={{ marginTop: 24, width: "100%", background: "var(--glass)" }} onClick={handleNewCheck}>New Check</button>
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <div className="sc-history-list" style={{ animation: "sc-enter 0.4s ease" }}>
            {history.map(h => (
              <div key={h.id} className="sc-history-item" onClick={() => handleHistoryClick(h)}>
                <div className="sc-urgency-dot" style={{ background: urgencyColor(h.result?.urgency || "low") }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{h.symptoms.join(", ")}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "DM Mono" }}>{formatDate(h.createdAt)}</div>
                </div>
                <Ic.ChevronRight />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
