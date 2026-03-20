"use client";

import { useState, useRef, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    const token = otp.join("");
    if (token.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setVerified(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  };

  useEffect(() => {
    // If user is already verified (via link in another tab), redirect them
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setVerified(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    };
    checkSession();
  }, [router]);

  const handleResend = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setError("Verification email resent!");
  };

  if (verified) {
    return (
      <AuthLayout headline="Email verified" headlineHighlight="verified">
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-bg, rgba(0,229,160,0.1))", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ marginBottom: 12 }}>Account active</h1>
          <p style={{ color: "var(--text2)", marginBottom: 24 }}>Your email has been verified. Redirecting you to the dashboard...</p>
          <Link href="/dashboard" className="auth-btn auth-btn-primary">Go to dashboard <ArrowRightIcon /></Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Check your inbox" headlineHighlight="inbox">
      <div className="auth-form-header" style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: "12px", background: "var(--accent-bg, rgba(0,229,160,0.1))", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <MailIcon size={24} />
        </div>
        <h1>Verify email</h1>
        {email && <p style={{ color: "var(--nav-active-text)", fontSize: "14px", marginBottom: "8px", fontWeight: 600 }}>{email}</p>}
        <p style={{ fontSize: "14px", color: "var(--text2)" }}>We&apos;ve sent a verification link and a 6-digit code to your email. You can use either to verify your account.</p>
      </div>

      {error && (
        <div className={`auth-alert ${error.includes("resent") ? "auth-alert-success" : "auth-alert-error"}`} style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text3)", fontWeight: 700 }}>Option 1: Enter Code</span>
        </div>
        <div className="otp-row" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              className="otp-input"
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              placeholder="-"
              style={{ width: 44, height: 52, textAlign: "center", fontSize: "20px", fontWeight: 700, borderRadius: 10, border: "1px solid var(--border)", background: "var(--glass)", color: "var(--text)" }}
            />
          ))}
        </div>
        
        <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} style={{ marginBottom: 24 }}>
          {loading ? "Verifying..." : "Verify with code"}
        </button>

        <div className="auth-divider" style={{ marginBottom: 24 }}>
          <div className="auth-divider-line" />
          <span className="auth-divider-text">OR</span>
          <div className="auth-divider-line" />
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--text2)", marginBottom: 16 }}>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>Option 2:</span> Simply click the <span style={{ color: "var(--accent)" }}>&ldquo;Confirm your email&rdquo;</span> link in the message we sent you.
          </p>
          <button type="button" onClick={handleResend} style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600, textDecoration: "underline", display: "flex", alignItems: "center", gap: 6, margin: "0 auto", padding: "8px 12px", borderRadius: "8px", background: "var(--glass-hover)", border: "none" }} disabled={loading}>
            <MailIcon size={14} /> Didn&apos;t get the email? Resend it
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
