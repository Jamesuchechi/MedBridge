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
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
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

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setLoading(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Redirect handled by middleware or automatic route change
      window.location.href = "/dashboard";
    }
  };

  return (
    <>
      <div className="auth-form-header">
        <div className="auth-form-eyebrow">
          <div className="auth-form-eyebrow-dot" />
          Welcome back
        </div>
        <h1>Sign in to<br />MedBridge</h1>
        <p>
          Don&apos;t have an account?{" "}
          <a href="/signup">Create one free</a>
        </p>
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
        <span className="auth-divider-text">or continue with email</span>
        <div className="auth-divider-line" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label">Email address</label>
          <div className="form-input-wrap">
            <div className="form-input-icon"><MailIcon /></div>
            <input
              type="email"
              className={`form-input ${error ? "error" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              autoFocus
            />
          </div>
        </div>

        <div className="form-field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label">Password</label>
            <a href="/forgot-password" className="forgot-link">Forgot?</a>
          </div>
          <div className="form-input-wrap">
            <div className="form-input-icon"><LockIcon /></div>
            <input
              type={showPw ? "text" : "password"}
              className={`form-input ${error ? "error" : ""}`}
              placeholder="••••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              autoComplete="current-password"
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              className="form-input-action"
              onClick={() => setShowPw(v => !v)}
              tabIndex={-1}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div
          className="form-checkbox-row"
          onClick={() => setRemember(v => !v)}
          role="checkbox"
          aria-checked={remember}
          tabIndex={0}
          onKeyDown={e => e.key === " " && setRemember(v => !v)}
        >
          <div className={`form-checkbox-input ${remember ? "checked" : ""}`} />
          <span className="form-checkbox-label">Remember me for 30 days</span>
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRightIcon />}
        </button>
      </form>

      <p className="auth-footer-note">
        By signing in, you agree to our{" "}
        <a href="/terms">Terms of Service</a> and{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout
      headline="Healthcare intelligence re-imagined"
      headlineHighlight="re-imagined"
      subtext="Sign in to access your health profile, symptom checker, and document analyzer."
      quote={{
        text: "I uploaded my lab results and MedBridge explained everything in plain English. My doctor didn't even do that.",
        name: "Emeka O.",
        role: "Patient, Lagos",
        avatar: "E",
      }}
    >
      <LoginForm />
    </AuthLayout>
  );
}
