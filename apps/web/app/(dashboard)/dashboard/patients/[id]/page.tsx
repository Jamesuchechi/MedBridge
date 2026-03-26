"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import * as Ic from "lucide-react";
import AnalysisResults, { AnalysisResponse, Differential } from "@/components/copilot/AnalysisResults";
import SoapNoteEditor from "@/components/copilot/SoapNoteEditor";
import Link from "next/link";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vitals {
  [key: string]: string | number;
}

interface ClinicalCase {
  id: string;
  patientName: string;
  name?: string; // Fallback from API
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  vitals: Vitals;
  analysis: {
    summary: string;
    differentials: Differential[];
    investigations: string[];
  };
  soapNote: string;
  createdAt: string;
  isShared?: boolean;
}

interface PatientDetail extends ClinicalCase {
  email: string;
  phone: string;
  healthProfile?: {
    dob: string;
    gender: string;
    bloodGroup?: string;
    genotype?: string;
  };
  clinicLink: {
    status: string;
    createdAt: string;
  };
  consent?: { status: string; expiresAt?: string };
}

interface Encounter {
  id: string;
  chiefComplaint: string;
  status: 'draft' | 'signed';
  createdAt: string;
}

interface LabOrder {
  id: string;
  testNames: string;
  status: string;
  orderedAt: string;
  attachmentUrl?: string;
}

interface Prescription {
  id: string;
  notes?: string;
  status: string;
  createdAt: string;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [data, setData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"details" | "note" | "history">("details");
  const [savingNote, setSavingNote] = useState(false);

  // Clinic Related States
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const isClinic = user?.role === "CLINIC_ADMIN";

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setLoading(true);

      const headers = {
        "x-user-id": user.id,
        "x-user-role": user.role
      };

      try {
        const pRes = await fetch(`${API_URL}/api/v1/patients/${id}`, { headers });
        if (pRes.ok) {
          const pData = await pRes.json();
          setData(pData);
        }

        if (isClinic) {
          const [eRes, prRes, lRes] = await Promise.all([
            fetch(`${API_URL}/api/v1/encounters/patient/${id}`, { headers }),
            fetch(`${API_URL}/api/v1/prescriptions/patient/${id}`, { headers }),
            fetch(`${API_URL}/api/v1/lab-orders/patient/${id}`, { headers })
          ]);
          if (eRes.ok) setEncounters(await eRes.json());
          if (prRes.ok) setPrescriptions(await prRes.json());
          if (lRes.ok) setLabs(await lRes.json());
          setView("history");
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, user, isClinic, API_URL]);

  const handleSaveNote = async (editedNote: string) => {
    if (!data || !user) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/copilot/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": "CLINICIAN"
        },
        body: JSON.stringify({
          ...data,
          soapNote: editedNote,
        })
      });
      if (res.ok) {
        setData({ ...data, soapNote: editedNote });
        setView("details");
      }
    } catch (err) {
      console.error("Save note failed:", err);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
      <p className="text-muted-foreground animate-pulse">Loading clinical record...</p>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <Ic.AlertCircle size={48} className="text-danger" />
      <h2 className="text-2xl font-bold font-syne">Clinical Case Not Found</h2>
      <Link href="/dashboard/patients" className="bg-glass border border-white/10 px-6 py-2 rounded-xl">Back to Patients</Link>
    </div>
  );

  const analysis: AnalysisResponse = {
    summary: data.analysis?.summary || "",
    differentials: data.analysis?.differentials || [],
    investigations: data.analysis?.investigations || [],
    soapNote: data.soapNote || "",
  };

  const patientName = data.patientName || data.name || "Unknown Patient";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-6">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <Ic.ChevronLeft size={16} /> Back to Patients
        </Link>
        
        <div className="bg-card-bg border border-card-border p-6 rounded-3xl flex flex-wrap items-center gap-6 relative overflow-hidden backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-2xl font-black text-black shadow-2xl">
            {patientName[0]}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black font-syne tracking-tight group-hover:text-accent transition-colors">{patientName}</h1>
              {data.isShared && <span className="px-2 py-0.5 bg-accent2/10 text-accent2 border border-accent2/20 text-[10px] font-bold rounded-full flex items-center gap-1 uppercase tracking-wider"><Ic.Shield size={10} /> Shared Access</span>}
            </div>
            <p className="text-slate-400 font-medium">
              {data.patientAge || data.healthProfile?.dob} yrs • {data.patientSex || data.healthProfile?.gender} • Case #{data.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-muted-foreground flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-card-border">
              <Ic.Calendar size={14} className="text-accent"/> {new Date(data.createdAt).toLocaleDateString()}
            </div>
            {isClinic && (
              <Link href={`/dashboard/patients/${id}/encounter/new`} className="bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-accent/10">
                <Ic.Plus size={14} /> New Encounter
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Info (for Clinic View) */}
        {isClinic && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card-bg border border-card-border rounded-3xl p-6 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-accent opacity-60">Patient Contact</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium"><Ic.Mail size={16} className="text-muted-foreground"/> {data.email}</div>
                <div className="flex items-center gap-3 text-sm font-medium"><Ic.Phone size={16} className="text-muted-foreground"/> {data.phone || "N/A"}</div>
              </div>
              <div className="pt-6 border-t border-card-border grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-card-border">
                  <div className="text-[10px] text-muted-foreground uppercase mb-1 font-bold">Blood Group</div>
                  <div className="font-bold text-accent">{data.healthProfile?.bloodGroup || "O+"}</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-card-border">
                  <div className="text-[10px] text-muted-foreground uppercase mb-1 font-bold">Genotype</div>
                  <div className="font-bold text-accent">{data.healthProfile?.genotype || "AA"}</div>
                </div>
              </div>
            </div>
            
            <Link href={`/dashboard/patients/${id}/billing`} className="block bg-card-bg border border-card-border hover:border-amber-500/30 p-6 rounded-3xl transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Ic.CreditCard size={24} />
                </div>
                <div>
                  <div className="text-lg font-bold">Billing Records</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Patient Financials</div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Main Content Area */}
        <div className={isClinic ? "lg:col-span-8 space-y-6" : "lg:col-span-12 space-y-6"}>
          {isClinic ? (
            <div className="space-y-6">
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card-bg border border-card-border p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><Ic.Activity size={20} /></div>
                    <div><div className="text-xl font-black">{encounters.length}</div><div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Encounters</div></div>
                  </div>
                  <div className="bg-card-bg border border-card-border p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent2/10 rounded-xl flex items-center justify-center text-accent2"><Ic.FlaskConical size={20} /></div>
                    <div><div className="text-xl font-black">{labs.length}</div><div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Lab Orders</div></div>
                  </div>
                  <div className="bg-card-bg border border-card-border p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500"><Ic.ClipboardList size={20} /></div>
                    <div><div className="text-xl font-black">{prescriptions.length}</div><div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Prescriptions</div></div>
                  </div>
               </div>

               <div className="bg-card-bg border border-card-border rounded-3xl p-6">
                  <h2 className="text-xl font-black font-syne mb-6">Encounter History</h2>
                  <div className="space-y-3">
                    {encounters.length === 0 && <div className="p-12 text-center border border-dashed border-card-border rounded-2xl text-muted-foreground text-sm">No encounters recorded yet.</div>}
                    {encounters.map(enc => (
                      <div key={enc.id} className="bg-slate-950/50 border border-card-border p-4 rounded-2xl flex justify-between items-center group hover:bg-white/5 transition-all cursor-pointer">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-accent group-hover:bg-accent/10 transition-all"><Ic.Stethoscope size={20} /></div>
                          <div>
                            <div className="font-bold text-slate-100">{enc.chiefComplaint}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest"><span className={enc.status === 'signed' ? 'text-accent' : 'text-warn'}>{enc.status}</span></div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground font-medium">{format(new Date(enc.createdAt), "MMM d, yyyy")}</div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
               {view === "details" ? (
                 <>
                   <div className="bg-card-bg border border-card-border p-8 rounded-3xl space-y-4">
                     <h3 className="text-[10px] font-black uppercase text-accent2 tracking-widest">Chief Complaint</h3>
                     <p className="text-2xl font-bold font-syne text-white leading-relaxed">{data.chiefComplaint}</p>
                   </div>

                   {Object.keys(data.vitals || {}).length > 0 && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {Object.entries(data.vitals).map(([k, v]) => (
                         <div key={k} className="bg-card-bg border border-card-border p-5 rounded-2xl">
                           <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                           <div className="text-2xl font-black font-syne text-accent">{v}</div>
                         </div>
                       ))}
                     </div>
                   )}

                   <div className="bg-card-bg border border-card-border rounded-3xl overflow-hidden backdrop-blur-3xl shadow-2xl">
                     <AnalysisResults 
                        analysis={analysis} 
                        onEditNote={() => setView("note")} 
                        onRestart={() => window.location.assign("/dashboard/copilot")}
                        onRefer={() => {}} 
                        loadingNote={false}
                     />
                   </div>
                 </>
               ) : (
                 <div className="bg-card-bg border border-card-border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl">
                    <SoapNoteEditor 
                       note={data.soapNote} 
                       onBack={() => setView("details")} 
                       onSave={handleSaveNote}
                       isSaving={savingNote}
                    />
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
