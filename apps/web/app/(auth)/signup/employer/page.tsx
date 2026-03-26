"use client";

import React, { useState, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import Link from "next/link";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Check:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>,
  Back:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>,
  ArrowR:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Alert:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Mail:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>,
  Lock:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  User:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Briefcase: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmployerFormData {
  // Step 1 — Account
  email:        string;
  password:     string;
  adminName:    string;
  // Step 2 — Company Info
  companyName:  string;
  industry:     string;
  companySize:  string;
  // Step 3 — Verification
  phone:        string;
  address:      string;
}

const EMPTY: EmployerFormData = {
  email: "", password: "", adminName: "",
  companyName: "", industry: "", companySize: "1-10",
  phone: "", address: "",
};

const STEPS = [
  { label: "Account",   sub: "Admin login details" },
  { label: "Company",   sub: "Organization details" },
  { label: "Contact",   sub: "Verification info" },
  { label: "Finalize",  sub: "Review and join Pulse" },
];

const INDUSTRIES = [
  "Finance & Banking", "Technology & Media", "Manufacturing", "Energy & Oil",
  "Retail & E-commerce", "Logistics & Transport", "Hospitality", "Public Sector", "Other"
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
.em-page { width:100%; max-width:560px; margin:0 auto; padding:40px 20px 80px; animation:em-in .4s ease; }
@keyframes em-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
.em-progress { margin-bottom:32px; }
.em-steps { display:flex; gap:6px; margin-bottom:10px; }
.em-step-pip { flex:1; height:4px; border-radius:2px; background:var(--border,rgba(255,255,255,.08)); transition:background .3s; }
.em-step-pip.active { background:var(--accent,#ffb800); }
.em-step-pip.done { background:#ffb800; }
.em-step-label { font-size:12px; color:var(--text2); }
.em-step-label span { color:#ffb800; font-weight:700; }
.em-section { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:20px; padding:28px; margin-bottom:16px; }
.em-section-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; margin-bottom:6px; }
.em-section-sub { font-size:13px; color:var(--text2); margin-bottom:24px; }
.em-field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.em-label { font-size:12px; font-weight:700; color:var(--text2); }
.em-label .req { color:#ff7c2b; }
.em-input, .em-select {
  width:100%; padding:11px 14px;
  background:rgba(255,255,255,.04);
  border:1.5px solid var(--border,rgba(255,255,255,.08));
  border-radius:11px; color:var(--text); font-size:14px; outline:none;
}
.em-input:focus, .em-select:focus { border-color:rgba(255,184,0,.5); }
.em-error { font-size:12px; color:#ff5c5c; }
.em-nav { display:flex; gap:10px; margin-top:8px; }
.em-btn { display:flex; align-items:center; gap:8px; padding:13px 22px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; border:none; transition:all .2s; }
.em-btn-primary { background:#ffb800; color:#000; flex:1; justify-content:center; }
.em-btn-ghost { background:rgba(255,255,255,.04); border:1px solid var(--border,rgba(255,255,255,.08)); color:var(--text2); }
.em-success { text-align:center; padding:40px 20px; }
.em-success-ring { width:88px; height:88px; border-radius:50%; background:rgba(255,184,0,.1); border:2px solid rgba(255,184,0,.25); display:flex; align-items:center; justify-content:center; margin:0 auto 24px; color:#ffb800; }
`;

export default function EmployerSignupPage() {
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState<EmployerFormData>(EMPTY);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [globalError,  setGlobalError]  = useState("");
  const [user,         setUser]         = useState<{ id: string; email: string } | null>(null);

  const set = (patch: Partial<EmployerFormData>) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser({ id: u.id, email: u.email || "" });
        setStep(2);
        if (u.email) set({ email: u.email });
      }
    };
    init();
  }, []);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!user) {
      if (!data.email.trim()) e.email = "Work email is required.";
      if (!data.password.trim()) e.password = "Password is required.";
      else if (data.password.length < 8) e.password = "Min. 8 characters required.";
      if (!data.adminName.trim()) e.adminName = "Name is required.";
    }
    return e;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!data.companyName.trim()) e.companyName = "Company name is required.";
    if (!data.industry)          e.industry    = "Industry is required.";
    return e;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!data.phone.trim())   e.phone   = "Phone is required.";
    if (!data.address.trim()) e.address = "Address is required.";
    return e;
  };

  const handleNext = () => {
    let errs: Record<string, string> = {};
    if (step === 1) errs = validateStep1();
    if (step === 2) errs = validateStep2();
    if (step === 3) errs = validateStep3();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setGlobalError("");

    try {
      let currentUserId = user?.id;

      // 1. Auth step
      if (!currentUserId) {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { full_name: data.adminName, role: "EMPLOYER" },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Could not create account.");
        currentUserId = authData.user.id;
      }

      if (!currentUserId) throw new Error("User session not found.");

      // 2. Profile step
      await api.post("/api/v1/employer/register", {
        companyName:  data.companyName,
        industry:     data.industry,
        companySize:  data.companySize,
        contactPhone: data.phone,
        address:      data.address,
      }, {
        headers: {
          "x-user-id":   currentUserId as string,
          "x-user-role": "EMPLOYER",
        },
      });

      setSubmitted(true);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <style>{CSS}</style>
        <div className="em-page">
          <div className="em-section em-success">
            <div className="em-success-ring"><Ic.Check /></div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Registration Sent!</h2>
            <p style={{ color: "var(--text2)", fontSize: 14, maxWidth: 360, margin: "0 auto 24px" }}>
              Welcome to MedBridge Pulse. We are setting up your dashboard. Check your email for next steps.
            </p>
            <Link href="/dashboard" className="em-btn em-btn-primary" style={{ display: "inline-flex", width: "auto", padding: "12px 28px" }}>
              Go to Dashboard <Ic.ArrowR />
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Workforce Wellness" headlineHighlight="Wellness" subtext="Data-driven health insights for the African workforce.">
      <style>{CSS}</style>
      <div className="em-page">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 500, color: "#ffb800", marginBottom: 8, textTransform: "uppercase" }}>MedBridge Pulse</div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 30 }}>Join Pulse</h1>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>Empower your HR with aggregated employee health trends.</p>
        </div>

        <div className="em-progress">
          <div className="em-steps">
            {STEPS.map((_, i) => (
              <div key={i} className={`em-step-pip ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}`} />
            ))}
          </div>
          <div className="em-step-label">Step {step} of {STEPS.length} — <span>{STEPS[step - 1].label}</span></div>
        </div>

        {step === 1 && (
          <div className="em-section">
            <div className="em-section-title">Admin Account</div>
            <div className="em-section-sub">Pulse dashboard access credentials</div>
            <div className="em-field">
              <label className="em-label">Full Name <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><Ic.User /></div>
                <input className="em-input" style={{ paddingLeft: 40 }} placeholder="HR Manager Name" value={data.adminName} onChange={e => set({ adminName: e.target.value })} autoFocus />
              </div>
            </div>
            <div className="em-field">
              <label className="em-label">Work Email <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><Ic.Mail /></div>
                <input className="em-input" style={{ paddingLeft: 40 }} type="email" placeholder="hr@company.com" value={data.email} onChange={e => set({ email: e.target.value })} />
              </div>
              {errors.email && <span className="em-error">{errors.email}</span>}
            </div>
            <div className="em-field">
              <label className="em-label">Password <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><Ic.Lock /></div>
                <input className="em-input" style={{ paddingLeft: 40 }} type="password" placeholder="Min. 8 characters" value={data.password} onChange={e => set({ password: e.target.value })} />
              </div>
              {errors.password && <span className="em-error">{errors.password}</span>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="em-section">
            <div className="em-section-title">Company Info</div>
            <div className="em-section-sub">About your organization</div>
            <div className="em-field">
              <label className="em-label">Organization Name <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><Ic.Briefcase /></div>
                <input className="em-input" style={{ paddingLeft: 40 }} placeholder="e.g. Acme Corp" value={data.companyName} onChange={e => set({ companyName: e.target.value })} autoFocus />
              </div>
              {errors.companyName && <span className="em-error">{errors.companyName}</span>}
            </div>
            <div className="em-field">
              <label className="em-label">Industry <span className="req">*</span></label>
              <select className="em-select" value={data.industry} onChange={e => set({ industry: e.target.value })}>
                <option value="">Select Industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="em-field">
              <label className="em-label">Number of Employees</label>
              <div className="em-chips" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COMPANY_SIZES.map(s => (
                  <button key={s} type="button" onClick={() => set({ companySize: s })} style={{ 
                    padding: '8px 16px', borderRadius: 100, border: '1.5px solid var(--border)', background: data.companySize === s ? '#ffb80020' : 'transparent',
                    color: data.companySize === s ? '#ffb800' : 'var(--text2)', borderColor: data.companySize === s ? '#ffb800' : 'var(--border)', fontSize: 13, cursor: 'pointer'
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="em-section">
            <div className="em-section-title">Verification</div>
            <div className="em-section-sub">Contact details for account verification</div>
            <div className="em-field">
              <label className="em-label">Contact Phone <span className="req">*</span></label>
              <input className="em-input" placeholder="080..." value={data.phone} onChange={e => set({ phone: e.target.value })} autoFocus />
            </div>
            <div className="em-field">
              <label className="em-label">Office Address <span className="req">*</span></label>
              <input className="em-input" placeholder="HQ Address" value={data.address} onChange={e => set({ address: e.target.value })} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="em-section">
            <div className="em-section-title">Pulse Review</div>
            <div className="em-section-sub">Review your details and join Pulse</div>
            <div style={{ background: '#ffb80008', border: '1px solid #ffb80020', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                By joining Pulse, you agree that MedBridge will only provide <strong>aggregated and anonymized</strong> health data. 
                Individual employee records are never shared with employers.
              </p>
            </div>
          </div>
        )}

        {globalError && <div style={{ color: '#ff5c5c', background: '#ff5c5c10', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 16 }}>{globalError}</div>}

        <div className="em-nav">
          {step > (user ? 2 : 1) && <button className="em-btn em-btn-ghost" onClick={() => setStep(step - 1)}><Ic.Back /> Back</button>}
          {step < 4 ? <button className="em-btn em-btn-primary" onClick={handleNext}>Continue <Ic.ArrowR /></button> :
          <button className="em-btn em-btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? "Joining..." : "Join Pulse"}</button>}
        </div>
      </div>
    </AuthLayout>
  );
}
