"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  UserPlus, 
  FileUp, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  FileText,
  Table as TableIcon,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";

interface ImportedPatient {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  status: "success" | "error";
  message?: string;
}

export default function AddPatientPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "uploading" | "processing" | "success">("idle");
  const [importResults, setImportResults] = useState<ImportedPatient[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "Male"
  });

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/patients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register patient");
      }
      
      router.push("/dashboard/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("uploading");
    setError(null);

    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/v1/patients/import", {
        method: "POST",
        body: data
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to process import");
      }
      
      const result = await res.json();
      setImportResults(result.results || []);
      setImportStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process import");
      setImportStatus("idle");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link 
        href="/dashboard/patients"
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group w-fit"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Directory
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-100">Onboard New Patient</h1>
        <p className="text-slate-400 mt-2">Add a single patient record or import a bulk list from files.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl mb-8 border border-slate-800">
        <button 
          onClick={() => setActiveTab("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            activeTab === "manual" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Manual Registration
        </button>
        <button 
          onClick={() => setActiveTab("import")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            activeTab === "import" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileUp className="w-4 h-4" />
          Universal Import
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {activeTab === "manual" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. James Uchechi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Email Address</label>
                <input 
                  type="email"
                  placeholder="james@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Phone Number</label>
                <input 
                  required
                  type="tel"
                  placeholder="+234..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Date of Birth</label>
                <input 
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                />
              </div>
               <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-400">Gender</label>
                <div className="flex gap-4">
                  {["Male", "Female", "Other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({...formData, gender: g})}
                      className={`flex-1 py-3 rounded-xl border transition-all ${
                        formData.gender === g 
                        ? "bg-blue-600/10 border-blue-500 text-blue-400" 
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              Register Patient
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <input 
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.json,.xml,.txt,.jpg,.jpeg,.png"
            />
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-300">
                {importStatus === "uploading" ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-slate-500 group-hover:text-blue-400 transition-colors" />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-100">Upload Patient Records</h3>
              <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                Drag and drop your files here. We support Excel, CSV, PDF, Images, and more.
              </p>
              
              <div className="flex justify-center gap-6 mt-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800"><TableIcon className="w-5 h-5 text-emerald-500" /></div>
                  <span className="text-xs text-slate-500">Excel/CSV</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800"><FileText className="w-5 h-5 text-red-500" /></div>
                  <span className="text-xs text-slate-500">PDF/Docs</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800"><ImageIcon className="w-5 h-5 text-purple-500" /></div>
                  <span className="text-xs text-slate-500">Images</span>
                </div>
              </div>
            </div>
          </div>

          {importStatus === "success" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Import Results
                </h3>
                <span className="text-sm text-slate-400">{importResults.length} patients processed</span>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {importResults.map((res, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        res.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {res.name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{res.name || "Unknown Patient"}</div>
                        <div className="text-xs text-slate-500">{res.email || res.phone || "No contact info"}</div>
                      </div>
                    </div>
                    <div>
                      {res.status === "success" ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">Success</span>
                      ) : (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full border border-red-500/20">Error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => router.push("/dashboard/patients")}
                className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                Go to Directory
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
