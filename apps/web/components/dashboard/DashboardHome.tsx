import React, { useEffect, useState } from "react";

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

  const [stats, setStats] = useState<Stat[]>(PATIENT_STATS);
  const [recentPatients, setRecentPatients] = useState<PatientActivity[]>([]);

  useEffect(() => {
    if (isDoctor && user.id) {
      const fetchData = async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          const headers = { "x-user-id": user.id };

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
        }
      };
      fetchData();
    }
  }, [isDoctor, user.id]);

  return (
    <div>
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
            <span style={{ color: isDoctor ? 'var(--accent2, #3d9bff)' : 'var(--accent, #00e5a0)' }}>{first}</span>
          </h2>
          <p style={{ color: 'var(--text2, rgba(240,244,255,0.55))' }}>
            {isDoctor ? "Welcome to your clinical workspace." : "Welcome to your health dashboard."}
          </p>
        </div>

        {!isDoctor && user.profileComplete < 100 && (
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
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--card-bg, rgba(255,255,255,0.04))',
              border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
              borderRadius: '18px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
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

            <div style={{
              fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 800,
              color: 'var(--text, #f0f4ff)',
            }}>
              {stat.value}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text3, rgba(240,244,255,0.3))' }}>
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