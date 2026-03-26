"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  FileUp,
  Plus,
  ArrowRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClinicalCase {
  id: string;
  patientName: string;
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  createdAt: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  createdAt: string;
}

export default function PatientsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Clinician States
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  
  // Clinic States
  const [patients, setPatients] = useState<Patient[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const isClinic = user?.role === "CLINIC_ADMIN";

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        if (isClinic) {
          const res = await fetch(`${API_URL}/api/v1/patients?q=${search}`, {
            headers: {
              "x-user-id": user.id,
              "x-user-role": user.role
            }
          });
          const data = await res.json();
          setPatients(data.patients || []);
        } else {
          const res = await fetch(`${API_URL}/api/v1/patients`, {
            headers: {
              "x-user-id": user.id,
              "x-user-role": user.role
            }
          });
          if (res.ok) {
            const data = await res.json();
            setCases(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, isClinic, search, API_URL]);

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 animate-pulse">Loading patient records...</p>
      </div>
    );
  }

  if (isClinic) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3 font-syne">
              <Users className="w-8 h-8 text-accent" />
              Patient Repository
            </h1>
            <p className="text-slate-400 mt-1">Manage your clinic's patient records and health profiles.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <Link 
              href="/dashboard/patients/add"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all border border-slate-700 text-sm"
            >
              <FileUp className="w-4 h-4" />
              Bulk Import
            </Link>
            <Link 
              href="/dashboard/patients/add"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-accent/10 text-sm font-bold"
            >
              <UserPlus className="w-4 h-4" />
              Add Patient
            </Link>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-card-bg border border-card-border p-4 rounded-2xl mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search patients by name, email or phone..."
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-accent transition-colors text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 bg-slate-950/50 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 hover:border-slate-700 transition-all text-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Patient List */}
        <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Patient</th>
                    <th className="px-6 py-4 font-semibold">Contact</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                    <th className="px-6 py-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/patients/${patient.id}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-black font-bold">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 group-hover:text-accent transition-colors">{patient.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">ID: {patient.id.slice(0, 8)}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {patient.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {patient.phone || "N/A"}
                          </div>
                       </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          patient.status === "active" ? "bg-accent/10 text-accent border border-accent/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}>
                          {patient.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-500 hover:text-white">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-200">No patients found</h3>
              <p className="text-slate-500 max-w-sm mt-2 text-sm">
                Start by adding a patient manually or importing records from your existing files.
              </p>
              <div className="mt-8">
                 <Link 
                  href="/dashboard/patients/add"
                  className="bg-accent hover:bg-accent/90 text-black px-6 py-2 rounded-xl transition-all font-bold"
                >
                  Onboard First Patient
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Doctor View (Default)
  const filtered = cases.filter(c => 
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.chiefComplaint.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold font-syne mb-2 bg-gradient-to-r from-white to-accent2 bg-clip-text text-transparent">
            My Patients
          </h1>
          <p className="text-slate-400">Manage recent consultations and clinical cases</p>
        </div>
        <button 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 transition-transform text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-900/20"
          onClick={() => window.location.assign("/dashboard/copilot")}
        >
          <Plus size={20} /> New Case
        </button>
      </div>

      <div className="relative mb-8 bg-card-bg border border-card-border rounded-2xl overflow-hidden backdrop-blur-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          placeholder="Search by patient name or complaint..." 
          className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-slate-100 outline-none text-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card-bg border border-dashed border-card-border rounded-3xl">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600">
            <Users size={48} />
          </div>
          <h3 className="text-2xl font-bold mb-2">No cases found</h3>
          <p className="text-slate-500 mb-8">You haven't recorded any clinical cases yet.</p>
          <button 
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl border border-slate-700 transition-all font-semibold"
            onClick={() => window.location.assign("/dashboard/copilot")}
          >
            Start first analysis
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <div 
              key={c.id} 
              className="bg-card-bg border border-card-border rounded-3xl p-6 cursor-pointer hover:border-accent2 hover:bg-white/5 transition-all group flex flex-col"
              onClick={() => window.location.assign(`/dashboard/patients/${c.id}`)}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 border border-card-border rounded-2xl flex items-center justify-center font-bold text-xl text-accent2">
                  {c.patientName[0]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg text-slate-100 group-hover:text-accent2 transition-colors">{c.patientName}</div>
                  <div className="text-sm text-slate-500">{c.patientAge}y • {c.patientSex}</div>
                </div>
                <div className="text-xs text-slate-600 font-mono mt-[-20px]">{new Date(c.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex-grow mb-6">
                <div className="text-[10px] uppercase tracking-widest font-black text-accent2 mb-2">Chief Complaint</div>
                <div className="text-slate-300 line-clamp-2 leading-relaxed">{c.chiefComplaint}</div>
              </div>
              <div className="pt-4 border-t border-card-border flex items-center justify-between">
                <span className="text-sm text-accent2 font-bold flex items-center gap-1">
                  View details <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
