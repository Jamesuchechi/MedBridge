"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Activity, 
  Clock,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  FlaskConical,
  Stethoscope,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface PatientDetail {
  id: string;
  name: string;
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
  consent?: {
    status: string;
    expiresAt?: string;
  };
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
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, eRes, prRes, lRes] = await Promise.all([
          fetch(`/api/v1/patients/${id}`),
          fetch(`/api/v1/encounters/patient/${id}`),
          fetch(`/api/v1/prescriptions/patient/${id}`),
          fetch(`/api/v1/lab-orders/patient/${id}`)
        ]);
        
        if (!pRes.ok) throw new Error("Patient not found");
        
        setPatient(await pRes.json());
        setEncounters(await eRes.json());
        setPrescriptions(await prRes.json());
        setLabs(await lRes.json());
      } catch (err) {
        console.error("Failed to fetch patient data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (isLoading) return (
    <div className="p-20 flex justify-center items-center h-[80vh]">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!patient) return (
    <div className="p-20 text-center">
      <h2 className="text-2xl font-bold text-slate-100">Patient not found</h2>
      <Link href="/dashboard/patients" className="text-blue-400 hover:underline mt-4 block">Return to Directory</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <Link 
          href="/dashboard/patients"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Patients
        </Link>
        
        <Link 
          href={`/dashboard/patients/${id}/encounter/new`}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Encounter
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-bold text-white shadow-2xl mb-4 border-4 border-slate-950">
                {patient.name.charAt(0)}
              </div>
              <h1 className="text-2xl font-bold text-slate-100">{patient.name}</h1>
              <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-mono">Patient ID: {patient.id.slice(0, 8)}</p>
              
              <div className="flex gap-2 mt-4">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 uppercase">
                  {patient.clinicLink.status}
                </span>
                {patient.consent?.status === "active" && (
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    CONSENTED
                  </span>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-slate-800 pt-6">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-sm">{patient.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-sm">{patient.phone || "No phone linked"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm">DOB: {patient.healthProfile?.dob || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm">Gender: {patient.healthProfile?.gender || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Vitals Summary</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-500 mb-1">Blood Group</div>
                  <div className="font-bold text-slate-100">{patient.healthProfile?.bloodGroup || "O+"}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-500 mb-1">Genotype</div>
                  <div className="font-bold text-slate-100">{patient.healthProfile?.genotype || "AA"}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Middle/Right Columns: Records & Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-blue-500/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{encounters.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Encounters</div>
                </div>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-purple-500/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{labs.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Lab Orders</div>
                </div>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-emerald-500/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{prescriptions.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Prescriptions</div>
                </div>
             </div>
          </div>

          <Link href={`/dashboard/patients/${id}/billing`} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-amber-500/30 transition-all cursor-pointer group block">
             <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
               <CreditCard className="w-6 h-6" />
             </div>
             <div>
               <div className="text-2xl font-bold text-white">Billing Overview</div>
               <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Patient Financial Records</div>
             </div>
          </Link>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100">Encounter History</h2>
              <button className="text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1 group">
                View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="space-y-4">
               {encounters.length === 0 && (
                 <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
                    <Clock className="w-10 h-10 text-slate-800 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No encounters recorded yet.</p>
                 </div>
               )}
               {encounters.map(enc => (
                 <div key={enc.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:bg-slate-800/20 transition-all">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{enc.chiefComplaint}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 capitalize">
                           Status: <span className={enc.status === 'signed' ? 'text-emerald-500' : 'text-amber-500'}>{enc.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-300">{format(new Date(enc.createdAt), "MMM d, yyyy")}</div>
                      <div className="text-xs text-slate-500">Clinical Record</div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-12">
               <h2 className="text-xl font-bold text-slate-100 mb-6">Laboratory History</h2>
               <div className="space-y-4">
                  {labs.length === 0 && (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                      <p className="text-slate-500 text-sm">No laboratory results found.</p>
                    </div>
                  )}
                  {labs.map(lab => (
                    <div key={lab.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:bg-slate-800/20 transition-all">
                       <div className="flex gap-4">
                         <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                           <FlaskConical className="w-5 h-5" />
                         </div>
                         <div>
                           <div className="font-semibold text-slate-200">{lab.testNames}</div>
                           <div className="text-xs text-slate-500 uppercase tracking-tighter">Status: {lab.status}</div>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-sm font-medium text-slate-300">{format(new Date(lab.orderedAt), "MMM d, yyyy")}</div>
                         {lab.attachmentUrl && (
                           <Link href={lab.attachmentUrl} target="_blank" className="text-xs text-blue-400 hover:underline">View Result</Link>
                         )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
