"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileData {
  firstName: string; lastName: string; dob: string;
  sex: "male" | "female" | "other" | "";
  phone: string; state: string; lga: string;
  bloodType: string; genotype: string;
  weight: string; height: string;
  chronicConditions: string[];
  allergies: Allergy[];
  medications: Medication[];
  familyHistory: string[];
  emergencyName: string; emergencyPhone: string; emergencyRelation: string;
}

interface Allergy { id: string; substance: string; reaction: string; severity: "mild" | "moderate" | "severe"; }
interface Medication { id: string; name: string; dose: string; frequency: string; }

const EMPTY_PROFILE: ProfileData = {
  firstName: "", lastName: "", dob: "", sex: "", phone: "", state: "", lga: "",
  bloodType: "", genotype: "", weight: "", height: "",
  chronicConditions: [], allergies: [], medications: [], familyHistory: [],
  emergencyName: "", emergencyPhone: "", emergencyRelation: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC"];
const NIGERIAN_STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
const CHRONIC_CONDITIONS = ["Hypertension","Diabetes (Type 1)","Diabetes (Type 2)","Asthma","Sickle Cell Disease","Sickle Cell Trait","HIV/AIDS","Tuberculosis","Hepatitis B","Hepatitis C","Chronic Kidney Disease","Heart Disease","Stroke","Epilepsy","Cancer","Thyroid Disease","COPD","Arthritis","Depression","Anxiety"];
const FAMILY_HISTORY = ["Hypertension","Diabetes","Sickle Cell","Heart Disease","Stroke","Cancer","Kidney Disease","Mental Illness","Asthma","Glaucoma","Alzheimer's"];
const ALLERGY_REACTIONS = ["Rash","Swelling","Difficulty breathing","Anaphylaxis","Nausea","Hives","Itching","Other"];
const FREQ_OPTIONS = ["Once daily","Twice daily","Three times daily","Every 6 hours","Every 8 hours","Weekly","As needed"];
const RELATIONS = ["Spouse","Parent","Sibling","Child","Aunt/Uncle","Friend","Colleague","Other"];

const STEPS = [
  { id: 1, key: "personal",    label: "Personal",      short: "You",       color: "#00e5a0" },
  { id: 2, key: "clinical",    label: "Clinical data", short: "Clinical",  color: "#3d9bff" },
  { id: 3, key: "conditions",  label: "Conditions",    short: "History",   color: "#c77dff" },
  { id: 4, key: "medications", label: "Medications",   short: "Meds",      color: "#ff9f43" },
  { id: 5, key: "family",      label: "Family history",short: "Family",    color: "#ff6b9d" },
  { id: 6, key: "emergency",   label: "Emergency",     short: "SOS",       color: "#ff5c5c" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Ic = {
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Heart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Pill: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Phone: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.3 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  AlertTriangle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Info: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Scale: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Activity: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap');

:root {
  --bg:      #03050a; --bg2:     #080c14; --bg3:     #0d1220;
  --glass:   rgba(255,255,255,0.035); --glass-h: rgba(255,255,255,0.06);
  --border:  rgba(255,255,255,0.07); --border-h:rgba(255,255,255,0.15);
  --text:    #f0f4ff; --text2:   rgba(240,244,255,0.5); --text3:   rgba(240,244,255,0.22);
  --accent:  #00e5a0; --accent2: #3d9bff; --accent3: #c77dff; --warn:    #ffb800; --danger:  #ff5c5c;
  --card:    rgba(255,255,255,0.03); --card-b:  rgba(255,255,255,0.07);
}
[data-theme="light"] {
  --bg:      #f0f4f8; --bg2:     #e4ecf5; --bg3:     #dae3f0;
  --glass:   rgba(255,255,255,0.65); --glass-h: rgba(255,255,255,0.88);
  --border:  rgba(0,0,0,0.07); --border-h:rgba(0,150,100,0.25);
  --text:    #0d1117; --text2:   rgba(13,17,23,0.52); --text3:   rgba(13,17,23,0.28);
  --accent:  #00a870; --accent2: #1a6fcc; --accent3: #7c3aed;
  --warn:    #c07c00; --danger:  #d93025; --card:    rgba(255,255,255,0.7); --card-b:  rgba(0,0,0,0.07);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family:'DM Sans',system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; }
.hp-page { min-height:100vh; padding:32px 24px 80px; max-width:820px; margin:0 auto; animation:hp-enter .4s ease both; }
@keyframes hp-enter { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
.hp-header { margin-bottom:32px; }
.hp-eyebrow { display:inline-flex; align-items:center; gap:6px; font-family:'DM Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
.hp-eyebrow-dot { width:5px;height:5px; border-radius:50%; background:var(--accent); animation:dot-pulse 2s ease infinite; }
@keyframes dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.hp-title { font-family:'Syne',sans-serif; font-size:clamp(24px,3vw,34px); font-weight:800; color:var(--text); line-height:1.1; margin-bottom:6px; }
.hp-title span { background:linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.hp-subtitle { font-size:14px;color:var(--text2);max-width:520px; }
.hp-completion-bar { display:flex; align-items:center; gap:16px; padding:16px 20px; background:var(--card); border:1px solid var(--card-b); border-radius:16px; margin-bottom:28px; }
.hp-completion-ring { position:relative; width:52px;height:52px; flex-shrink:0; }
.hp-ring-svg { transform:rotate(-90deg); }
.hp-ring-track { stroke:var(--border); }
.hp-ring-fill { stroke:var(--accent); stroke-linecap:round; transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1); }
.hp-ring-num { position:absolute;inset:0; display:flex;flex-direction:column; align-items:center;justify-content:center; font-family:'Syne',sans-serif; font-size:13px;font-weight:800; color:var(--text); }
.hp-ring-unit { font-size:7px;color:var(--text3);font-family:'DM Mono',monospace; }
.hp-completion-text { flex:1; }
.hp-completion-title { font-size:14px;font-weight:700;color:var(--text); }
.hp-completion-sub { font-size:12px;color:var(--text2); }
.hp-completion-pct { font-family:'Syne',sans-serif; font-size:28px;font-weight:800; color:var(--accent); }
.hp-stepper { display:flex; gap:6px; margin-bottom:28px; overflow-x:auto; scrollbar-width:none; }
.hp-stepper::-webkit-scrollbar{display:none}
.hp-step { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid var(--border); background:var(--glass); cursor:pointer; transition:all .22s; white-space:nowrap; position:relative; }
.hp-step:hover { border-color:var(--border-h); background:var(--glass-h); }
.hp-step.active { border-color:var(--step-color); background:color-mix(in srgb,var(--step-color) 10%,transparent); box-shadow:0 0 0 3px color-mix(in srgb,var(--step-color) 12%,transparent); }
.hp-step-num { width:22px;height:22px; border-radius:50%; border:1.5px solid var(--border); display:flex;align-items:center;justify-content:center; font-family:'DM Mono',monospace; font-size:10px;font-weight:700; color:var(--text3); flex-shrink:0; }
.hp-step.active .hp-step-num { background:var(--step-color); border-color:var(--step-color); color:#000; }
.hp-step-label { font-size:12px;font-weight:600; color:var(--text3); transition:color .2s; }
.hp-step.active .hp-step-label { color:var(--step-color); }
.hp-section { background:var(--card); border:1px solid var(--card-b); border-radius:20px; padding:28px; margin-bottom:16px; animation:section-enter .35s both; }
@keyframes section-enter{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.hp-section-header { display:flex;align-items:center;gap:12px; margin-bottom:24px; }
.hp-section-icon { width:42px;height:42px; border-radius:12px; display:flex;align-items:center;justify-content:center; flex-shrink:0; }
.hp-section-icon svg { width:20px;height:20px; }
.hp-section-title { font-family:'Syne',sans-serif; font-size:18px;font-weight:800; color:var(--text); }
.hp-grid { display:grid;gap:16px; }
.hp-grid-2 { grid-template-columns:1fr 1fr; }
@media(max-width:600px){.hp-grid-2 { grid-template-columns:1fr; }}
.hp-field { display:flex;flex-direction:column;gap:6px; }
.hp-label { font-size:12px;font-weight:700; color:var(--text2); display:flex;align-items:center;gap:6px; }
.hp-label-badge { font-family:'DM Mono',monospace; font-size:9px; font-weight:600; padding:1px 6px;border-radius:100px; text-transform:uppercase; }
.hp-label-badge.afridx { background:rgba(0,229,160,.12); color:var(--accent); border:1px solid rgba(0,229,160,.2); }
.hp-label-badge.optional { background:var(--glass); color:var(--text3); border:1px solid var(--border); }
.hp-input, .hp-select, .hp-textarea { width:100%; padding:11px 14px; background:rgba(255,255,255,.04); border:1.5px solid var(--border); border-radius:11px; color:var(--text); font-size:14px; outline:none; transition:all .2s; }
.hp-input:focus,.hp-select:focus,.hp-textarea:focus { border-color:var(--accent); background:rgba(0,229,160,.04); box-shadow:0 0 0 3px rgba(0,229,160,.08); }
.hp-sex-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
.hp-sex-btn { padding:10px 8px; border:1.5px solid var(--border); border-radius:11px; background:var(--glass); cursor:pointer; display:flex;flex-direction:column; align-items:center;gap:6px; transition:all .2s; color:var(--text2); font-size:12px;font-weight:700; }
.hp-sex-btn.selected { border-color:var(--accent); background:rgba(0,229,160,.07); color:var(--accent); }
.hp-pill-row { display:flex;flex-wrap:wrap;gap:7px; }
.hp-pill-opt { padding:7px 14px; border:1.5px solid var(--border); border-radius:100px; background:var(--glass); cursor:pointer; font-family:'DM Mono',monospace; font-size:12px;font-weight:700; color:var(--text2); transition:all .2s; }
.hp-pill-opt.selected { border-color:var(--pill-color,var(--accent)); background:color-mix(in srgb,var(--pill-color,var(--accent)) 10%,transparent); color:var(--pill-color,var(--accent)); }
.hp-tag-grid { display:flex;flex-wrap:wrap;gap:7px; }
.hp-tag { display:flex;align-items:center;gap:6px; padding:6px 12px; border:1.5px solid var(--border); border-radius:8px; background:var(--glass); cursor:pointer; font-size:12px;font-weight:600; color:var(--text2); transition:all .2s; }
.hp-tag.selected { border-color:var(--tag-color,var(--accent3)); background:color-mix(in srgb,var(--tag-color,var(--accent3)) 10%,transparent); color:var(--tag-color,var(--accent3)); }
.hp-tag-check { width:14px;height:14px; border-radius:4px; border:1.5px solid currentColor; display:flex;align-items:center;justify-content:center; flex-shrink:0; }
.hp-tag.selected .hp-tag-check { background:currentColor; }
.hp-bmi-box { display:flex;align-items:center;gap:10px; padding:12px 14px; background:rgba(61,155,255,.06); border:1px solid rgba(61,155,255,.15); border-radius:11px; margin-top:4px; }
.hp-bmi-box svg { width: 42px; height: 42px; color: var(--accent2); flex-shrink: 0; }
.hp-bmi-value { font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent2); }
.hp-allergy-card, .hp-med-card { display:grid; grid-template-columns:1fr 1fr auto auto; gap:8px; align-items:center; padding:14px; border-radius:13px; margin-bottom:10px; border:1px solid var(--border); background:var(--glass); }
@media(max-width:600px){.hp-allergy-card, .hp-med-card { grid-template-columns:1fr; }}
.hp-add-btn { display:flex;align-items:center;gap:8px; width:100%; padding:11px 16px; border:1.5px dashed var(--border); border-radius:11px; color:var(--text3); font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
.hp-add-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.hp-add-btn:hover { border-color:var(--border-h); background:var(--glass); }
.hp-afridx-box { display:flex;gap:12px; padding:14px 16px; background:linear-gradient(135deg,rgba(0,229,160,.05),rgba(61,155,255,.05)); border:1px solid rgba(0,229,160,.15); border-radius:13px; margin-top:12px; }
.hp-afridx-icon { width:32px;height:32px; border-radius:9px; display:flex;align-items:center;justify-content:center; color:var(--accent); flex-shrink:0; background:rgba(0,229,160,.1); }
.hp-btn { display:inline-flex;align-items:center;gap:8px; padding:12px 22px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; border:none; transition:all .2s; }
.hp-btn-primary { background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#000; }
.hp-btn-ghost { background:var(--glass); border:1px solid var(--border); color:var(--text2); display:inline-flex; align-items:center; justify-content:center; }
.hp-btn-ghost svg { width: 18px; height: 18px; }
.hp-nav { display:flex;justify-content:space-between; gap:12px; margin-top:24px; }
.hp-success { display:flex;flex-direction:column; align-items:center; text-align:center; padding:40px 20px; animation:hp-enter .5s ease; }
.hp-success-ring { width:88px;height:88px; border-radius:50%; background:rgba(0,229,160,.1); border:2px solid rgba(0,229,160,.25); display:flex;align-items:center;justify-content:center; margin-bottom:24px; color:var(--accent); }
.hp-success-ring svg { width: 44px; height: 44px; }
.hp-spinner { width:15px;height:15px; border:2px solid rgba(0,0,0,.2); border-top-color:#000; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin{to{transform:rotate(360deg)}}
`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function calcBMI(weightKh: string, heightCm: string) {
  const w = parseFloat(weightKh), h = parseFloat(heightCm) / 100;
  if (!w || !h) return null;
  const bmi = w / (h * h);
  const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese";
  return { value: bmi.toFixed(1), category };
}

function calcCompletion(p: ProfileData): number {
  const fields = [p.firstName, p.lastName, p.dob, p.sex, p.phone, p.state, p.bloodType, p.genotype, p.weight, p.height];
  const filled = fields.filter(Boolean).length;
  let bonus = 0;
  if (p.chronicConditions.length > 0) bonus += 5;
  if (p.allergies.length > 0) bonus += 5;
  if (p.medications.length > 0) bonus += 5;
  if (p.familyHistory.length > 0) bonus += 5;
  if (p.emergencyName && p.emergencyPhone) bonus += 10;
  return Math.min(100, Math.round((filled / fields.length) * 70) + bonus);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function StepPersonal({ data, set }: { data: ProfileData; set: (p: Partial<ProfileData>) => void }) {
  return (
    <div className="hp-section">
      <div className="hp-section-header">
        <div className="hp-section-icon" style={{ background: "rgba(0,229,160,.12)", color: "var(--accent)" }}><Ic.User /></div>
        <div>
          <div className="hp-section-title">Personal information</div>
          <div className="hp-section-sub">Basic details used across MedBridge</div>
        </div>
      </div>
      <div className="hp-grid hp-grid-2" style={{ marginBottom: 16 }}>
        <div className="hp-field"><label className="hp-label">First name</label><input className="hp-input" placeholder="Emeka" value={data.firstName} onChange={e => set({ firstName: e.target.value })} /></div>
        <div className="hp-field"><label className="hp-label">Last name</label><input className="hp-input" placeholder="Okonkwo" value={data.lastName} onChange={e => set({ lastName: e.target.value })} /></div>
      </div>
      <div className="hp-grid hp-grid-2" style={{ marginBottom: 16 }}>
        <div className="hp-field"><label className="hp-label">Date of birth</label><input className="hp-input" type="date" value={data.dob} onChange={e => set({ dob: e.target.value })} /></div>
        <div className="hp-field"><label className="hp-label">Phone</label><input className="hp-input" placeholder="08012345678" value={data.phone} onChange={e => set({ phone: e.target.value })} /></div>
      </div>
      <div className="hp-field" style={{ marginBottom: 16 }}>
        <label className="hp-label">Sex</label>
        <div className="hp-sex-grid">
          {["male", "female", "other"].map(s => (
            <button key={s} type="button" className={`hp-sex-btn ${data.sex === s ? "selected" : ""}`} onClick={() => set({ sex: s as ProfileData["sex"] })}>
              <span className="hp-sex-icon">{s === "male"?"♂":s==="female"?"♀":"⊕"}</span>{s}
            </button>
          ))}
        </div>
      </div>
      <div className="hp-grid hp-grid-2">
        <div className="hp-field"><label className="hp-label">State</label><select className="hp-select" value={data.state} onChange={e => set({ state: e.target.value })}><option value="">Select</option>{NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div className="hp-field"><label className="hp-label">LGA</label><input className="hp-input" placeholder="Local Gov" value={data.lga} onChange={e => set({ lga: e.target.value })} /></div>
      </div>
    </div>
  );
}

function StepClinical({ data, set }: { data: ProfileData; set: (p: Partial<ProfileData>) => void }) {
  const bmi = calcBMI(data.weight, data.height);
  return (
    <div className="hp-section">
      <div className="hp-section-header">
        <div className="hp-section-icon" style={{ background: "rgba(61,155,255,.12)", color: "var(--accent2)" }}><Ic.Activity /></div>
        <div><div className="hp-section-title">Clinical data</div><div className="hp-section-sub">Blood type, genotype, body metrics</div></div>
      </div>
      <div className="hp-field" style={{ marginBottom: 20 }}>
        <label className="hp-label">Blood type <span className="hp-label-badge afridx">AfriDx</span></label>
        <div className="hp-pill-row">{BLOOD_TYPES.map(bt => <button key={bt} type="button" className={`hp-pill-opt ${data.bloodType === bt ? "selected" : ""}`} style={{"--pill-color":"var(--accent2)"} as React.CSSProperties} onClick={() => set({ bloodType: bt })}>{bt}</button>)}</div>
      </div>
      <div className="hp-field" style={{ marginBottom: 20 }}>
        <label className="hp-label">Genotype <span className="hp-label-badge afridx">AfriDx</span></label>
        <div className="hp-pill-row">{GENOTYPES.map(g => <button key={g} type="button" className={`hp-pill-opt ${data.genotype === g ? "selected" : ""}`} style={{"--pill-color":"#c77dff"} as React.CSSProperties} onClick={() => set({ genotype: g })}>{g}</button>)}</div>
      </div>
      <div className="hp-grid hp-grid-2">
        <div className="hp-field"><label className="hp-label">Weight (kg)</label><input className="hp-input" type="number" value={data.weight} onChange={e => set({ weight: e.target.value })} /></div>
        <div className="hp-field"><label className="hp-label">Height (cm)</label><input className="hp-input" type="number" value={data.height} onChange={e => set({ height: e.target.value })} /></div>
      </div>
      {bmi && <div className="hp-bmi-box"><Ic.Scale /><div><div className="hp-bmi-value">{bmi.value}</div><div className="hp-bmi-label">BMI ({bmi.category})</div></div></div>}
    </div>
  );
}

function StepConditions({ data, set }: { data: ProfileData; set: (p: Partial<ProfileData>) => void }) {
  const toggle = (c: string) => set({ chronicConditions: data.chronicConditions.includes(c) ? data.chronicConditions.filter(x => x !== c) : [...data.chronicConditions, c] });
  return (
    <div className="hp-section">
      <div className="hp-section-header">
        <div className="hp-section-icon" style={{ background: "rgba(199,125,255,.12)", color: "var(--accent3)" }}><Ic.Heart /></div>
        <div><div className="hp-section-title">Conditions & allergies</div><div className="hp-section-sub">Chronic history and reactions</div></div>
      </div>
      <div className="hp-tag-grid" style={{ marginBottom: 20 }}>
        {CHRONIC_CONDITIONS.map(c => (
          <button key={c} type="button" className={`hp-tag ${data.chronicConditions.includes(c) ? "selected" : ""}`} onClick={() => toggle(c)}>
            <div className="hp-tag-check">{data.chronicConditions.includes(c) && <Ic.Check />}</div>{c}
          </button>
        ))}
      </div>
      <button className="hp-add-btn" onClick={() => set({ allergies: [...data.allergies, { id: Date.now().toString(), substance: "", reaction: "", severity: "mild" }] })}><Ic.Plus /> Add allergy</button>
      {data.allergies.map(a => (
        <div key={a.id} className="hp-allergy-card">
          <input className="hp-input" placeholder="Substance" value={a.substance} onChange={e => set({ allergies: data.allergies.map(x => x.id === a.id ? { ...x, substance: e.target.value } : x) })} />
          <select className="hp-select" value={a.severity} onChange={e => set({ allergies: data.allergies.map(x => x.id === a.id ? { ...x, severity: e.target.value as Allergy["severity"] } : x) })}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select>
          <button className="hp-btn-ghost" style={{padding:8}} onClick={() => set({ allergies: data.allergies.filter(x => x.id !== a.id) })}><Ic.Trash /></button>
        </div>
      ))}
    </div>
  );
}

function StepMedications({ data, set }: { data: ProfileData; set: (p: Partial<ProfileData>) => void }) {
  return (
    <div className="hp-section">
      <div className="hp-section-header">
        <div className="hp-section-icon" style={{ background: "rgba(255,159,67,.12)", color: "#ff9f43" }}><Ic.Pill /></div>
        <div><div className="hp-section-title">Medications</div><div className="hp-section-sub">Current prescriptions and OTC drugs</div></div>
      </div>
      <button className="hp-add-btn" onClick={() => set({ medications: [...data.medications, { id: Date.now().toString(), name: "", dose: "", frequency: "" }] })} style={{marginBottom:10}}><Ic.Plus /> Add medication</button>
      {data.medications.map(m => (
        <div key={m.id} className="hp-med-card">
          <input className="hp-input" placeholder="Name" value={m.name} onChange={e => set({ medications: data.medications.map(x => x.id === m.id ? { ...x, name: e.target.value } : x) })} />
          <input className="hp-input" placeholder="Dose" value={m.dose} onChange={e => set({ medications: data.medications.map(x => x.id === m.id ? { ...x, dose: e.target.value } : x) })} />
          <button className="hp-btn-ghost" style={{padding:8}} onClick={() => set({ medications: data.medications.filter(x => x.id !== m.id) })}><Ic.Trash /></button>
        </div>
      ))}
    </div>
  );
}

function StepFamily({ data, set }: { data: ProfileData; set: (p: Partial<ProfileData>) => void }) {
  const toggle = (c: string) => set({ familyHistory: data.familyHistory.includes(c) ? data.familyHistory.filter(x => x !== c) : [...data.familyHistory, c] });
  return (
    <div className="hp-section">
      <div className="hp-section-header">
        <div className="hp-section-icon" style={{ background: "rgba(255,107,157,.12)", color: "#ff6b9d" }}><Ic.Users /></div>
        <div><div className="hp-section-title">Family History</div><div className="hp-section-sub">Hereditary conditions</div></div>
      </div>
      <div className="hp-tag-grid">
        {FAMILY_HISTORY.map(c => (
          <button key={c} type="button" className={`hp-tag ${data.familyHistory.includes(c) ? "selected" : ""}`} onClick={() => toggle(c)}>
            <div className="hp-tag-check">{data.familyHistory.includes(c) && <Ic.Check />}</div>{c}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepEmergency({ data, set }: { data: ProfileData; set: (p: Partial<ProfileData>) => void }) {
  return (
    <div className="hp-section">
      <div className="hp-section-header">
        <div className="hp-section-icon" style={{ background: "rgba(255,92,92,.12)", color: "var(--danger)" }}><Ic.AlertTriangle /></div>
        <div><div className="hp-section-title">Emergency contact</div><div className="hp-section-sub">Who to alert in critical cases</div></div>
      </div>
      <div className="hp-grid hp-grid-2">
        <div className="hp-field"><label className="hp-label">Name</label><input className="hp-input" value={data.emergencyName} onChange={e => set({ emergencyName: e.target.value })} /></div>
        <div className="hp-field"><label className="hp-label">Relationship</label><select className="hp-select" value={data.emergencyRelation} onChange={e => set({ emergencyRelation: e.target.value })}><option value="">Select</option>{RELATIONS.map(r => <option key={r}>{r}</option>)}</select></div>
        <div className="hp-field"><label className="hp-label">Phone</label><input className="hp-input" value={data.emergencyPhone} onChange={e => set({ emergencyPhone: e.target.value })} /></div>
      </div>
    </div>
  );
}

export default function HealthProfileSetup() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const set = useCallback((patch: Partial<ProfileData>) => setData(prev => ({ ...prev, ...patch })), []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign("/auth/login");
        return;
      }
      setUser(user);

      try {
        const res = await fetch(`${API_URL}/api/v1/profile`, {
          headers: { "x-user-id": user.id }
        });
        if (res.ok) {
          const profile = await res.json();
          const names = user.user_metadata?.full_name?.split(" ") || ["", ""];
          setData({
            firstName: names[0] || "",
            lastName: names.slice(1).join(" ") || "",
            dob: profile.dob || "",
            sex: (profile.gender as ProfileData["sex"]) || "",
            phone: profile.phone || "",
            state: profile.state || "",
            lga: profile.lga || "",
            bloodType: profile.bloodGroup || "",
            genotype: profile.genotype || "",
            weight: profile.weight || "",
            height: profile.height || "",
            chronicConditions: JSON.parse(profile.chronicConditions || "[]"),
            allergies: JSON.parse(profile.allergies || "[]"),
            medications: JSON.parse(profile.medications || "[]"),
            familyHistory: JSON.parse(profile.familyHistory || "[]"),
            emergencyName: profile.emergencyName || "",
            emergencyPhone: profile.emergencyPhone || "",
            emergencyRelation: profile.emergencyRelation || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [supabase, API_URL]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const pct = calcCompletion(data);

  if (loading) {
    return (
      <div className="hp-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="hp-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="hp-page">
        {saved ? (
          <div className="hp-success">
            <div className="hp-success-ring"><Ic.Check /></div>
            <h2>Profile saved!</h2>
            <p>Your AfriDx intelligence is now calibrated to your personal health context.</p>
            <button className="hp-btn hp-btn-primary" onClick={() => window.location.assign("/dashboard")}>Back to Dashboard</button>
          </div>
        ) : (
          <>
            <div className="hp-header">
              <div className="hp-eyebrow"><div className="hp-eyebrow-dot" /> Phase 1.3</div>
              <h1 className="hp-title">Build your <span>health profile</span></h1>
              <p className="hp-subtitle">Powers the AfriDx engine for personalized diagnostics.</p>
            </div>
            <div className="hp-completion-bar">
              <div className="hp-completion-pct">{pct}%</div>
              <div className="hp-completion-text"><div className="hp-completion-title">Setup Progress</div><div className="hp-completion-sub">{6 - step} steps remaining</div></div>
            </div>
            <div className="hp-stepper">
              {STEPS.map(s => (
                <button key={s.id} className={`hp-step ${s.id === step ? "selected" : ""}`} style={{ "--step-color": s.color } as React.CSSProperties} onClick={() => setStep(s.id)}>
                  <span className="hp-step-num">{s.id}</span><span className="hp-step-label">{s.short}</span>
                </button>
              ))}
            </div>
            {step === 1 && <StepPersonal data={data} set={set} />}
            {step === 2 && <StepClinical data={data} set={set} />}
            {step === 3 && <StepConditions data={data} set={set} />}
            {step === 4 && <StepMedications data={data} set={set} />}
            {step === 5 && <StepFamily data={data} set={set} />}
            {step === 6 && <StepEmergency data={data} set={set} />}
            <div className="hp-nav">
              <button disabled={step === 1} className="hp-btn hp-btn-ghost" onClick={() => setStep(step - 1)}>Back</button>
              {step < 6 ? <button className="hp-btn hp-btn-primary" onClick={() => setStep(step + 1)}>Continue</button> : <button className="hp-btn hp-btn-primary" onClick={handleSave} disabled={saving}>{saving ? <div className="hp-spinner" /> : "Save Profile"}</button>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
