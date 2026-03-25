"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  FileUp
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  createdAt: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/patients?q=${search}`);
        const data = await res.json();
        setPatients(data.patients || []);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatients();
  }, [search]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Patient Repository
          </h1>
          <p className="text-slate-400 mt-1">Manage your clinic's patient records and health profiles.</p>
        </div>
        <div className="flex gap-3">
           <Link 
            href="/dashboard/patients/add"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-all border border-slate-700"
          >
            <FileUp className="w-4 h-4" />
            Bulk Import
          </Link>
          <Link 
            href="/dashboard/patients/add"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-900/20"
          >
            <UserPlus className="w-4 h-4" />
            Add Patient
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search patients by name, email or phone..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-slate-300 hover:border-slate-700 transition-all">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Patient List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
             <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
             <p className="text-slate-400 animate-pulse">Loading patient records...</p>
          </div>
        ) : patients.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/patients/${patient.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">{patient.name}</div>
                        <div className="text-xs text-slate-500 font-mono uppercase tracking-tighter">ID: {patient.id.slice(0, 8)}</div>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      patient.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}>
                      {patient.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-500 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-200">No patients found</h3>
            <p className="text-slate-500 max-w-sm mt-2">
              Start by adding a patient manually or importing records from your existing files.
            </p>
            <div className="mt-8 flex gap-4">
               <Link 
                href="/dashboard/patients/add"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-all"
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
