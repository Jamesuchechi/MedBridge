"use client";

import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const PatientIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const DoctorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M22 12l-4-4v3H3v2h15v3l4-4z"/>
  </svg>
);
const ClinicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M12 6v4M14 14h-4M14 18h-4M14 8h-4"/>
    <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", key: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const keys = ["", "weak", "fair", "good", "strong"];
  return { score, label: labels[score], key: keys[score] };
}

type Role = "PATIENT" | "CLINICIAN" | "CLINIC_ADMIN";

function StepRole({ role, setRole, onNext }: {
  role: Role | null;
  setRole: (r: Role) => void;
  onNext: () => void;
}) {
  const roles = [
    { key: "PATIENT" as Role, label: "Patient", Icon: PatientIcon, desc: "Check symptoms and analyze docs" },
    { key: "CLINICIAN" as Role, label: "Doctor", Icon: DoctorIcon, desc: "AI copilot and clinical tools" },
    { key: "CLINIC_ADMIN" as Role, label: "Clinic", Icon: ClinicIcon, desc: "EMR and appointment management" },
  ];

  return (
    <>
      <div className="auth-form-header">
        <div className="auth-form-eyebrow">
          <div className="auth-form-eyebrow-dot" />
          Step 1 of 2
        </div>
        <h1>Who are you<br />signing up as?</h1>
        <p>This determines your dashboard experience.</p>
      </div>

      <div className="role-grid" style={{ marginBottom: 24 }}>
        {roles.map(({ key, label, Icon }) => (
          <div
            key={key}
            className={`role-card ${role === key ? "selected" : ""}`}
            onClick={() => setRole(key)}
            role="radio"
            aria-checked={role === key}
          >
            <div className="role-card-icon"><Icon /></div>
            <span className="role-card-label">{label}</span>
          </div>
        ))}
      </div>

      <button
        className="auth-btn auth-btn-primary"
        onClick={onNext}
        disabled={!role}
        style={{ opacity: role ? 1 : 0.45 }}
      >
        Continue <ArrowRightIcon />
      </button>

      <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text2)" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </>
  );
}

function StepDetails({ role, onBack }: { role: Role; onBack: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!agreed) { setError("Please agree to the terms."); return; }
    setLoading(true);
    
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setError("");
      // Success state: redirect to verify page with email context
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    }
  };

  return (
    <>
      <div className="auth-form-header">
        <div className="auth-form-eyebrow">
          <div className="auth-form-eyebrow-dot" />
          Step 2 of 2 · {role.toLowerCase()}
        </div>
        <h1>Create your<br />account</h1>
        <p>Already have one? <a href="/login">Sign in instead</a></p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>
          <AlertIcon />
          {error}
        </div>
      )}

      <button 
        className="oauth-btn" 
        type="button" 
        style={{ marginBottom: 16 }}
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <GoogleIcon />
        {loading ? "Connecting..." : "Continue with Google"}
      </button>

      <div className="auth-divider" style={{ marginBottom: 16 }}>
        <div className="auth-divider-line" />
        <span className="auth-divider-text">or with email</span>
        <div className="auth-divider-line" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label">{role === "CLINIC_ADMIN" ? "Clinic name" : "Full name"}</label>
          <div className="form-input-wrap">
            <div className="form-input-icon"><UserIcon /></div>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Email address</label>
          <div className="form-input-wrap">
            <div className="form-input-icon"><MailIcon /></div>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Password</label>
          <div className="form-input-wrap">
            <div className="form-input-icon"><LockIcon /></div>
            <input
              type={showPw ? "text" : "password"}
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={{ paddingRight: 42 }}
            />
            <button type="button" className="form-input-action" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {password && (
            <div className="password-strength">
              <div className="password-strength-bars">
                {[1,2,3,4].map(n => (
                  <div key={n} className={`password-strength-bar ${n <= strength.score ? `active-${strength.key}` : ""}`} />
                ))}
              </div>
              <span className="password-strength-label">{strength.label}</span>
            </div>
          )}
        </div>

        <div className="form-checkbox-row" onClick={() => setAgreed(!agreed)}>
          <div className={`form-checkbox-input ${agreed ? "checked" : ""}`} />
          <span className="form-checkbox-label">I agree to the Terms and Privacy Policy</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" className="auth-btn" onClick={onBack} style={{ width: "auto", background: "var(--glass)" }}>
            <ArrowLeftIcon />
          </button>
          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>
    </>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);

  return (
    <AuthLayout
      headline={step === 1 ? "Join thousands already using MedBridge" : "Healthcare built for Africa"}
      headlineHighlight={step === 1 ? "MedBridge" : "Africa"}
      subtext="Smart symptom checking and document analysis built for Nigeria."
    >
      <div className="auth-step-dots">
        {[1, 2].map(n => (
          <div key={n} className={`auth-step-dot ${n === step ? "active" : n < step ? "done" : ""}`} style={{ width: n === step ? 20 : 8 }} />
        ))}
      </div>

      {step === 1 ? (
        <StepRole role={role} setRole={setRole} onNext={() => setStep(2)} />
      ) : (
        role && <StepDetails role={role} onBack={() => setStep(1)} />
      )}
    </AuthLayout>
  );
}
