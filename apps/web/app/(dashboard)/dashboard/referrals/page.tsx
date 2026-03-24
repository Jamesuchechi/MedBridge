"use client";

import React from "react";
import { ReferralInbox } from "@/components/dashboard/ReferralInbox";
import { useAuthStore } from "@/store/auth.store";

export default function ReferralsPage() {
  const { user } = useAuthStore();

  return (
    <div className="referrals-page-container">
      <header className="page-header">
        <div className="header-info">
          <h1 className="page-title">Referral Intelligence</h1>
          <p className="page-subtitle">Coordinate patient care with specialists and track clinical handovers in real-time.</p>
        </div>
      </header>

      <section className="inbox-section">
        <ReferralInbox userId={user?.id || ""} />
      </section>

      <style>{`
        .referrals-page-container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }
        .page-header { border-bottom: 1px solid var(--border); padding-bottom: 24px; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; color: var(--text); }
        .page-subtitle { color: var(--text2); font-size: 16px; max-width: 600px; }
        
        .inbox-section { background: var(--glass); border-radius: 20px; border: 1px solid var(--border); padding: 24px; }
      `}</style>
    </div>
  );
}
