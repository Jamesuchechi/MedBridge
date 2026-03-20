"use client";

import { useState, useRef, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (idx: number, val: string) => {
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setVerified(true);
  };

  if (verified) {
    return (
      <AuthLayout headline="Email verified" headlineHighlight="verified">
        <div style={{ textAlign: "center" }}>
          <h1 style={{ marginBottom: 12 }}>Account active</h1>
          <p style={{ color: "var(--text2)", marginBottom: 24 }}>Your email has been verified. Welcome to MedBridge!</p>
          <a href="/dashboard" className="auth-btn auth-btn-primary">Go to dashboard <ArrowRightIcon /></a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Check your inbox" headlineHighlight="inbox">
      <div className="auth-form-header" style={{ textAlign: "center" }}>
        <h1>Verify email</h1>
        <p>Enter the 6-digit code we sent you.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="otp-row" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              className="otp-input"
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              style={{ width: 48, height: 56, textAlign: "center", fontSize: 24, borderRadius: 12, border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)" }}
            />
          ))}
        </div>
        <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>
    </AuthLayout>
  );
}
