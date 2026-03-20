"use client";

import {
  useState, useEffect, useRef,
  createContext, useContext,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = "patient" | "doctor" | "clinic";
interface User {
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  initials: string;
  profileComplete: number; // 0–100
}

// ─── Shell Context ────────────────────────────────────────────────────────────
interface ShellCtx {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  user: User;
  activeNav: string;
}
const ShellContext = createContext<ShellCtx>({} as ShellCtx);
export const useShell = () => useContext(ShellContext);

// ─── Mock user (replace with Supabase session) ────────────────────────────────
const MOCK_USER: User = {
  name: "Emeka Okonkwo",
  email: "emeka@example.com",
  role: "patient",
  initials: "EO",
  profileComplete: 68,
};

// ─── Nav items per role ───────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: () => ReactNode;
  badge?: string | number;
  roleGate?: UserRole[];
  dividerBefore?: boolean;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Pill: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Stethoscope: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  Hospital: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v4M14 14h-4M14 18h-4M14 8h-4"/>
      <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Clipboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
};

// ─── Nav Config ───────────────────────────────────────────────────────────────
const ALL_NAV: NavItem[] = [
  { id: "home",      label: "Home",            href: "/dashboard",           icon: Ic.Home },
  { id: "symptoms",  label: "Symptom Checker", href: "/dashboard/symptoms",  icon: Ic.Activity, badge: "AI" },
  { id: "documents", label: "Documents",        href: "/dashboard/documents", icon: Ic.FileText },
  { id: "drugs",     label: "Drug Intelligence",href: "/dashboard/drugs",     icon: Ic.Pill },
  { id: "community", label: "CommunityRx",      href: "/dashboard/community", icon: Ic.Map },
  { id: "profile",   label: "Health Profile",   href: "/dashboard/profile",   icon: Ic.User, dividerBefore: true },
  // Doctor-only
  { id: "copilot",   label: "Doctor Copilot",   href: "/dashboard/copilot",   icon: Ic.Stethoscope, badge: "New", roleGate: ["doctor"] },
  { id: "referrals", label: "Referrals",         href: "/dashboard/referrals", icon: Ic.Clipboard, roleGate: ["doctor"] },
  // Clinic-only
  { id: "clinic",    label: "Clinic OS",         href: "/dashboard/clinic",    icon: Ic.Hospital, roleGate: ["clinic"] },
  { id: "patients",  label: "Patients",          href: "/dashboard/patients",  icon: Ic.Users, roleGate: ["clinic"] },
  { id: "pulse",     label: "MedBridge Pulse",   href: "/dashboard/pulse",     icon: Ic.BarChart, roleGate: ["clinic"] },
  // All
  { id: "settings",  label: "Settings",          href: "/dashboard/settings",  icon: Ic.Settings, dividerBefore: true },
];

function navForRole(role: UserRole): NavItem[] {
  return ALL_NAV.filter(n => !n.roleGate || n.roleGate.includes(role));
}

// ─── Role badge colors ────────────────────────────────────────────────────────
const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  patient: { label: "Patient",     color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
  doctor:  { label: "Doctor",      color: "#3d9bff", bg: "rgba(61,155,255,0.12)" },
  clinic:  { label: "Clinic Admin",color: "#c77dff", bg: "rgba(199,125,255,0.12)" },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap');

:root {
  --sidebar-w: 248px;
  --sidebar-collapsed-w: 68px;
  --topbar-h: 64px;
  --bg:        #03050a;
  --bg2:       #080c14;
  --bg3:       #0d1220;
  --sidebar-bg:#060a12;
  --glass:     rgba(255,255,255,0.035);
  --glass-h:   rgba(255,255,255,0.06);
  --border:    rgba(255,255,255,0.07);
  --border-h:  rgba(255,255,255,0.14);
  --text:      #f0f4ff;
  --text2:     rgba(240,244,255,0.48);
  --text3:     rgba(240,244,255,0.22);
  --accent:    #00e5a0;
  --accent2:   #3d9bff;
  --accent3:   #c77dff;
  --danger:    #ff5c5c;
  --warn:      #ffb800;
  --nav-active-bg:   rgba(0,229,160,0.09);
  --nav-active-text: #00e5a0;
  --nav-active-bar:  #00e5a0;
  --scrollbar: rgba(255,255,255,0.06);
  --card-bg:   rgba(255,255,255,0.03);
  --card-border: rgba(255,255,255,0.07);
  --topbar-bg: rgba(3,5,10,0.85);
}

[data-theme="light"] {
  --bg:        #f0f4f8;
  --bg2:       #e8eef6;
  --bg3:       #dfe8f2;
  --sidebar-bg:#e4ecf5;
  --glass:     rgba(255,255,255,0.65);
  --glass-h:   rgba(255,255,255,0.85);
  --border:    rgba(0,0,0,0.07);
  --border-h:  rgba(0,150,100,0.22);
  --text:      #0d1117;
  --text2:     rgba(13,17,23,0.52);
  --text3:     rgba(13,17,23,0.28);
  --accent:    #00a870;
  --accent2:   #1a6fcc;
  --accent3:   #7c3aed;
  --danger:    #d93025;
  --warn:      #b57500;
  --nav-active-bg:   rgba(0,168,112,0.1);
  --nav-active-text: #007a52;
  --nav-active-bar:  #00a870;
  --scrollbar: rgba(0,0,0,0.08);
  --card-bg:   rgba(255,255,255,0.7);
  --card-border: rgba(0,0,0,0.07);
  --topbar-bg: rgba(240,244,248,0.88);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  transition: background .3s ease, color .3s ease;
  overflow: hidden;
}
a { text-decoration: none; color: inherit; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 10px; }

.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: var(--topbar-h) 1fr;
  grid-template-areas:
    "sidebar topbar"
    "sidebar main";
  height: 100vh;
  transition: grid-template-columns .3s cubic-bezier(.4,0,.2,1);
}
.shell.collapsed { grid-template-columns: var(--sidebar-collapsed-w) 1fr; }

@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      "topbar"
      "main";
  }
}

.sidebar {
  grid-area: sidebar;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 50;
  transition: width .3s cubic-bezier(.4,0,.2,1);
}
.shell.collapsed .sidebar { width: var(--sidebar-collapsed-w); }

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: var(--sidebar-w) !important;
    transform: translateX(-100%);
    z-index: 200;
  }
  .sidebar.mobile-open { transform: translateX(0); }
}

.sidebar-backdrop {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  z-index: 199; opacity: 0; pointer-events: none;
  transition: opacity .3s ease;
}
.sidebar-backdrop.visible { opacity: 1; pointer-events: auto; display: block; }

.sidebar-header {
  height: var(--topbar-h);
  padding: 0 16px;
  display: flex; align-items: center; border-bottom: 1px solid var(--border);
}

.sidebar-logo { display: flex; align-items: center; gap: 10px; }
.sidebar-logo-mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px; color: #000;
}
.sidebar-logo-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: var(--text); }
.sidebar-logo-name span { color: var(--accent); }
.shell.collapsed .sidebar-logo-name { display: none; }

.sidebar-user { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
.sidebar-user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; color: #000;
}
.shell.collapsed .sidebar-user-info { display: none; }
.sidebar-user-name { font-size: 13px; font-weight: 700; }
.sidebar-user-role { font-size: 10px; padding: 2px 6px; border-radius: 100px; margin-top: 2px; display: inline-block; font-family: 'DM Mono', monospace; }

.sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
.nav-divider { height: 1px; background: var(--border); margin: 8px 16px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 0 16px; height: 40px; margin: 1px 8px;
  border-radius: 8px; color: var(--text2); font-size: 13.5px; transition: all .2s;
}
.nav-item:hover { background: var(--glass-h); color: var(--text); }
.nav-item.active { background: var(--nav-active-bg); color: var(--nav-active-text); font-weight: 600; }
.nav-item-icon svg { width: 18px; height: 18px; }
.shell.collapsed .nav-item-label { display: none; }
.nav-badge { font-size: 9px; padding: 1px 5px; border-radius: 100px; background: var(--accent); color: #000; font-weight: 700; }

.sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--border); }
.sidebar-logout { display: flex; align-items: center; gap: 10px; color: var(--text3); font-size: 13px; width: 100%; text-align: left; }
.sidebar-logout:hover { color: var(--danger); }
.shell.collapsed .sidebar-logout-label { display: none; }

.topbar {
  grid-area: topbar; height: var(--topbar-h); background: var(--topbar-bg);
  backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
}

.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-hamburger { display: none; }
@media (max-width: 900px) { .topbar-hamburger { display: block; } }

.topbar-center { flex: 1; max-width: 400px; position: relative; }
.topbar-search-input {
  width: 100%; background: var(--glass); border: 1px solid var(--border);
  border-radius: 10px; padding: 8px 12px 8px 36px; color: var(--text); outline: none;
}
.topbar-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text3); }

.topbar-right { display: flex; align-items: center; gap: 12px; }
.topbar-icon-btn { width: 36px; height: 36px; border-radius: 10px; background: var(--glass); border: 1px solid var(--border); color: var(--text2); display: flex; align-items: center; justify-content: center; }
.topbar-icon-btn:hover { border-color: var(--border-h); }

.main-content { grid-area: main; overflow-y: auto; background: var(--bg); }
.main-content-inner { padding: 32px; max-width: 1200px; margin: 0 auto; }

.mobile-bottom-nav {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--sidebar-bg); border-top: 1px solid var(--border);
  padding: 8px; gap: 8px; z-index: 150;
}
@media (max-width: 900px) { .mobile-bottom-nav { display: flex; } }
.mobile-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text3); }
.mobile-nav-item.active { color: var(--accent); }
.mobile-nav-label { font-size: 10px; font-family: 'DM Mono', monospace; }
`;

// ─── Content Helpers ─────────────────────────────────────────────────────────

function getGreeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];
  return { part, first };
}

function DashboardHome({ user }: { user: User }) {
  const { part, first } = getGreeting(user.name);
  return (
    <div>
      <h2 style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 800 }}>
        {part}, <span style={{ color: 'var(--accent)' }}>{first}</span>
      </h2>
      <p style={{ color: 'var(--text2)', marginBottom: '32px' }}>Welcome to your MedBridge portal.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {[
          { label: "Symptom Checks", value: "12", icon: Ic.Activity },
          { label: "Medications", value: "3", icon: Ic.Pill },
          { label: "Lab Reports", value: "5", icon: Ic.FileText },
          { label: "Care Team", value: "2", icon: Ic.Users }
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <stat.icon />
              <span style={{ fontSize: '11px', color: 'var(--accent)' }}>+2.4%</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'Syne' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function DashboardShell({ children }: { children?: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeNav = ALL_NAV.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.id ?? "home";
  const user = MOCK_USER;

  if (!mounted) return <div style={{ background: '#03050a', minHeight: '100vh' }} />;

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ShellContext.Provider value={{ sidebarOpen: !collapsed, setSidebarOpen: v => setCollapsed(!v), user, activeNav }}>
      <style>{CSS}</style>

      <div className={`shell ${collapsed ? "collapsed" : ""}`}>
        <div className={`sidebar-backdrop ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} />
        
        <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-mark">M</div>
              <span className="sidebar-logo-name">Med<span>Bridge</span></span>
            </div>
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user.initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role" style={{ background: ROLE_META[user.role].bg, color: ROLE_META[user.role].color }}>
                {ROLE_META[user.role].label}
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navForRole(user.role).map(item => (
              <div key={item.id}>
                {item.dividerBefore && <div className="nav-divider" />}
                <a href={item.href} className={`nav-item ${activeNav === item.id ? "active" : ""}`}>
                  <span className="nav-item-icon"><item.icon /></span>
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </a>
              </div>
            ))}
          </nav>

          <footer className="sidebar-footer">
            <button className="sidebar-logout">
              <Ic.LogOut />
              <span className="sidebar-logout-label">Sign out</span>
            </button>
          </footer>
        </aside>

        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-hamburger" onClick={() => setMobileOpen(true)}><Ic.Menu /></button>
            <button className="topbar-icon-btn" onClick={() => setCollapsed(!collapsed)}><Ic.ChevronLeft /></button>
          </div>

          <div className="topbar-center">
            <span className="topbar-search-icon"><Ic.Search /></span>
            <input type="text" className="topbar-search-input" placeholder="Search..." />
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn" onClick={toggleTheme}>
              {theme === "dark" ? <Ic.Sun /> : <Ic.Moon />}
            </button>
            <button className="topbar-icon-btn"><Ic.Bell /></button>
            <div className="sidebar-user-avatar" style={{ width: '30px', height: '30px', fontSize: '11px' }}>{user.initials}</div>
          </div>
        </header>

        <main className="main-content">
          <div className="main-content-inner">
            {children ?? <DashboardHome user={user} />}
          </div>
        </main>
      </div>

      <nav className="mobile-bottom-nav">
        {ALL_NAV.filter(n => ["home", "symptoms", "documents", "drugs", "profile"].includes(n.id)).map(n => (
          <a key={n.id} href={n.href} className={`mobile-nav-item ${activeNav === n.id ? "active" : ""}`}>
            <n.icon />
            <span className="mobile-nav-label">{n.label.split(" ")[0]}</span>
          </a>
        ))}
      </nav>
    </ShellContext.Provider>
  );
}
