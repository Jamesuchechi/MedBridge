"use client";

import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout headline="Check your inbox" headlineHighlight="inbox">
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <h1 style={{ marginBottom: 12 }}>Email sent</h1>
          <p style={{ color: "var(--text2)", marginBottom: 24 }}>
            We&apos;ve sent a reset link to {email}.
          </p>
          <a href="/login" className="auth-btn auth-btn-primary">Back to login</a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Forgot your password?" headlineHighlight="password">
      <a href="/login" className="auth-back-link"><ArrowLeftIcon /> Back to login</a>
      <div className="auth-form-header">
        <h1>Reset password</h1>
        <p>Enter your email and we&apos;ll send you a link.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
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
        <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
          {!loading && <ArrowRightIcon />}
        </button>
      </form>
    </AuthLayout>
  );
}
