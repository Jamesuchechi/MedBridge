"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (Simplified to match main page)
// ─────────────────────────────────────────────────────────────────────────────
type Urgency = "low" | "moderate" | "high" | "emergency";

interface SymptomCheck {
  id: string;
  symptoms: string[];
  duration: string;
  durationUnit: string;
  severity: number;
  hasFever: boolean;
  location: string;
  createdAt: string;
  result: {
    urgency: Urgency;
    urgencyScore: number;
    conditions: { name: string; probability: number; description: string; afridxAdjusted: boolean }[];
    nextSteps: string[];
    afridxInsight: string;
    disclaimer: string;
  };
}

// ── Icons (Subset from main page) ──
const Ic = {
  ChevronLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Activity: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Thermometer: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  AlertCircle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

export default function SymptomCheckDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [check, setCheck] = useState<SymptomCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCheck = useCallback(async () => {
    if (!user || !id) return;
    try {
      const data = await api.get<SymptomCheck>(`/api/v1/symptoms/${id}`, {
        headers: { "x-user-id": user.id }
      });
      setCheck(data);
    } catch (err) {
      console.error("Failed to fetch check", err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchCheck();
  }, [fetchCheck]);

  if (loading) return <div className="p-8 text-center text-white/40">Loading analysis...</div>;
  if (!check) return <div className="p-8 text-center text-red-400">Analysis not found.</div>;

  const urgencyColor = (u: Urgency) => ({
    low: "#00e5a0", moderate: "#ffb800", high: "#ff7c2b", emergency: "#ff3b3b"
  }[u]);

  return (
    <div className="max-w-[800px] mx-auto p-7">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-[#00e5a0] transition-colors mb-6"
      >
        <Ic.ChevronLeft /> Back to symptoms
      </button>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-[#00e5a0] mb-2 opacity-80">
          <div className="w-1 h-1 rounded-full bg-[#00e5a0]" />
          Past Analysis Results
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Case Summary 
          <span className="block text-sm font-normal text-white/50 mt-1">
            Generated on {new Date(check.createdAt).toLocaleString("en-NG")}
          </span>
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {check.symptoms.map(s => (
          <span key={s} className="px-3 py-1 bg-[#00e5a0]/10 border border-[#00e5a0]/25 text-[#00e5a0] text-xs font-bold rounded-lg">{s}</span>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-xs font-mono text-white/50">
          <Ic.Clock /> {check.duration} {check.durationUnit}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-xs font-mono text-white/50">
          <Ic.Activity /> Severity {check.severity}/10
        </div>
        {check.hasFever && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-400/10 border border-red-400/20 rounded-lg text-xs font-mono text-red-300">
            <Ic.Thermometer /> Fever reported
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl border-2 mb-4" style={{ 
        borderColor: `${urgencyColor(check.result.urgency)}40`, 
        background: `${urgencyColor(check.result.urgency)}10` 
      }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${urgencyColor(check.result.urgency)}20`, color: urgencyColor(check.result.urgency) }}>
            <Ic.AlertCircle />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1" style={{ color: urgencyColor(check.result.urgency) }}>
              {check.result.urgency.toUpperCase()} URGENCY
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Based on the reported symptoms, clinical patterns, and regional prevalence data.
            </p>
          </div>
          <div className="text-2xl font-black font-syne" style={{ color: urgencyColor(check.result.urgency) }}>
            {check.result.urgencyScore}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
        <h3 className="text-xs font-mono tracking-widest text-[#00e5a0] uppercase mb-4">Detected Differentials</h3>
        <div className="grid gap-3">
          {check.result.conditions.map(c => (
            <div key={c.name} className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">{c.name}</span>
                {c.afridxAdjusted && <span className="text-[9px] font-bold px-2 py-0.5 bg-[#00e5a0]/10 border border-[#00e5a0]/20 text-[#00e5a0] rounded-full">AfriDx</span>}
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-3">{c.description}</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00e5a0]" style={{ width: `${c.probability}%` }} />
                </div>
                <span className="text-xs font-bold text-[#00e5a0] min-w-[30px]">{c.probability}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#00e5a0]/5 border border-[#00e5a0]/15 rounded-2xl p-5 flex gap-4">
        <div className="w-9 h-9 bg-[#00e5a0]/10 border border-[#00e5a0]/20 flex items-center justify-center shrink-0 rounded-lg text-[#00e5a0]">
          <Ic.AlertCircle />
        </div>
        <div>
          <div className="text-[10px] font-mono font-bold text-[#00e5a0] uppercase tracking-widest mb-1">AfriDx Insight</div>
          <p className="text-xs text-white/60 leading-relaxed">{check.result.afridxInsight}</p>
        </div>
      </div>
    </div>
  );
}
