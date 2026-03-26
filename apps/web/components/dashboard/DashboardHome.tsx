import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  profileComplete: number;
}

interface Stat {
  label: string;
  value: string | number;
  icon: React.ComponentType;
}

interface PatientActivity {
  patientName: string;
  chiefComplaint: string;
  createdAt: string;
}

const Ic = {
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Pill: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

function HealthRing({ score }: { score: number }) {
  const r = 48, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent)" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800 }}>{score}</span>
        <span style={{ fontSize: '10px', color: 'var(--text3, rgba(240,244,255,0.3))' }}>/ 100</span>
      </div>
    </div>
  );
}

const STAT_CARD_STYLE: React.CSSProperties = {
  background: 'var(--card-bg, rgba(255,255,255,0.04))',
  border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
  borderRadius: '18px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const STAT_VALUE_STYLE: React.CSSProperties = {
  fontFamily: 'Syne, sans-serif', 
  fontSize: '28px', 
  fontWeight: 800,
  color: 'var(--text, #f0f4ff)',
};

const STAT_LABEL_STYLE: React.CSSProperties = {
  fontSize: '12px', 
  color: 'var(--text3, rgba(240,244,255,0.3))'
};

const ACTION_BTN_STYLE: React.CSSProperties = {
  padding: '16px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text)',
  textAlign: 'left',
  transition: 'all 0.2s',
};

const PATIENT_STATS = [
  { label: "Symptom Checks", value: "12", icon: Ic.Activity },
  { label: "Medications",    value: "3",  icon: Ic.Pill },
  { label: "Lab Reports",    value: "5",  icon: Ic.FileText },
  { label: "Health Score",   value: "74", icon: Ic.Shield },
];

export function DashboardHome({ user }: { user: User }) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = user.name.split(" ")[0];
  const isDoctor = ["doctor", "CLINICIAN"].includes(user.role);
  const isClinic = ["clinic", "CLINIC_ADMIN"].includes(user.role);
  const isEmployer = ["employer", "EMPLOYER"].includes(user.role);

  const [stats, setStats] = useState<Stat[]>(PATIENT_STATS);
  const [recentPatients, setRecentPatients] = useState<PatientActivity[]>([]);
  const [clinic, setClinic] = useState<{ name: string; verificationStatus: string } | null>(null);
  const [employer, setEmployer] = useState<{ name: string; verificationStatus: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDoctor && user.id) {
      const fetchData = async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          const headers = { 
            "x-user-id": user.id,
            "x-user-role": user.role
          };

          // Fetch Stats
          const sRes = await fetch(`${API_URL}/api/v1/doctors/stats`, { headers });
          if (sRes.ok) {
            const data = await sRes.json();
            setStats([
              { label: "Total Consults", value: data.totalConsultations, icon: Ic.Activity },
              { label: "Pending Reviews",  value: data.pendingReviews,  icon: Ic.FileText },
              { label: "Active Cases",     value: data.activeCases,     icon: Ic.Shield },
              { label: "Referrals Sent",   value: data.referralsSent,   icon: Ic.Activity },
            ]);
          }

          // Fetch Patients
          const pRes = await fetch(`${API_URL}/api/v1/patients`, { headers });
          if (pRes.ok) {
            const pData = await pRes.json();
            setRecentPatients(pData.slice(0, 3));
          }
        } catch (err) {
          console.error("Dashboard fetch error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else if (isClinic && user.id) {
      setLoading(true);
      api.get<{ name: string; verificationStatus: string }>("/api/v1/clinics/me", {
        headers: {
          "x-user-id": user.id,
          "x-user-role": user.role,
        }
      })
      .then(setClinic)
      .catch(() => setClinic(null))
      .finally(() => setLoading(false));
    } else if (isEmployer && user.id) {
       setLoading(true);
       api.get<{ name: string; verificationStatus: string; id: string }>("/api/v1/employer/me", {
         headers: {
           "x-user-id": user.id,
           "x-user-role": user.role,
         }
       })
       .then(res => {
         setEmployer(res);
         setStats([
            { label: "Enrolled Employees", value: "--", icon: Ic.Activity },
            { label: "Pulse Alerts", value: "0", icon: Ic.Shield },
            { label: "Recent Activity", value: "--", icon: Ic.Activity },
            { label: "Subscription", value: "BASIC", icon: Ic.Pill },
         ]);
       })
       .catch(() => setEmployer(null))
       .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isDoctor, isClinic, isEmployer, user.id, user.role]);

  if (loading) return <div className="p-20 text-center animate-pulse text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Header row ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '20px', marginBottom: '32px'
      }}>
        <div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 800, marginBottom: '8px'
          }}>
            {part},{" "}
            <span style={{ color: isDoctor ? 'var(--accent2, #3d9bff)' : isClinic ? 'var(--accent3, #c77dff)' : 'var(--accent, #00e5a0)' }}>
              {isClinic ? (clinic?.name || first) : first}
            </span>
          </h2>
          <p style={{ color: 'var(--text2, rgba(240,244,255,0.55))' }}>
            {isDoctor ? "Welcome to your clinical workspace." : isClinic ? "Manage your staff, appointments, and EMR from here." : isEmployer ? "Monitor your team's health trends and wellness." : "Welcome to your health dashboard."}
          </p>
        </div>

        {isEmployer && !employer && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(61,155,255,0.08), rgba(199,125,255,0.08))',
            border: '1px solid var(--accent2, #3d9bff)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '400px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                Complete Employer Setup
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2, rgba(240,244,255,0.55))' }}>
                Register your company and invite employees to start tracking health trends.
              </div>
            </div>
            <a
              href="/dashboard/employer/onboarding"
              style={{
                background: 'var(--accent2, #3d9bff)', color: '#fff',
                padding: '8px 16px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Get Started
            </a>
          </div>
        )}

        {isEmployer && employer?.verificationStatus === "pending" && (
           <div style={{
            background: 'rgba(255, 184, 0, 0.1)',
            border: '1px solid var(--warn, #ffb800)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '450px'
          }}>
             <div style={{ 
               width: 40, height: 40, borderRadius: '50%', background: 'rgba(255, 184, 0, 0.2)', 
               display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)',
               flexShrink: 0
             }}>⏳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: 'var(--warn)' }}>
                Employer Review Pending
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2, rgba(240,244,255,0.55))' }}>
                Your company registration is under review. You'll be notified via email once approved.
              </div>
            </div>
          </div>
        )}

        {isClinic && clinic?.verificationStatus !== "approved" && (
          <div style={{
            background: 'rgba(255, 184, 0, 0.1)',
            border: '1px solid var(--warn, #ffb800)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '450px'
          }}>
             <div style={{ 
               width: 40, height: 40, borderRadius: '50%', background: 'rgba(255, 184, 0, 0.2)', 
               display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)',
               flexShrink: 0
             }}>⏳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: 'var(--warn)' }}>
                Verification {clinic?.verificationStatus === "pending" ? "Pending" : "Required"}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2, rgba(240,244,255,0.55))' }}>
                {clinic?.verificationStatus === "pending" 
                  ? "Your clinic application is currently being reviewed. Most reviews are completed within 48 hours."
                  : "Your clinic registration is incomplete or was rejected. Please check your settings."}
              </div>
            </div>
          </div>
        )}

        {!isDoctor && !isClinic && user.profileComplete < 100 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,160,0.08), rgba(61,155,255,0.08))',
            border: '1px solid var(--accent, #00e5a0)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '400px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                Complete your Health Profile
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2, rgba(240,244,255,0.55))' }}>
                Your profile is {user.profileComplete}% complete. Finish it to unlock AI insights.
              </div>
            </div>
            <a
              href="/dashboard/profile"
              style={{
                background: 'var(--accent, #00e5a0)', color: '#000',
                padding: '8px 16px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Finish Setup
            </a>
          </div>
        )}

        {isDoctor && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(61,155,255,0.08), rgba(199,125,255,0.08))',
            border: '1px solid var(--accent2, #3d9bff)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '400px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                Doctor Copilot is Active
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2, rgba(240,244,255,0.55))' }}>
                Ready to assist with differentials and clinical notes.
              </div>
            </div>
            <a
              href="/dashboard/copilot"
              style={{
                background: 'var(--accent2, #3d9bff)', color: '#fff',
                padding: '8px 16px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Start Analysis
            </a>
          </div>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {isClinic ? (
          <>
            <div style={STAT_CARD_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent3)' }}>
                <div style={{ width: 32, height: 32 }}><Ic.Shield /></div>
              </div>
              <div style={STAT_VALUE_STYLE}>--</div>
              <div style={STAT_LABEL_STYLE}>Total Staff</div>
            </div>
            <div style={STAT_CARD_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent)' }}>
                <div style={{ width: 32, height: 32 }}><Ic.Activity /></div>
              </div>
              <div style={STAT_VALUE_STYLE}>--</div>
              <div style={STAT_LABEL_STYLE}>Active Patients</div>
            </div>
            <div style={{ ...STAT_CARD_STYLE, gridColumn: 'span 2' }}>
               <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, marginBottom: '16px', opacity: 0.6, textTransform: 'uppercase' }}>Quick Actions</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <a href="/dashboard/settings/staff" style={ACTION_BTN_STYLE}>
                    <div style={{ fontWeight: 700 }}>Invite Staff</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Add doctors, nurses, etc.</div>
                  </a>
                  <button style={{ ...ACTION_BTN_STYLE, opacity: 0.5, cursor: 'not-allowed' }} disabled>
                    <div style={{ fontWeight: 700 }}>Clinic Profile</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Edit details (soon)</div>
                  </button>
               </div>
            </div>
          </>
        ) : stats.map(stat => (
          <div
            key={stat.label}
            style={STAT_CARD_STYLE}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              color: isDoctor ? 'var(--accent2, #3d9bff)' : 'var(--accent, #00e5a0)',
            }}>
              <div style={{ width: 32, height: 32, flexShrink: 0 }}>
                <stat.icon />
              </div>
              <span style={{ fontSize: '11px', color: isDoctor ? 'var(--accent2, #3d9bff)' : 'var(--accent, #00e5a0)', opacity: 0.7 }}>
                {isDoctor ? "Today" : "+2.4%"}
              </span>
            </div>

            <div style={STAT_VALUE_STYLE}>
              {stat.value}
            </div>

            <div style={STAT_LABEL_STYLE}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom row ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {/* Left Card */}
        <div style={{
          background: 'var(--card-bg, rgba(255,255,255,0.04))',
          border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
          borderRadius: '18px', padding: '20px',
        }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
            {isDoctor ? "Recent Patient Activity" : "Health Profile Status"}
          </h3>
          {isDoctor ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentPatients.length > 0 ? (
                recentPatients.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{p.patientName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{p.chiefComplaint} · {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)' }}>
                  No recent patient activity.
                </div>
              )}
            </div>
          ) : (
            <>
              <HealthRing score={user.profileComplete} />
              <div style={{
                textAlign: 'center', marginTop: '16px',
                color: 'var(--text2, rgba(240,244,255,0.55))', fontSize: '14px',
              }}>
                {user.profileComplete === 100 ? "Profile Complete ✓" : "Profile Incomplete"}
              </div>
            </>
          )}
        </div>

        {/* Right Card */}
        <div style={{
          background: 'var(--card-bg, rgba(255,255,255,0.04))',
          border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
          borderRadius: '18px', padding: '20px',
        }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
            {isDoctor ? "Clinical Alerts" : "Recent AI Insights"}
          </h3>
          <div style={{
            padding: '16px', borderRadius: '12px',
            background: isDoctor ? 'rgba(61,155,255,0.05)' : 'rgba(0,229,160,0.05)',
            border: isDoctor ? '1px solid rgba(61,155,255,0.1)' : '1px solid rgba(0,229,160,0.1)',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text2, rgba(240,244,255,0.55))', lineHeight: 1.6 }}>
              {isDoctor 
                ? "Lassa Fever outbreak reported in Ondo state. Ensure standard precautions and high index of suspicion."
                : user.profileComplete < 60
                  ? "Complete your profile to receive personalized health insights based on your genotype and history."
                  : "Rainy season in your region — malaria risk is elevated. Consider prophylaxis if travelling to rural areas."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}