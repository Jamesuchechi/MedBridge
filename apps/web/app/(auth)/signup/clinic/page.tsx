"use client";

import { useState, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClinicFormData {
  // Step 1 — Basic Info
  name:      string;
  email:     string;
  phone:     string;
  // Step 2 — Location & Registration
  address:   string;
  state:     string;
  lga:       string;
  cacNumber: string;
  // Step 3 — Preferences
  subscriptionTier: string;
}

const EMPTY: ClinicFormData = {
  name: "", email: "", phone: "",
  address: "", state: "", lga: "", cacNumber: "",
  subscriptionTier: "BASIC",
};

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara",
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.cs-page { width:100%; max-width:560px; margin:0 auto; padding:40px 20px 80px; animation:cs-in .4s ease; }
@keyframes cs-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

/* Progress bar */
.cs-progress { margin-bottom:32px; }
.cs-steps { display:flex; gap:6px; margin-bottom:10px; }
.cs-step-pip { flex:1; height:4px; border-radius:2px; background:var(--border,rgba(255,255,255,.08)); transition:background .3s; }
.cs-step-pip.done   { background:var(--accent2,#c77dff); }
.cs-step-pip.active { background:var(--accent,#c77dff); }
.cs-step-label { font-size:12px; color:var(--text2); }
.cs-step-label span { color:var(--accent); font-weight:700; }

/* Section */
.cs-section { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:20px; padding:28px; margin-bottom:16px; }
.cs-section-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; margin-bottom:6px; }
.cs-section-sub { font-size:13px; color:var(--text2); margin-bottom:24px; }

/* Fields */
.cs-field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.cs-label { font-size:12px; font-weight:700; color:var(--text2); }
.cs-label .req { color:#ff7c2b; }
.cs-input, .cs-select, .cs-textarea {
  width:100%; padding:11px 14px;
  background:rgba(255,255,255,.04);
  border:1.5px solid var(--border,rgba(255,255,255,.08));
  border-radius:11px; color:var(--text); font-size:14px; outline:none;
  transition:border-color .2s;
  font-family:'DM Sans',sans-serif;
}
.cs-input:focus, .cs-select:focus, .cs-textarea:focus {
  border-color:rgba(199,125,255,.5);
  box-shadow:0 0 0 3px rgba(199,125,255,.08);
}
.cs-input.error { border-color:#ff5c5c; }
.cs-error { font-size:12px; color:#ff5c5c; }

/* Navigation */
.cs-nav { display:flex; gap:10px; margin-top:8px; }
.cs-btn { display:flex; align-items:center; gap:8px; padding:13px 22px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; border:none; transition:all .2s; }
.cs-btn-primary { background:linear-gradient(135deg,#c77dff,#3d9bff); color:#000; flex:1; justify-content:center; }
.cs-btn-primary:hover { transform:translateY(-2px); }
.cs-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.cs-btn-ghost { background:var(--glass,rgba(255,255,255,.04)); border:1px solid var(--border,rgba(255,255,255,.08)); color:var(--text2); }
.cs-btn-ghost:hover { color:var(--text); }

/* Success state */
.cs-success { text-align:center; padding:40px 20px; }
.cs-success-ring { width:88px; height:88px; border-radius:50%; background:rgba(199,125,255,.1); border:2px solid rgba(199,125,255,.25); display:flex; align-items:center; justify-content:center; margin:0 auto 24px; color:#c77dff; }
.cs-success-ring svg { width:44px; height:44px; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Check:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Back:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ArrowR:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Alert:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

const STEPS = [
  { label: "Basic Info",    sub: "Clinic name and contact" },
  { label: "Registration",  sub: "Legal and location details" },
  { label: "Finalize",      sub: "Review and submit" },
];

export default function ClinicSignupPage() {
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState<ClinicFormData>(EMPTY);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [globalError,  setGlobalError]  = useState("");
  const [user,         setUser]         = useState<{ id: string; email: string } | null>(null);

  const set = (patch: Partial<ClinicFormData>) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = "/login?redirect=/signup/clinic"; return; }
      setUser({ id: u.id, email: u.email || "" });
      
      // Auto-fill clinic email if available
      if (u.email) set({ email: u.email });
    };
    init();
  }, []);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!data.name.trim())  e.name  = "Clinic name is required.";
    if (!data.email.trim()) e.email = "Contact email is required.";
    if (!data.phone.trim()) e.phone = "Phone number is required.";
    return e;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!data.address.trim()) e.address = "Clinic address is required.";
    if (!data.state)          e.state   = "State is required.";
    if (!data.cacNumber.trim()) e.cacNumber = "CAC Registration number is required.";
    return e;
  };

  const handleNext = () => {
    let errs: Record<string, string> = {};
    if (step === 1) errs = validateStep1();
    if (step === 2) errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setGlobalError("");

    try {
      await api.post("/api/v1/clinics/register", {
        ...data,
      }, {
        headers: {
          "x-user-id":   user.id,
          "x-user-role": "CLINIC_ADMIN",
        },
      });

      setSubmitted(true);
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      setGlobalError(apiErr.data?.error || "Failed to register clinic. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <style>{CSS}</style>
        <div className="cs-page">
          <div className="cs-section cs-success">
            <div className="cs-success-ring"><Ic.Check /></div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
              Application Submitted!
            </h2>
            <p style={{ color: "var(--text2)", fontSize: 14, maxWidth: 360, margin: "0 auto 24px" }}>
              Your clinic registration is under review. Our team will verify your CAC credentials and email you within 24–48 hours.
            </p>
            <a href="/dashboard" className="cs-btn cs-btn-primary" style={{ display: "inline-flex", width: "auto", padding: "12px 28px" }}>
              Go to Dashboard <Ic.ArrowR />
            </a>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <style>{CSS}</style>
      <div className="cs-page">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#c77dff", marginBottom: 8 }}>
            Clinic Onboarding
          </div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", marginBottom: 6 }}>
            Register your clinic
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>
            Join the MedBridge network and manage your staff and appointments effectively.
          </p>
        </div>

        <div className="cs-progress">
          <div className="cs-steps">
            {STEPS.map((_, i) => (
              <div key={i} className={`cs-step-pip ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}`} />
            ))}
          </div>
          <div className="cs-step-label">
            Step {step} of {STEPS.length} — <span>{STEPS[step - 1].label}</span>
          </div>
        </div>

        {step === 1 && (
          <div className="cs-section">
            <div className="cs-section-title">Basic Information</div>
            <div className="cs-section-sub">Public clinic details for patient discovery</div>

            <div className="cs-field">
              <label className="cs-label">Clinic Name <span className="req">*</span></label>
              <input
                className={`cs-input ${errors.name ? "error" : ""}`}
                placeholder="e.g. St. Nicholas Hospital"
                value={data.name}
                onChange={(e) => set({ name: e.target.value })}
                autoFocus
              />
              {errors.name && <span className="cs-error">{errors.name}</span>}
            </div>

            <div className="cs-field">
              <label className="cs-label">Official Email <span className="req">*</span></label>
              <input
                className={`cs-input ${errors.email ? "error" : ""}`}
                type="email"
                placeholder="contact@clinic.com"
                value={data.email}
                onChange={(e) => set({ email: e.target.value })}
              />
              {errors.email && <span className="cs-error">{errors.email}</span>}
            </div>

            <div className="cs-field">
              <label className="cs-label">Phone Number <span className="req">*</span></label>
              <input
                className={`cs-input ${errors.phone ? "error" : ""}`}
                placeholder="08012345678"
                value={data.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
              {errors.phone && <span className="cs-error">{errors.phone}</span>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="cs-section">
            <div className="cs-section-title">Legal & Location</div>
            <div className="cs-section-sub">Required for identity verification</div>

            <div className="cs-field">
              <label className="cs-label">CAC Registration Number <span className="req">*</span></label>
              <input
                className={`cs-input ${errors.cacNumber ? "error" : ""}`}
                placeholder="RC-1234567"
                value={data.cacNumber}
                onChange={(e) => set({ cacNumber: e.target.value })}
                autoFocus
              />
              {errors.cacNumber && <span className="cs-error">{errors.cacNumber}</span>}
            </div>

            <div className="cs-field">
              <label className="cs-label">Full Address <span className="req">*</span></label>
              <input
                className={`cs-input ${errors.address ? "error" : ""}`}
                placeholder="15 Allen Avenue, Ikeja"
                value={data.address}
                onChange={(e) => set({ address: e.target.value })}
              />
              {errors.address && <span className="cs-error">{errors.address}</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="cs-field">
                <label className="cs-label">State <span className="req">*</span></label>
                <select className="cs-select" value={data.state} onChange={(e) => set({ state: e.target.value })}>
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <span className="cs-error">{errors.state}</span>}
              </div>
              <div className="cs-field">
                <label className="cs-label">LGA</label>
                <input
                  className="cs-input"
                  placeholder="e.g. Ikeja"
                  value={data.lga}
                  onChange={(e) => set({ lga: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="cs-section">
            <div className="cs-section-title">Review & Finalize</div>
            <div className="cs-section-sub">Almost there! Choose your plan and submit</div>

            <div className="cs-field">
              <label className="cs-label">Subscription Tier</label>
              <select className="cs-select" value={data.subscriptionTier} onChange={(e) => set({ subscriptionTier: e.target.value })}>
                <option value="BASIC">Basic (Free Trial)</option>
                <option value="PRO">Pro (EMR + Management)</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>

            <div style={{ background: "rgba(199,125,255,.05)", border: "1px solid rgba(199,125,255,.1)", borderRadius: 12, padding: 16, marginTop: 10 }}>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                By submitting, you agree that MedBridge may verify your CAC credentials with the Corporate Affairs Commission and reach out via the provided contact details.
              </div>
            </div>
          </div>
        )}

        {globalError && (
          <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(255,92,92,.1)", border: "1px solid rgba(255,92,92,.25)", borderRadius: 12, marginBottom: 16, color: "#ff5c5c", fontSize: 13 }}>
            <Ic.Alert /> {globalError}
          </div>
        )}

        <div className="cs-nav">
          {step > 1 && (
            <button className="cs-btn cs-btn-ghost" onClick={() => setStep(step - 1)}>
              <Ic.Back /> Back
            </button>
          )}
          {step < 3 ? (
            <button className="cs-btn cs-btn-primary" onClick={handleNext}>
              Continue <Ic.ArrowR />
            </button>
          ) : (
            <button className="cs-btn cs-btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
