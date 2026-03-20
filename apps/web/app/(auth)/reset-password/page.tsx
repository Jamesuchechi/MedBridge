"use client";

import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";

// ─── Icons ────────────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirm) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1600));
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <AuthLayout headline="Password updated" headlineHighlight="updated">
        <div style={{ textAlign: "center" }}>
          <h1 style={{ marginBottom: 12 }}>Success</h1>
          <p style={{ color: "var(--text2)", marginBottom: 24 }}>You can now sign in with your new password.</p>
          <a href="/login" className="auth-btn auth-btn-primary">Go to login <ArrowRightIcon /></a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Choose a new password" headlineHighlight="new">
      <div className="auth-form-header">
        <h1>Reset password</h1>
        <p>Choose a strong password you haven&apos;t used before.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label">New password</label>
          <div className="form-input-wrap">
            <div className="form-input-icon"><LockIcon /></div>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Confirm password</label>
          <div className="form-input-wrap">
            <div className="form-input-icon"><LockIcon /></div>
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm password"
            />
          </div>
        </div>

        <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
