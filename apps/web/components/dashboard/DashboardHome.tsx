"use client";

import React from "react";

interface User {
  name: string;
  email: string;
  role: string;
  initials: string;
  profileComplete: number;
}

const Ic = {
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Pill: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent)" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="health-ring-score">{score}</span>
        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>/ 100</span>
      </div>
    </div>
  );
}

export function DashboardHome({ user }: { user: User }) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = user.name.split(" ")[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
            {part}, <span style={{ color: 'var(--accent)' }}>{first}</span>
          </h2>
          <p style={{ color: 'var(--text2)' }}>Welcome to your health dashboard.</p>
        </div>

        {user.profileComplete < 100 && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(0,229,160,0.1), rgba(61,155,255,0.1))',
            border: '1px solid var(--accent)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '400px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Complete your Health Profile</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Your profile is {user.profileComplete}% complete. Finish it to unlock AI insights.</div>
            </div>
            <a href="/dashboard/profile" style={{ 
              background: 'var(--accent)', 
              color: '#000', 
              padding: '8px 16px', 
              borderRadius: '10px', 
              fontSize: '13px', 
              fontWeight: 700 
            }}>Finish Setup</a>
          </div>
        )}
      </div>
      
      <div className="stats-grid">
        {[
          { label: "Symptom Checks", value: "12", icon: Ic.Activity },
          { label: "Medications", value: "3", icon: Ic.Pill },
          { label: "Lab Reports", value: "5", icon: Ic.FileText },
          { label: "Health Score", value: "74", icon: Ic.Shield }
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--accent)' }}>
              <stat.icon />
              <span style={{ fontSize: '11px' }}>+2.4%</span>
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="stat-card">
          <h3 style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '20px' }}>Health Profile Status</h3>
          <HealthRing score={user.profileComplete} />
          <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text2)', fontSize: '14px' }}>
            {user.profileComplete === 100 ? "Profile Complete" : "Profile Incomplete"}
          </div>
        </div>
        <div className="stat-card">
          <h3 style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '20px' }}>Recent AI Insights</h3>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.1)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>
              {user.profileComplete < 60 
                ? "Complete your profile to receive personalized health insights based on your genotype and history."
                : "Rainy season in your region — malaria risk is elevated. Consider prophylaxis if travelling to rural areas."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
