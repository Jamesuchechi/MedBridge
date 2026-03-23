"use client";

import { useState, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DoctorFormData {
  // Step 1 — Personal
  fullName:    string;
  gender:      string;
  phone:       string;
  // Step 2 — Professional
  mdcnNumber:  string;
  specialization: string;
  subSpecialization: string;
  yearsExperience: string;
  currentHospital: string;
  hospitalState: string;
  isIndependent: boolean;
  // Step 3 — Practice
  consultationTypes: string[];
  languages:   string[];
  bio:         string;
}

const EMPTY: DoctorFormData = {
  fullName: "", gender: "", phone: "",
  mdcnNumber: "", specialization: "", subSpecialization: "",
  yearsExperience: "", currentHospital: "", hospitalState: "",
  isIndependent: false,
  consultationTypes: ["In-person"],
  languages: ["English"],
  bio: "",
};

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara",
];

const LANGUAGES = ["English", "Yoruba", "Hausa", "Igbo", "Pidgin", "French", "Arabic", "Other"];
const CONSULTATION_TYPES = ["In-person", "Telemedicine", "Both"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

.ds-page { width:100%; max-width:560px; margin:0 auto; padding:40px 20px 80px; animation:ds-in .4s ease; }
@keyframes ds-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

.ds-logo { display:flex; align-items:center; gap:10px; margin-bottom:40px; text-decoration:none; }
.ds-logo-mark { width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#00e5a0,#3d9bff); display:flex;align-items:center;justify-content:center; font-family:'Syne',sans-serif; font-weight:800; font-size:17px; color:#000; }
.ds-logo-name { font-family:'Syne',sans-serif; font-weight:700; font-size:20px; color:var(--text); }
.ds-logo-name span { color:var(--accent); }

/* ── Progress bar ── */
.ds-progress { margin-bottom:32px; }
.ds-steps { display:flex; gap:6px; margin-bottom:10px; }
.ds-step-pip { flex:1; height:4px; border-radius:2px; background:var(--border,rgba(255,255,255,.08)); transition:background .3s; }
.ds-step-pip.done   { background:var(--accent2,#3d9bff); }
.ds-step-pip.active { background:var(--accent,#00e5a0); }
.ds-step-label { font-size:12px; color:var(--text2); }
.ds-step-label span { color:var(--accent); font-weight:700; }

/* ── Section ── */
.ds-section { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:20px; padding:28px; margin-bottom:16px; }
.ds-section-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; margin-bottom:6px; }
.ds-section-sub { font-size:13px; color:var(--text2); margin-bottom:24px; }

/* ── Fields ── */
.ds-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media(max-width:500px) { .ds-grid-2 { grid-template-columns:1fr; } }
.ds-field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.ds-label { font-size:12px; font-weight:700; color:var(--text2); }
.ds-label .req { color:#ff7c2b; }
.ds-input, .ds-select, .ds-textarea {
  width:100%; padding:11px 14px;
  background:rgba(255,255,255,.04);
  border:1.5px solid var(--border,rgba(255,255,255,.08));
  border-radius:11px; color:var(--text); font-size:14px; outline:none;
  transition:border-color .2s;
  font-family:'DM Sans',sans-serif;
}
.ds-input:focus, .ds-select:focus, .ds-textarea:focus {
  border-color:rgba(0,229,160,.5);
  box-shadow:0 0 0 3px rgba(0,229,160,.08);
}
.ds-input.error { border-color:#ff5c5c; }
.ds-error { font-size:12px; color:#ff5c5c; }
.ds-textarea { resize:vertical; min-height:90px; }

/* ── MDCN field hint ── */
.ds-hint { font-size:11px; color:var(--text3); margin-top:4px; font-family:'DM Mono',monospace; }
.ds-mdcn-valid { font-size:11px; color:var(--accent); font-family:'DM Mono',monospace; margin-top:4px; display:flex;align-items:center;gap:4px; }

/* ── Toggle chips ── */
.ds-chips { display:flex; flex-wrap:wrap; gap:7px; }
.ds-chip { padding:7px 14px; border:1.5px solid var(--border,rgba(255,255,255,.08)); border-radius:100px; background:rgba(255,255,255,.03); font-size:12px; font-weight:600; cursor:pointer; transition:all .18s; color:var(--text2); }
.ds-chip.active { border-color:var(--chip-color,var(--accent)); background:color-mix(in srgb,var(--chip-color,var(--accent)) 10%,transparent); color:var(--chip-color,var(--accent)); }

/* ── Toggle switch ── */
.ds-toggle-row { display:flex; align-items:center; gap:12px; padding:14px; background:rgba(255,255,255,.03); border:1px solid var(--border,rgba(255,255,255,.08)); border-radius:12px; cursor:pointer; }
.ds-toggle-switch { width:40px; height:22px; border-radius:11px; background:var(--border,rgba(255,255,255,.12)); position:relative; flex-shrink:0; transition:background .2s; }
.ds-toggle-switch.on { background:var(--accent); }
.ds-toggle-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:transform .2s; box-shadow:0 1px 4px rgba(0,0,0,.3); }
.ds-toggle-switch.on .ds-toggle-thumb { transform:translateX(18px); }
.ds-toggle-label { font-size:14px; font-weight:600; }
.ds-toggle-sub { font-size:12px; color:var(--text2); }

/* ── Navigation ── */
.ds-nav { display:flex; gap:10px; margin-top:8px; }
.ds-btn { display:flex; align-items:center; gap:8px; padding:13px 22px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; border:none; transition:all .2s; }
.ds-btn-primary { background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#000; flex:1; justify-content:center; }
.ds-btn-primary:hover { transform:translateY(-2px); }
.ds-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.ds-btn-ghost { background:var(--glass,rgba(255,255,255,.04)); border:1px solid var(--border,rgba(255,255,255,.08)); color:var(--text2); }
.ds-btn-ghost:hover { color:var(--text); }

/* ── Success state ── */
.ds-success { text-align:center; padding:40px 20px; }
.ds-success-ring { width:88px; height:88px; border-radius:50%; background:rgba(0,229,160,.1); border:2px solid rgba(0,229,160,.25); display:flex; align-items:center; justify-content:center; margin:0 auto 24px; color:var(--accent); }
.ds-success-ring svg { width:44px; height:44px; }
.ds-badge-timeline { display:flex; flex-direction:column; gap:0; margin:28px 0; max-width:360px; margin-left:auto; margin-right:auto; }
.ds-badge-step { display:flex; align-items:flex-start; gap:14px; padding:14px 0; }
.ds-badge-step:not(:last-child) { border-bottom:1px solid var(--border,rgba(255,255,255,.06)); }
.ds-badge-dot { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
.ds-badge-text { font-size:13px; color:var(--text2); }
.ds-badge-text strong { color:var(--text); display:block; margin-bottom:2px; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Check:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Back:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ArrowR:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Alert:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

const STEPS = [
  { label: "Personal Info", sub: "Your name and contact details" },
  { label: "Professional",  sub: "MDCN credentials and specialty" },
  { label: "Practice",      sub: "How you see patients" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function DoctorSignupPage() {
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState<DoctorFormData>(EMPTY);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [globalError,  setGlobalError]  = useState("");
  const [user,         setUser]         = useState<{ id: string; email: string } | null>(null);

  // Validate MDCN format live
  const mdcnValid = /^MDCN\/\d{4,6}\/\d{4}$/i.test(data.mdcnNumber.trim());

  const set = (patch: Partial<DoctorFormData>) => setData((d) => ({ ...d, ...patch }));
  const toggleChip = (field: "consultationTypes" | "languages", val: string) => {
    const arr = data[field] as string[];
    set({ [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] });
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = "/login?redirect=/signup/doctor"; return; }
      setUser({ id: u.id, email: u.email || "" });

      // Fetch specializations from API
      api.get<string[]>("/api/v1/doctors/specializations")
        .then(setSpecializations)
        .catch(() => setSpecializations([]));
    };
    init();
  }, []);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!data.fullName.trim())  e.fullName  = "Full name is required.";
    if (!data.phone.trim())     e.phone     = "Phone number is required.";
    return e;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!data.mdcnNumber.trim())    e.mdcnNumber    = "MDCN number is required.";
    else if (!mdcnValid)             e.mdcnNumber    = "Format must be MDCN/12345/2020.";
    if (!data.specialization)       e.specialization = "Please select a specialization.";
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
      await api.post("/api/v1/doctors/register", {
        fullName:          data.fullName.trim(),
        gender:            data.gender || undefined,
        phone:             data.phone.trim(),
        mdcnNumber:        data.mdcnNumber.trim().toUpperCase(),
        specialization:    data.specialization,
        subSpecialization: data.subSpecialization.trim() || undefined,
        yearsExperience:   data.yearsExperience ? parseInt(data.yearsExperience, 10) : undefined,
        currentHospital:   data.currentHospital.trim() || undefined,
        hospitalState:     data.hospitalState || undefined,
        isIndependent:     data.isIndependent,
        consultationTypes: data.consultationTypes,
        languages:         data.languages,
        bio:               data.bio.trim() || undefined,
      }, {
        headers: {
          "x-user-id":   user.id,
          "x-user-role": "CLINICIAN",
        },
      });

      setSubmitted(true);
    } catch (err: unknown) {
      const message = (err as { data?: { error?: string } })?.data?.error ||
                      "Something went wrong. Please try again.";
      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <style>{CSS}</style>
        <div className="ds-page">
          <div className="ds-section ds-success">
            <div className="ds-success-ring"><Ic.Check /></div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
              Application Submitted!
            </h2>
            <p style={{ color: "var(--text2)", fontSize: 14, maxWidth: 360, margin: "0 auto 24px" }}>
              We've received your credentials. Check your email for a confirmation.
            </p>
            <div className="ds-badge-timeline">
              {[
                { color: "#00e5a0", num: "1", title: "Application received", body: "Your MDCN number and credentials are logged." },
                { color: "#ffb800", num: "2", title: "Under review (1–2 days)", body: "Our clinical team verifies your credentials." },
                { color: "#3d9bff", num: "3", title: "Approval email sent", body: "You'll get full access to Doctor Copilot." },
              ].map((s) => (
                <div key={s.num} className="ds-badge-step">
                  <div className="ds-badge-dot" style={{ background: s.color + "20", color: s.color }}>
                    {s.num}
                  </div>
                  <div className="ds-badge-text">
                    <strong>{s.title}</strong>
                    {s.body}
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/dashboard"
              className="ds-btn ds-btn-primary"
              style={{ display: "inline-flex", width: "auto", padding: "12px 28px" }}
            >
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
      <div className="ds-page">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
            Doctor Onboarding
          </div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", marginBottom: 6 }}>
            Verify your credentials
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>
            Already have an account? <a href="/login" style={{ color: "var(--accent)", fontWeight: 700 }}>Sign in</a> · or{" "}
            <a href="/signup" style={{ color: "var(--accent2)", fontWeight: 700 }}>create a patient account</a>
          </p>
        </div>

        {/* Progress */}
        <div className="ds-progress">
          <div className="ds-steps">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`ds-step-pip ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}`}
              />
            ))}
          </div>
          <div className="ds-step-label">
            Step {step} of {STEPS.length} — <span>{STEPS[step - 1].label}</span>
          </div>
        </div>

        {/* ── Step 1 — Personal ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="ds-section">
            <div className="ds-section-title">Personal Information</div>
            <div className="ds-section-sub">Your name as it appears on your MDCN certificate</div>

            <div className="ds-field">
              <label className="ds-label">Full name <span className="req">*</span></label>
              <input
                className={`ds-input ${errors.fullName ? "error" : ""}`}
                placeholder="Dr. Emeka Okonkwo"
                value={data.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                autoFocus
              />
              {errors.fullName && <span className="ds-error">{errors.fullName}</span>}
            </div>

            <div className="ds-grid-2">
              <div className="ds-field">
                <label className="ds-label">Gender</label>
                <select className="ds-select" value={data.gender} onChange={(e) => set({ gender: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="ds-field">
                <label className="ds-label">Phone number <span className="req">*</span></label>
                <input
                  className={`ds-input ${errors.phone ? "error" : ""}`}
                  placeholder="08012345678"
                  value={data.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
                {errors.phone && <span className="ds-error">{errors.phone}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 — Professional ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="ds-section">
            <div className="ds-section-title">MDCN Credentials</div>
            <div className="ds-section-sub">Enter exactly as shown on your MDCN certificate</div>

            <div className="ds-field">
              <label className="ds-label">MDCN Registration Number <span className="req">*</span></label>
              <input
                className={`ds-input ${errors.mdcnNumber ? "error" : ""}`}
                placeholder="MDCN/12345/2020"
                value={data.mdcnNumber}
                onChange={(e) => set({ mdcnNumber: e.target.value })}
                autoFocus
              />
              {errors.mdcnNumber && <span className="ds-error">{errors.mdcnNumber}</span>}
              {!errors.mdcnNumber && data.mdcnNumber && mdcnValid && (
                <span className="ds-mdcn-valid"><Ic.Check /> Valid format</span>
              )}
              {!errors.mdcnNumber && (
                <span className="ds-hint">Format: MDCN/NNNNN/YYYY · e.g. MDCN/98765/2018</span>
              )}
            </div>

            <div className="ds-field">
              <label className="ds-label">Specialization <span className="req">*</span></label>
              <select
                className={`ds-select ${errors.specialization ? "error" : ""}`}
                value={data.specialization}
                onChange={(e) => set({ specialization: e.target.value })}
              >
                <option value="">Select your specialization</option>
                {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.specialization && <span className="ds-error">{errors.specialization}</span>}
            </div>

            <div className="ds-grid-2">
              <div className="ds-field">
                <label className="ds-label">Sub-specialization</label>
                <input
                  className="ds-input"
                  placeholder="e.g. Tropical Medicine"
                  value={data.subSpecialization}
                  onChange={(e) => set({ subSpecialization: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">Years of experience</label>
                <input
                  className="ds-input"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="e.g. 8"
                  value={data.yearsExperience}
                  onChange={(e) => set({ yearsExperience: e.target.value })}
                />
              </div>
            </div>

            <div className="ds-grid-2">
              <div className="ds-field">
                <label className="ds-label">Current hospital / clinic</label>
                <input
                  className="ds-input"
                  placeholder="Lagos University Teaching Hospital"
                  value={data.currentHospital}
                  onChange={(e) => set({ currentHospital: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">State</label>
                <select className="ds-select" value={data.hospitalState} onChange={(e) => set({ hospitalState: e.target.value })}>
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div
              className="ds-toggle-row"
              onClick={() => set({ isIndependent: !data.isIndependent })}
            >
              <div className={`ds-toggle-switch ${data.isIndependent ? "on" : ""}`}>
                <div className="ds-toggle-thumb" />
              </div>
              <div>
                <div className="ds-toggle-label">I practice independently</div>
                <div className="ds-toggle-sub">Not affiliated with a specific clinic or hospital</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3 — Practice ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="ds-section">
            <div className="ds-section-title">Practice Details</div>
            <div className="ds-section-sub">Help patients know how you can help them</div>

            <div className="ds-field">
              <label className="ds-label">Consultation types</label>
              <div className="ds-chips">
                {CONSULTATION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`ds-chip ${data.consultationTypes.includes(t) ? "active" : ""}`}
                    style={{ "--chip-color": "var(--accent2,#3d9bff)" } as React.CSSProperties}
                    onClick={() => toggleChip("consultationTypes", t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="ds-field">
              <label className="ds-label">Languages spoken</label>
              <div className="ds-chips">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`ds-chip ${data.languages.includes(l) ? "active" : ""}`}
                    style={{ "--chip-color": "var(--accent,#00e5a0)" } as React.CSSProperties}
                    onClick={() => toggleChip("languages", l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="ds-field">
              <label className="ds-label">Professional bio (optional)</label>
              <textarea
                className="ds-textarea"
                placeholder="Brief overview of your clinical focus, experience, and approach to patient care..."
                value={data.bio}
                onChange={(e) => set({ bio: e.target.value })}
                maxLength={1000}
              />
              <span className="ds-hint">{data.bio.length}/1000 characters</span>
            </div>
          </div>
        )}

        {/* Global error */}
        {globalError && (
          <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(255,92,92,.1)", border: "1px solid rgba(255,92,92,.25)", borderRadius: 12, marginBottom: 16, color: "#ff5c5c", fontSize: 13 }}>
            <Ic.Alert /> {globalError}
          </div>
        )}

        {/* Navigation */}
        <div className="ds-nav">
          {step > 1 && (
            <button className="ds-btn ds-btn-ghost" onClick={() => setStep(step - 1)}>
              <Ic.Back /> Back
            </button>
          )}
          {step < 3 ? (
            <button className="ds-btn ds-btn-primary" onClick={handleNext}>
              Continue <Ic.ArrowR />
            </button>
          ) : (
            <button
              className="ds-btn ds-btn-primary"
              onClick={handleSubmit}
              disabled={loading || data.consultationTypes.length === 0 || data.languages.length === 0}
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
          By submitting, you confirm that all information is accurate and matches your MDCN certificate.
        </p>
      </div>
    </AuthLayout>
  );
}
