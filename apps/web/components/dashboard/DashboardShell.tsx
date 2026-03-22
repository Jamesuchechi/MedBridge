"use client";

import React, {
  useState, useEffect, useRef,
  createContext, useContext,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardHome } from "./DashboardHome";
import { useAuthStore } from "@/store/auth.store";

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

const DEFAULT_USER: User = {
  name: "Loading...",
  email: "",
  role: "patient",
  initials: "..",
  profileComplete: 0,
};

// ─── Nav items per role ───────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: () => React.JSX.Element;
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
};

// ─── Nav Config ───────────────────────────────────────────────────────────────
const ALL_NAV: NavItem[] = [
  { id: "home",      label: "Home",            href: "/dashboard",           icon: Ic.Home },
  { id: "symptoms",  label: "Symptom Checker", href: "/dashboard/symptoms",  icon: Ic.Activity, badge: "AI" },
  { id: "documents", label: "Documents",        href: "/dashboard/documents", icon: Ic.FileText },
  { id: "drugs",     label: "Drug Intelligence",href: "/dashboard/drugs",     icon: Ic.Pill },
  { id: "community", label: "CommunityRx",      href: "/dashboard/community", icon: Ic.Map },
  { id: "profile",   label: "Health Profile",   href: "/dashboard/profile",   icon: Ic.User, dividerBefore: true },
  { id: "settings",  label: "Settings",          href: "/dashboard/settings",  icon: Ic.Settings, dividerBefore: true },
];

function navForRole(role: UserRole): NavItem[] {
  return ALL_NAV.filter(n => !n.roleGate || n.roleGate.includes(role));
}

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  patient: { label: "Patient",     color: "var(--accent)",  bg: "rgba(0,229,160,0.12)" },
  doctor:  { label: "Doctor",      color: "var(--accent2)", bg: "rgba(61,155,255,0.12)" },
  clinic:  { label: "Clinic Admin",color: "var(--accent3)", bg: "rgba(199,125,255,0.12)" },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap');

:root {
  --sidebar-w: 260px;
  --sidebar-collapsed-w: 72px;
  --topbar-h: 68px;
  --bg:        #03050a;
  --bg2:       #080c14;
  --bg3:       #0d1220;
  --sidebar-bg:#060a12;
  --glass:     rgba(255,255,255,0.04);
  --glass-h:   rgba(255,255,255,0.08);
  --border:    rgba(255,255,255,0.08);
  --border-h:  rgba(255,255,255,0.16);
  --text:      #f0f4ff;
  --text2:     rgba(240,244,255,0.55);
  --text3:     rgba(240,244,255,0.3);
  --accent:    #00e5a0;
  --accent2:   #3d9bff;
  --accent3:   #c77dff;
  --danger:    #ff5c5c;
  --warn:      #ffb800;
  --nav-active-bg:   rgba(0,229,160,0.12);
  --nav-active-text: #00e5a0;
  --card-bg:   rgba(255,255,255,0.04);
  --card-border: rgba(255,255,255,0.08);
  --topbar-bg: rgba(3,5,10,0.85);
}

[data-theme="light"] {
  --bg:        #f0f4f8;
  --bg2:       #e4ebf5;
  --bg3:       #dbe4f0;
  --sidebar-bg:#e4ebf5;
  --glass:     rgba(255,255,255,0.7);
  --glass-h:   rgba(255,255,255,0.9);
  --border:    rgba(0,0,0,0.08);
  --border-h:  rgba(0,168,112,0.3);
  --text:      #0d1117;
  --text2:     rgba(13,17,23,0.6);
  --text3:     rgba(13,17,23,0.35);
  --accent:    #00a870;
  --accent2:   #1a6fcc;
  --accent3:   #7c3aed;
  --danger:    #d93025;
  --warn:      #b57500;
  --nav-active-bg:   rgba(0,168,112,0.12);
  --nav-active-text: #008f5d;
  --card-bg:   rgba(255,255,255,0.8);
  --card-border: rgba(0,0,0,0.08);
  --topbar-bg: rgba(240,244,248,0.9);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  transition: background .3s ease, color .3s ease;
}
a { text-decoration: none; color: inherit; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }

.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: var(--topbar-h) 1fr;
  grid-template-areas: "sidebar topbar" "sidebar main";
  height: 100vh;
  transition: grid-template-columns .3s cubic-bezier(.4,0,.2,1);
}
.shell.collapsed { grid-template-columns: var(--sidebar-collapsed-w) 1fr; }

@media (max-width: 1024px) {
  .shell { grid-template-columns: 1fr; grid-template-areas: "topbar" "main"; }
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
@media (max-width: 1024px) {
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: var(--sidebar-w) !important; transform: translateX(-100%);
    z-index: 200; box-shadow: 4px 0 40px rgba(0,0,0,0.4);
    visibility: hidden; pointer-events: none;
  }
  .sidebar.mobile-open { transform: translateX(0); visibility: visible; pointer-events: auto; }
}

.sidebar-backdrop {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  z-index: 199; opacity: 0; pointer-events: none; transition: opacity .3s ease;
}
@media (max-width: 1024px) { .sidebar-backdrop.visible { opacity: 1; pointer-events: auto; display: block; } }

.sidebar-header { height: var(--topbar-h); padding: 0 16px; display: flex; align-items: center; border-bottom: 1px solid var(--border); }
.sidebar-logo { display: flex; align-items: center; gap: 10px; }
.sidebar-logo-mark {
  width: 34px; height: 34px; border-radius: 9px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; color: #000;
}
.sidebar-logo-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: var(--text); }
.sidebar-logo-name span { color: var(--accent); }
.shell.collapsed .sidebar-logo-name { display: none; }

.sidebar-user { padding: 12px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
.sidebar-user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; color: #000;
  flex-shrink: 0;
}
.sidebar-user-name { font-size: 13px; font-weight: 700; }
.sidebar-user-role { font-size: 10px; padding: 2px 7px; border-radius: 100px; font-family: 'DM Mono', monospace; font-weight: 600; text-transform: uppercase; }
.shell.collapsed .sidebar-user-info { display: none; }

.sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 40px; margin: 1px 8px;
  border-radius: 10px; color: var(--text2); font-size: 13.5px; transition: all .2s;
}
.nav-item:hover { background: var(--glass-h); color: var(--text); }
.nav-item.active { background: var(--nav-active-bg); color: var(--nav-active-text); font-weight: 600; }
.nav-item-icon { flex-shrink: 0; }
.nav-item-icon svg { width: 18px; height: 18px; }
.nav-item-label { flex: 1; white-space: nowrap; overflow: hidden; }
.shell.collapsed .nav-item-label,
.shell.collapsed .nav-badge { display: none; }
.nav-badge {
  font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 700;
  padding: 2px 6px; border-radius: 100px;
  background: rgba(0,229,160,0.15); color: var(--accent);
}
.nav-divider { height: 1px; background: var(--border); margin: 6px 16px; }

.sidebar-footer { padding: 10px 8px; border-top: 1px solid var(--border); }
.sidebar-logout {
  display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 38px;
  border-radius: 10px; color: var(--text3); font-size: 13px; transition: all .2s; width: 100%;
}
.sidebar-logout:hover { color: var(--danger); background: rgba(255, 92, 92, 0.08); }
.sidebar-logout svg { width: 18px; height: 18px; flex-shrink: 0; }
.shell.collapsed .sidebar-logout-label { display: none; }

.topbar {
  grid-area: topbar; height: var(--topbar-h); background: var(--topbar-bg);
  backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 12px; padding: 0 20px; z-index: 40;
}
.sidebar-collapse-btn {
  width: 32px; height: 32px; border-radius: 9px; background: var(--glass);
  border: 1px solid var(--border); color: var(--text2); display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
@media (max-width: 1024px) { .sidebar-collapse-btn { display: none; } }

.topbar-hamburger {
  width: 38px; height: 38px; border-radius: 11px; background: var(--glass);
  border: 1px solid var(--border); color: var(--text2); display: none; align-items: center; justify-content: center;
  flex-shrink: 0;
}
@media (max-width: 1024px) { .topbar-hamburger { display: flex; } }

.topbar-search { position: relative; flex: 1; max-width: 360px; }
@media (max-width: 600px) { .topbar-search { display: none; } }
.topbar-search-input {
  width: 100%; background: var(--glass); border: 1px solid var(--border);
  border-radius: 10px; padding: 8px 12px 8px 36px; color: var(--text); outline: none; font-size: 14px;
}
.topbar-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text3); display: flex; }
.topbar-search-icon svg { width: 14px; height: 14px; }

.topbar-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.topbar-icon-btn {
  width: 38px; height: 38px; border-radius: 11px; background: var(--glass);
  border: 1px solid var(--border); color: var(--text2); display: flex; align-items: center; justify-content: center;
}
.topbar-icon-btn svg { width: 18px; height: 18px; }

.main-content { grid-area: main; overflow-y: auto; background: var(--bg); padding-bottom: 60px; }
.main-content-inner { padding: 40px; width: 100%; margin: 0; }
@media (max-width: 768px) { .main-content-inner { padding: 20px; } }

.mobile-bottom-nav {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--sidebar-bg); border-top: 1px solid var(--border);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  padding: 8px 8px 24px; z-index: 100; justify-content: space-around;
}
@media (max-width: 1024px) { .mobile-bottom-nav { display: flex; } }
.mobile-nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text3); transition: all .2s; }
.mobile-nav-item.active { color: var(--accent); }
.mobile-nav-item svg { width: 22px; height: 22px; }
.mobile-nav-label { font-size: 10px; font-weight: 600; text-transform: uppercase; font-family: 'DM Mono', monospace; }

/* Dashboard Cards */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0; }
.stat-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 20px; }
.stat-card-value { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; }
.health-ring-score { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; }

.user-dropdown-wrapper { position: relative; }
.user-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 220px; background: var(--sidebar-bg); border: 1px solid var(--border);
  border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  padding: 8px; z-index: 1000; animation: dropdown-in .2s ease-out;
}
@keyframes dropdown-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.dropdown-header { padding: 10px 12px; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
.dropdown-name { font-size: 13px; font-weight: 700; color: var(--text); }
.dropdown-email { font-size: 11px; color: var(--text3); }
.dropdown-item {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px;
  border-radius: 8px; font-size: 13px; color: var(--text2); transition: all .2s;
}
.dropdown-item:hover { background: var(--glass-h); color: var(--text); }
.dropdown-item.danger { color: var(--danger); }
.dropdown-item.danger:hover { background: rgba(255, 92, 92, 0.08); }
.dropdown-item svg { width: 16px; height: 16px; }
.dropdown-divider { height: 1px; background: var(--border); margin: 6px 0; }
`;

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function DashboardShell({ children }: { children?: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFetchingUser = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      if (isFetchingUser.current) return;
      isFetchingUser.current = true;

      try {
        const supabase = createClient();
        const { data: { user: sbUser } } = await supabase.auth.getUser();

        if (sbUser) {
          const name = sbUser.user_metadata?.full_name || sbUser.email?.split("@")[0] || "User";

          let profileComplete = 0;
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            const res = await fetch(`${API_URL}/api/v1/profile`, {
              headers: { "x-user-id": sbUser.id }
            });
            if (res.ok) {
              const profile = await res.json();
              const fields = [profile.dob, profile.gender, profile.phone, profile.state, profile.bloodGroup, profile.genotype, profile.weight, profile.height];
              const filled = fields.filter(Boolean).length;
              profileComplete = Math.min(100, Math.round((filled / fields.length) * 100));
            }
          } catch (err) {
            console.error("Failed to fetch profile for completion:", err);
          }

          const finalRole = (sbUser.user_metadata?.role as UserRole) || "patient";
          setUser({
            name,
            email: sbUser.email || "",
            role: finalRole,
            initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
            profileComplete,
          });
          useAuthStore.getState().setUser({
            id: sbUser.id,
            email: sbUser.email || "",
            name: name,
            role: finalRole.toUpperCase() as "PATIENT" | "CLINICIAN" | "CLINIC_STAFF" | "CLINIC_ADMIN" | "SUPER_ADMIN",
            isVerified: true,
            createdAt: sbUser.created_at || new Date().toISOString()
          });
        }
      } finally {
        isFetchingUser.current = false;
      }
    };
    fetchUser();
  }, []);

  const activeNav = ALL_NAV.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.id ?? "home";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!mounted) return <div style={{ background: '#03050a', minHeight: '100vh' }} />;

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
              <div
                className="sidebar-user-role"
                style={{ background: ROLE_META[user.role].bg, color: ROLE_META[user.role].color }}
              >
                {ROLE_META[user.role].label}
              </div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Main Navigation">
            <ul style={{ listStyle: "none" }}>
              {navForRole(user.role).map(item => (
                <li key={item.id}>
                  {item.dividerBefore && <div className="nav-divider" role="separator" />}
                  <a
                    href={item.href}
                    className={`nav-item ${activeNav === item.id ? "active" : ""}`}
                    aria-current={activeNav === item.id ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="nav-item-icon" aria-hidden="true"><item.icon /></span>
                    <span className="nav-item-label">{item.label}</span>
                    {item.badge && <span className="nav-badge" aria-label={`${item.badge} feature`}>{item.badge}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <footer className="sidebar-footer">
            <button type="button" className="sidebar-logout" onClick={handleLogout}>
              <Ic.LogOut />
              <span className="sidebar-logout-label">Sign out</span>
            </button>
          </footer>
        </aside>

        <header className="topbar">
          <button className="topbar-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open mobile menu"><Ic.Menu /></button>
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <Ic.ChevronRight /> : <Ic.ChevronLeft />}
          </button>

          <div className="topbar-search">
            <span className="topbar-search-icon"><Ic.Search /></span>
            <input type="text" className="topbar-search-input" placeholder="Search..." />
          </div>

          <div className="topbar-actions">
            <button className="topbar-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
              {theme === 'dark' ? <Ic.Sun /> : <Ic.Moon />}
            </button>
            <button className="topbar-icon-btn" aria-label="Notifications"><Ic.Bell /></button>

            <div className="user-dropdown-wrapper" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ borderRadius: '50%', border: '2px solid var(--border)', padding: '2px', transition: 'all .2s' }}
              >
                <div className="sidebar-user-avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>{user.initials}</div>
              </button>

              {showDropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{user.name}</div>
                    <div className="dropdown-email">{user.email}</div>
                  </div>
                  <a href="/dashboard/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <Ic.User /> My Profile
                  </a>
                  <a href="/dashboard/settings" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <Ic.Settings /> Settings
                  </a>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <Ic.LogOut /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="main-content-inner">
          {pathname === "/dashboard" ? <DashboardHome user={user} /> : children}
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