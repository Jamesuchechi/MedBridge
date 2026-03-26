"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";



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

const EmployerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

type Role = "PATIENT" | "CLINICIAN" | "CLINIC_ADMIN" | "EMPLOYER";

const ROLES: { key: Role; label: string; Icon: React.ElementType; desc: string; href: string; color: string }[] = [
  { key: "PATIENT", label: "Patient", Icon: PatientIcon, desc: "Check symptoms and analyze docs", href: "/signup/patient", color: "var(--accent)" },
  { key: "CLINICIAN", label: "Doctor", Icon: DoctorIcon, desc: "AI copilot and clinical tools", href: "/signup/doctor", color: "var(--accent2)" },
  { key: "CLINIC_ADMIN", label: "Clinic", Icon: ClinicIcon, desc: "EMR and appointment management", href: "/signup/clinic", color: "var(--accent3)" },
  { key: "EMPLOYER", label: "Employer", Icon: EmployerIcon, desc: "Health Pulse and employee wellness", href: "/signup/employer", color: "var(--accent2)" },
];

export default function SignupPage() {
  return (
    <AuthLayout
      headline="Join thousands already using MedBridge"
      headlineHighlight="MedBridge"
      subtext="Smart symptom checking and document analysis built for Nigeria."
    >
      <div className="auth-form-header">
        <div className="auth-form-eyebrow">
          <div className="auth-form-eyebrow-dot" />
          Get Started
        </div>
        <h1>Create your<br />account</h1>
        <p>Select your role to continue.</p>
      </div>

      <div className="role-grid" style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ROLES.map(({ key, label, Icon, desc, href, color }) => (
          <Link
            key={key}
            href={href}
            className="role-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              padding: '24px 16px',
              height: 'auto',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <div className="role-card-icon" style={{ marginBottom: 12, color: color }}><Icon /></div>
            <span className="role-card-label" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{label}</span>
            <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{desc}</p>
          </Link>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text2)" }}>
        Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}
