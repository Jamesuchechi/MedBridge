"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

// ─── Global Styles ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap');

:root {
  --bg: #03050a;
  --bg2: #080c14;
  --bg3: #0d1220;
  --glass: rgba(255,255,255,0.03);
  --glass-hover: rgba(255,255,255,0.06);
  --border: rgba(255,255,255,0.07);
  --border-hover: rgba(255,255,255,0.16);
  --border-focus: rgba(0,229,160,0.5);
  --text: #f0f4ff;
  --text2: rgba(240,244,255,0.5);
  --text3: rgba(240,244,255,0.25);
  --accent: #00e5a0;
  --accent2: #3d9bff;
  --accent3: #c77dff;
  --danger: #ff5c5c;
  --warn: #ffb800;
  --success: #00e5a0;
  --input-bg: rgba(255,255,255,0.04);
  --input-border: rgba(255,255,255,0.1);
  --shadow: 0 32px 80px rgba(0,0,0,0.5);
  --glow: 0 0 80px rgba(0,229,160,0.08);
  --panel-bg: rgba(8,12,20,0.82);
  --left-bg: #03050a;
}

[data-theme="light"] {
  --bg: #eef2f7;
  --bg2: #e4ebf5;
  --bg3: #dae3f0;
  --glass: rgba(255,255,255,0.6);
  --glass-hover: rgba(255,255,255,0.8);
  --border: rgba(0,0,0,0.07);
  --border-hover: rgba(0,150,100,0.25);
  --border-focus: rgba(0,168,112,0.6);
  --text: #0d1117;
  --text2: rgba(13,17,23,0.55);
  --text3: rgba(13,17,23,0.3);
  --accent: #00a870;
  --accent2: #1a6fcc;
  --accent3: #7c3aed;
  --danger: #d93025;
  --warn: #c07c00;
  --success: #00a870;
  --input-bg: rgba(255,255,255,0.7);
  --input-border: rgba(0,0,0,0.12);
  --shadow: 0 16px 48px rgba(0,0,0,0.1);
  --glow: 0 0 60px rgba(0,168,112,0.07);
  --panel-bg: rgba(238,242,247,0.9);
  --left-bg: #f8fafc;
  --left-text: #0d1117;
  --left-accent: #00875a;
  --left-grid: rgba(0,0,0,0.03);
  --left-pill: rgba(0,0,0,0.04);
  --left-border: rgba(0,0,0,0.07);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  transition: background 0.35s ease, color 0.35s ease;
  overflow-x: hidden;
}

/* ── Auth Shell ─────────────────────────────────── */
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .auth-shell {
    grid-template-columns: 1fr;
    display: block;
  }
  .auth-left { display: none !important; }
}

/* ── Left Panel ─────────────────────────────────── */
.auth-left {
  position: relative;
  background: var(--left-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px;
}

.auth-left-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 60% at 30% 40%, rgba(0,229,160,0.08) 0%, transparent 65%),
              radial-gradient(ellipse 50% 50% at 70% 70%, rgba(61,155,255,0.06) 0%, transparent 60%);
  pointer-events: none;
}

.auth-left-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 80% 80% at 40% 50%, black 0%, transparent 100%);
}

.auth-left-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.auth-left-top {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

/* ── Logo ───────────────────────────────────────── */
.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.auth-logo-mark {
  width: 38px; height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #00e5a0, #3d9bff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 17px;
  color: #000;
  flex-shrink: 0;
}
.auth-logo-name {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: var(--left-text, #f0f4ff);
  letter-spacing: -0.3px;
}
.auth-logo-name span { color: var(--accent); }

.auth-left-headline h2 {
  font-family: 'Syne', sans-serif;
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -1px;
  color: var(--left-text, #f0f4ff);
}
.auth-left-headline h2 em {
  font-style: normal;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.auth-left-headline p {
  font-size: 15px;
  color: var(--text2);
  max-width: 340px;
  line-height: 1.7;
  margin-top: 16px;
}

.auth-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 32px;
}
.auth-trust-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--left-pill, rgba(255,255,255,0.04));
  border: 1px solid var(--left-border, rgba(255,255,255,0.08));
  border-radius: 100px;
  font-size: 12px;
  color: var(--text2);
  font-weight: 500;
}
.auth-trust-pill-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #00e5a0;
}

.auth-left-quote {
  position: relative;
  padding: 24px;
  background: var(--left-pill, rgba(255,255,255,0.03));
  border: 1px solid var(--left-border, rgba(255,255,255,0.07));
  border-radius: 16px;
}
.auth-left-quote-mark {
  font-family: 'Syne', sans-serif;
  font-size: 40px;
  font-weight: 800;
  color: #00e5a0;
  opacity: 0.35;
  line-height: 0.8;
  margin-bottom: 8px;
}
.auth-left-quote p {
  font-size: 14px;
  color: var(--text2);
  line-height: 1.7;
  margin-bottom: 16px;
  font-style: italic;
}
.auth-left-quote-author {
  display: flex;
  align-items: center;
  gap: 10px;
}
.auth-left-quote-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00e5a0, #3d9bff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  color: #000;
}
.auth-left-quote-name { font-size: 13px; font-weight: 600; color: var(--left-text, #f0f4ff); }
.auth-left-quote-role { font-size: 11px; color: var(--text3); }

.auth-ecg-wrap {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 80px;
  opacity: 0.15;
  pointer-events: none;
}
.auth-ecg-line {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  animation: ecg-draw 3s ease 0.5s forwards, ecg-pulse 4s ease 3.5s infinite;
}
@keyframes ecg-draw { to { stroke-dashoffset: 0; } }
@keyframes ecg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── Right Panel ────────────────────────────────── */
.auth-right {
  position: relative;
  background: var(--panel-bg);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  overflow-y: auto;
  min-height: 100vh;
}

@media (max-width: 1024px) {
  .auth-right {
    padding: 32px 20px;
    background: var(--bg);
  }
}

.auth-right-inner {
  width: 100%;
  max-width: 400px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  animation: auth-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@media (max-width: 380px) {
  .auth-right-inner { min-width: 100%; }
}
@keyframes auth-enter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.auth-mobile-logo {
  display: none;
  margin-bottom: 36px;
}
@media (max-width: 1024px) {
  .auth-mobile-logo { display: flex; }
}

.auth-theme-toggle {
  position: absolute;
  top: 24px; right: 24px;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: var(--glass);
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
  font-size: 18px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.auth-theme-toggle:hover { 
  background: var(--glass-hover);
  border-color: var(--accent);
  transform: translateY(-2px) scale(1.05);
}

/* ── Form Styling ── */
.auth-form-header { margin-bottom: 32px; }
.auth-form-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
}
.auth-form-eyebrow-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--accent);
  animation: dot-pulse 2s ease infinite;
}
@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.4); }
}
.auth-form-header h1 {
  font-family: 'Syne', sans-serif;
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.1;
  margin-bottom: 8px;
}
.auth-form-header p {
  font-size: 14px;
  color: var(--text2);
}
.auth-form-header p a { color: var(--accent); text-decoration: none; font-weight: 600; }

.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--text2); }
.form-input-wrap { position: relative; }
.form-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--text3); transition: color 0.2s; display: flex;
}
.form-input {
  width: 100%; padding: 13px 14px 13px 42px;
  background: var(--input-bg); border: 1px solid var(--input-border);
  border-radius: 12px; color: var(--text); font-size: 15px;
  outline: none; transition: all 0.2s;
}
.form-input:focus { border-color: var(--border-focus); background: var(--glass-hover); }
.form-input:focus + .form-input-icon { color: var(--accent); }

.auth-btn {
  width: 100%; padding: 14px; border-radius: 12px;
  font-weight: 700; cursor: pointer; border: none;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.25s;
}
.auth-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #000; box-shadow: 0 4px 20px rgba(0,229,160,0.3);
}
.auth-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,229,160,0.4); }

.auth-divider { display: flex; align-items: center; gap: 12px; margin: 4px 0; }
.auth-divider-line { flex: 1; height: 1px; background: var(--border); }
.auth-divider-text { font-size: 12px; color: var(--text3); font-family: 'DM Mono', monospace; }

.oauth-btn {
  width: 100%; padding: 12px; border-radius: 12px;
  background: var(--glass); border: 1px solid var(--border);
  color: var(--text); font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: all 0.2s;
}
.oauth-btn:hover { background: var(--glass-hover); transform: translateY(-1px); }

.auth-particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.auth-particle { position: absolute; border-radius: 50%; background: #00e5a0; animation: particle-rise linear infinite; }
@keyframes particle-rise {
  0% { transform: translateY(100vh) scale(0); opacity: 0; }
  10% { opacity: 0.4; transform: scale(1); }
  100% { transform: translateY(-20px) scale(0.5); opacity: 0; }
}

/* ── Role Selection ── */
.role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.role-card {
  background: var(--glass); border: 1px solid var(--border); border-radius: 16px;
  padding: 16px 12px; display: flex; flex-direction: column; align-items: center;
  gap: 10px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
}
.role-card:hover { background: var(--glass-hover); border-color: var(--accent2); transform: translateY(-2px); }
.role-card.selected { background: rgba(0,229,160,0.08); border-color: var(--accent); box-shadow: 0 0 20px rgba(0,229,160,0.1); }
.role-card-icon { 
  width: 40px; height: 40px; border-radius: 10px; background: var(--bg3); 
  display: flex; align-items: center; justify-content: center; color: var(--text2);
  transition: all 0.2s;
}
.role-card.selected .role-card-icon { background: var(--accent); color: #000; }
.role-card-label { font-size: 13px; font-weight: 700; color: var(--text); }
.role-card.selected .role-card-label { color: var(--accent); }

@media (max-width: 440px) {
  .role-grid { grid-template-columns: 1fr; }
  .role-card { flex-direction: row; padding: 12px 16px; gap: 16px; justify-content: flex-start; }
}

/* ── Step Dots ── */
.auth-step-dots { display: flex; gap: 6px; margin-bottom: 32px; }
.auth-step-dot { height: 8px; border-radius: 4px; background: var(--border); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.auth-step-dot.active { background: var(--accent); box-shadow: 0 0 10px rgba(0,229,160,0.3); }
.auth-step-dot.done { background: var(--accent2); }

/* ── Password Strength ── */
.password-strength { margin-top: 8px; }
.password-strength-bars { display: flex; gap: 4px; margin-bottom: 6px; }
.password-strength-bar { height: 4px; flex: 1; border-radius: 2px; background: var(--border); transition: all 0.3s; }
.password-strength-bar.active-weak { background: var(--danger); }
.password-strength-bar.active-fair { background: var(--warn); }
.password-strength-bar.active-good { background: var(--accent2); }
.password-strength-bar.active-strong { background: var(--accent); }
.password-strength-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text3); }

/* ── Form Extras ── */
.form-checkbox-row { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; margin: 4px 0; }
.form-checkbox-input { 
  width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--border); 
  background: var(--input-bg); transition: all 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
}
.form-checkbox-input.checked { background: var(--accent); border-color: var(--accent); }
.form-checkbox-input.checked::after {
  content: ""; width: 5px; height: 10px; border: solid #000; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-1px, -1px);
}
.form-checkbox-label { font-size: 13px; color: var(--text2); }

.forgot-link { font-size: 12px; color: var(--accent); text-decoration: none; font-weight: 600; }
.forgot-link:hover { text-decoration: underline; }

.form-input-action {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--text3); cursor: pointer; padding: 4px; display: flex;
}
.form-input-action:hover { color: var(--text); }

.auth-alert {
  padding: 12px 14px; border-radius: 12px; font-size: 13px; font-weight: 500;
  display: flex; align-items: center; gap: 10px; line-height: 1.4;
}
.auth-alert-error { background: rgba(255, 92, 92, 0.1); border: 1px solid rgba(255, 92, 92, 0.2); color: #ff5c5c; }

.auth-back-link {
  display: inline-flex; align-items: center; gap: 8px; font-size: 13px; fontWeight: 600;
  color: var(--text2); text-decoration: none; margin-bottom: 24px; transition: color 0.2s;
}
.auth-back-link:hover { color: var(--accent); }

.auth-footer-note { margin-top: 24px; text-align: center; font-size: 12px; color: var(--text3); line-height: 1.6; }
.auth-footer-note a { color: var(--text2); text-decoration: none; font-weight: 600; }
.auth-footer-note a:hover { color: var(--accent); }

.otp-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 20px rgba(0,229,160,0.15); outline: none; }
`;

// ─── AuthLayout Component ─────────────────────────────────────────────────────
interface AuthLayoutProps {
  children: React.ReactNode;
  headline?: string;
  headlineHighlight?: string;
  subtext?: string;
  quote?: { text: string; name: string; role: string; avatar: string };
}

export default function AuthLayout({
  children,
  headline = "Healthcare intelligence re-imagined",
  headlineHighlight = "re-imagined",
  subtext = "MedBridge connects patients, doctors, and clinics through AI built for Africa.",
  quote = {
    text: "AfriDx correctly raised malaria before I even mentioned fever. It understood the symptom pattern instantly.",
    name: "Dr. Aisha Bello",
    role: "GP, Abuja",
    avatar: "A",
  },
}: AuthLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ background: '#03050a', minHeight: '100vh' }} />;
  }

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  const parts = headline.split(headlineHighlight);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="auth-left-grid" />
          {mounted && (
            <div className="auth-particles">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="auth-particle"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    bottom: `-${Math.random() * 10}%`,
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                    animationDuration: `${8 + Math.random() * 12}s`,
                    animationDelay: `${Math.random() * 8}s`,
                    opacity: 0.3 + Math.random() * 0.3,
                  }}
                />
              ))}
            </div>
          )}

          <div className="auth-left-content">
            <div className="auth-left-top">
              <a href="/" className="auth-logo">
                <div className="auth-logo-mark">M</div>
                <span className="auth-logo-name">Med<span>Bridge</span></span>
              </a>
              <div className="auth-left-headline">
                <h2>{parts[0]}<em>{headlineHighlight}</em>{parts[1]}</h2>
                <p>{subtext}</p>
                <div className="auth-trust">
                  {["NDPR Compliant", "AfriDx Engine", "5,000+ Drugs"].map(t => (
                    <div key={t} className="auth-trust-pill">
                      <div className="auth-trust-pill-dot" />{t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="auth-left-quote">
              <div className="auth-left-quote-mark">"</div>
              <p>{quote.text}</p>
              <div className="auth-left-quote-author">
                <div className="auth-left-quote-avatar">{quote.avatar}</div>
                <div>
                  <div className="auth-left-quote-name">{quote.name}</div>
                  <div className="auth-left-quote-role">{quote.role}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-ecg-wrap">
            <svg width="100%" height="80" viewBox="0 0 600 80" preserveAspectRatio="none">
              <polyline
                className="auth-ecg-line"
                points="0,40 80,40 100,40 115,15 130,65 145,30 160,50 175,40 250,40 265,40 280,10 295,70 310,25 325,55 340,40 450,40 600,40"
                fill="none"
                stroke="#00e5a0"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="auth-right">
          <button className="auth-theme-toggle" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="auth-right-inner">
            <a href="/" className="auth-logo auth-mobile-logo">
              <div className="auth-logo-mark">M</div>
              <span className="auth-logo-name">Med<span>Bridge</span></span>
            </a>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
