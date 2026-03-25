"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  FileText, 
  Activity, 
  ClipboardList, 
  FlaskConical,
  CheckCircle2,
  Stethoscope,
  Info
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface MedicationItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Patient {
  id: string;
  name: string;
}

export default function NewEncounterPage() {
  const { id: patientId } = useParams();
  const router = useRouter();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Encounter Body
  const [encounter, setEncounter] = useState({
    chiefComplaint: "",
    historyOfPresentIllness: "",
    examinationFindings: "",
    diagnosis: "",
    icd11Codes: "",
    plan: "",
    soapNote: ""
  });

  // Prescriptions
  const [meds, setMeds] = useState<MedicationItem[]>([]);
  
  // Labs
  const [labs, setLabs] = useState<string>("");

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/v1/patients/${patientId}`);
        const data = await res.json();
        setPatient(data);
      } catch (err) {
        console.error("Failed to fetch patient:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (patientId) fetchPatient();
  }, [patientId]);

  const addMed = () => {
    setMeds([...meds, { drugName: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const removeMed = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const updateMed = (index: number, field: keyof MedicationItem, value: string) => {
    const newMeds = [...meds];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMeds(newMeds);
  };

  const handleSubmit = async (signNow: boolean = false) => {
    if (!encounter.chiefComplaint) {
       alert("Chief Complaint is required.");
       return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Encounter
      const encRes = await fetch("/api/v1/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...encounter, patientId })
      });
      const encData = await encRes.json();
      
      if (!encRes.ok) throw new Error(encData.error || "Failed to save encounter");

      const encounterId = encData.id;

      // 2. Create Prescription
      if (meds.length > 0) {
        await fetch("/api/v1/prescriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            encounterId,
            items: meds
          })
        });
      }

      // 3. Create Lab Order
      if (labs.trim()) {
        await fetch("/api/v1/lab-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            encounterId,
            testNames: labs
          })
        });
      }

      // 4. Sign if requested
      if (signNow) {
        await fetch(`/api/v1/encounters/${encounterId}/sign`, { method: "PATCH" });
      }

      router.push(`/dashboard/patients/${patientId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-20 text-center text-slate-400">Loading clinical workspace...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link 
            href={`/dashboard/patients/${patientId}`}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2 text-sm group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Patient Profile
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
               {patient?.name?.charAt(0)}
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white">Clinical Encounter</h1>
               <p className="text-slate-400 text-sm">Patient: <span className="text-slate-200 font-semibold">{patient?.name}</span> • {format(new Date(), "PPp")}</p>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Save Draft
          </button>
          <button 
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            Sign & Finish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Encounter Form */}
        <div className="lg:col-span-2 space-y-6">
          
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
               <Stethoscope className="w-5 h-5 text-blue-500" />
               <h2 className="text-lg font-bold text-white">Subjective & Objective</h2>
            </div>
            
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    Chief Complaint <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    value={encounter.chiefComplaint}
                    onChange={(e) => setEncounter({...encounter, chiefComplaint: e.target.value})}
                    placeholder="e.g. Sharp pain in lower abdomen, Fever for 3 days"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
               </div>
               
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">History of Present Illness</label>
                  <textarea 
                    rows={4}
                    value={encounter.historyOfPresentIllness}
                    onChange={(e) => setEncounter({...encounter, historyOfPresentIllness: e.target.value})}
                    placeholder="Describe the duration, severity, and context of the complaint..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Examination Findings</label>
                  <textarea 
                    rows={4}
                    value={encounter.examinationFindings}
                    onChange={(e) => setEncounter({...encounter, examinationFindings: e.target.value})}
                    placeholder="Temperature, Blood Pressure, Physical examination results..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                  />
               </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
               <Activity className="w-5 h-5 text-emerald-500" />
               <h2 className="text-lg font-bold text-white">Assessment & Diagnosis</h2>
            </div>
            
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnosis / Impression</label>
                  <input 
                    type="text"
                    value={encounter.diagnosis}
                    onChange={(e) => setEncounter({...encounter, diagnosis: e.target.value})}
                    placeholder="e.g. Acute Appendicitis, Uncomplicated Malaria"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
               </div>
               
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    ICD-11 Codes
                    <Info className="w-3 h-3 text-slate-600" />
                  </label>
                  <input 
                    type="text"
                    value={encounter.icd11Codes}
                    onChange={(e) => setEncounter({...encounter, icd11Codes: e.target.value})}
                    placeholder="Internal lookup pending... Enter codes manually for now."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
               </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
               <FileText className="w-5 h-5 text-purple-500" />
               <h2 className="text-lg font-bold text-white">Plan & Workflow</h2>
            </div>
            
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Management Plan</label>
                  <textarea 
                    rows={6}
                    value={encounter.plan}
                    onChange={(e) => setEncounter({...encounter, plan: e.target.value})}
                    placeholder="Next steps, counseling, return instructions..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                  />
               </div>
            </div>
          </section>
        </div>

        {/* Sidebar: Prescriptions & Labs */}
        <div className="space-y-6">
          
          {/* Prescription Pad */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <ClipboardList className="w-5 h-5 text-amber-500" />
                   <h2 className="font-bold text-white">Prescription Pad</h2>
                </div>
                <button 
                  onClick={addMed}
                  className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center hover:bg-blue-600/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>
             
             <div className="space-y-3">
                {meds.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-500">No medications added to this plan.</p>
                  </div>
                )}
                
                {meds.map((med, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative group">
                    <button 
                      onClick={() => removeMed(idx)}
                      className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <input 
                      type="text"
                      placeholder="Drug Name"
                      value={med.drugName}
                      onChange={(e) => updateMed(idx, "drugName", e.target.value)}
                      className="w-full bg-transparent border-b border-slate-800 pb-1 text-sm font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                       <input 
                         placeholder="Dosage"
                         value={med.dosage}
                         onChange={(e) => updateMed(idx, "dosage", e.target.value)}
                         className="bg-slate-900 text-xs p-2 rounded-lg border border-slate-800 text-slate-300 outline-none"
                       />
                       <input 
                         placeholder="Frequency"
                         value={med.frequency}
                         onChange={(e) => updateMed(idx, "frequency", e.target.value)}
                         className="bg-slate-900 text-xs p-2 rounded-lg border border-slate-800 text-slate-300 outline-none"
                       />
                    </div>
                    <input 
                      placeholder="Duration (e.g. 7 days)"
                      value={med.duration}
                      onChange={(e) => updateMed(idx, "duration", e.target.value)}
                      className="w-full bg-slate-900 text-xs p-2 rounded-lg border border-slate-800 text-slate-300 outline-none"
                    />
                  </div>
                ))}
             </div>
          </section>

          {/* Lab Orders */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
             <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-white">Laboratory Orders</h2>
             </div>
             
             <textarea 
               rows={4}
               value={labs}
               onChange={(e) => setLabs(e.target.value)}
               placeholder="Enter required tests (e.g. MP, FBC, Urinalysis)..."
               className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
             />
             
             <p className="text-[10px] text-slate-500 flex items-center gap-1">
               <Info className="w-3 h-3" /> Separate multiple tests with commas.
             </p>
          </section>

          {/* AI Helper Card */}
          <section className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600/10 blur-2xl rounded-full" />
             
             <h3 className="font-bold text-blue-400 flex items-center gap-2 text-sm uppercase tracking-wider">
               Clinical Copilot
             </h3>
             <p className="text-xs text-slate-400 leading-relaxed">
               I can help you convert these notes into a structured SOAP note for the patient profile.
             </p>
             <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
               Generate SOAP Summary
             </button>
          </section>

        </div>
      </div>
    </div>
  );
}
