"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { 
  FileText,
  Plus,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Building2,
  AlertCircle,
  FileSearch
} from "lucide-react";
import Link from "next/link";

interface InsuranceProvider {
  id: string;
  name: string;
  code: string;
}

interface PatientPolicy {
  id: string;
  providerId: string;
  policyNumber: string;
  planType: string;
  status: string;
}

interface Claim {
  id: string;
  claimNumber: string;
  patientId: string;
  status: string;
  totalAmount: string;
  submittedAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: 'pending' | 'partial' | 'paid' | 'void';
  createdAt: string;
}

export default function PatientBillingPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'invoices' | 'insurance'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [policy, setPolicy] = useState<PatientPolicy | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await api.get<Invoice[]>(`/api/v1/invoices/patient/${id}`);
      setInvoices(data);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    }
  }, [id]);

  const fetchInsuranceData = useCallback(async () => {
    try {
      const [provData, polData, claimData] = await Promise.all([
        api.get<InsuranceProvider[]>('/api/v1/insurance/providers'),
        api.get<PatientPolicy | null>(`/api/v1/insurance/patient/${id}`),
        api.get<Claim[]>(`/api/v1/insurance/claims`) // In real app, filter by patientId on backend
      ]);
      setProviders(provData);
      setPolicy(polData);
      setClaims(claimData.filter((c: Claim) => c.patientId === id));
    } catch (err) {
      console.error("Failed to fetch insurance data:", err);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchInvoices(), fetchInsuranceData()]);
      setIsLoading(false);
    };
    if (id) load();
  }, [id, fetchInvoices, fetchInsuranceData]);

  const handleUpdatePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await api.post(`/api/v1/insurance/patient/${id}`, data);
      await fetchInsuranceData();
    } catch (err) {
      console.error("Failed to update policy:", err);
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0);
  const balanceDue = invoices.reduce((sum, inv) => sum + parseFloat(inv.dueAmount), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href={`/dashboard/patients/${id}`}
          className="w-10 h-10 rounded-xl bg-glass border border-card-border flex items-center justify-center hover:bg-glass-h transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-syne mb-1">Billing History</h1>
          <p className="text-muted-foreground text-sm">Financial records and payment history.</p>
        </div>
        <div className="ml-auto">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-accent text-black font-bold rounded-xl hover:opacity-90 transition-all">
            <Plus size={18} /> New Invoice
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-card-border">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-8 py-4 font-bold transition-all border-b-2 ${
            activeTab === 'invoices' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          Invoice History
        </button>
        <button 
          onClick={() => setActiveTab('insurance')}
          className={`px-8 py-4 font-bold transition-all border-b-2 ${
            activeTab === 'insurance' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          Insurance & NHIS
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="text-sm font-mono text-muted-foreground uppercase mb-2">Total Billed</div>
              <div className="text-2xl font-bold font-syne">₦{totalBilled.toLocaleString()}</div>
            </div>
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="text-sm font-mono text-muted-foreground uppercase mb-2">Total Paid</div>
              <div className="text-2xl font-bold font-syne text-accent">₦{totalPaid.toLocaleString()}</div>
            </div>
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="text-sm font-mono text-muted-foreground uppercase mb-2">Balance Due</div>
              <div className="text-2xl font-bold font-syne text-red-500">₦{balanceDue.toLocaleString()}</div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-6">Invoices</h3>
            
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading records...</div>
              ) : invoices.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No financial records found for this patient.</div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="group p-4 rounded-xl border border-card-border bg-glass hover:border-accent/30 transition-all flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      inv.status === 'paid' ? 'bg-accent/10 text-accent' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <FileText size={24} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center gap-3">
                        {inv.invoiceNumber}
                        {inv.status === 'paid' && <CheckCircle2 size={14} className="text-accent" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Generated on {format(new Date(inv.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">₦{parseFloat(inv.totalAmount).toLocaleString()}</div>
                      <div className={`text-xs uppercase font-bold ${
                        inv.status === 'paid' ? 'text-accent' : 'text-amber-500'
                      }`}>
                        {inv.status}
                      </div>
                    </div>

                    <div className="text-muted-foreground group-hover:text-white transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Policy Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="text-accent" />
                <h3 className="text-lg font-bold font-syne">Policy Details</h3>
              </div>
              
              {policy ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-glass border border-card-border">
                    <div className="text-xs text-muted-foreground uppercase mb-1">HMO / Provider</div>
                    <div className="font-bold">{providers.find(p => p.id === policy.providerId)?.name || "Unknown"}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-glass border border-card-border">
                    <div className="text-xs text-muted-foreground uppercase mb-1">Policy Number</div>
                    <div className="font-bold font-mono">{policy.policyNumber}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-glass border border-card-border">
                    <div className="text-xs text-muted-foreground uppercase mb-1">Plan Type</div>
                    <div className="font-bold">{policy.planType || "N/A"}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
                      {policy.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-6">No insurance policy linked to this patient.</p>
                </div>
              )}

              <hr className="my-8 border-card-border" />

              <form onSubmit={handleUpdatePolicy} className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Link / Update Policy</h4>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Provider</label>
                  <select name="providerId" className="w-full bg-glass border border-card-border rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-all appearance-none" required defaultValue={policy?.providerId}>
                    <option value="">Select HMO</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Policy ID</label>
                  <input name="policyNumber" type="text" defaultValue={policy?.policyNumber} className="w-full bg-glass border border-card-border rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-all" required placeholder="NHIS-XXXXXX" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Plan Type</label>
                  <input name="planType" type="text" defaultValue={policy?.planType} className="w-full bg-glass border border-card-border rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-all" placeholder="e.g. Bronze, Gold" />
                </div>
                <button type="submit" className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all">
                  Save Policy
                </button>
              </form>
            </div>
          </div>

          {/* Claims List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <FileSearch className="text-accent" />
                  <h3 className="text-lg font-bold font-syne">Insurance Claims</h3>
                </div>
                <button className="text-xs font-bold uppercase tracking-widest text-accent hover:underline">
                  New Claim
                </button>
              </div>

              <div className="space-y-4">
                {claims.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-card-border rounded-2xl">
                    <AlertCircle size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No claims submitted for this patient.</p>
                  </div>
                ) : (
                  claims.map(claim => (
                    <div key={claim.id} className="p-4 rounded-xl border border-card-border bg-glass flex justify-between items-center">
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {claim.claimNumber}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            claim.status === 'approved' ? 'bg-accent/10 border-accent/20 text-accent' :
                            claim.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                            'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {claim.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {claim.submittedAt ? `Submitted on ${format(new Date(claim.submittedAt), 'MMM dd, yyyy')}` : 'Draft'}
                        </div>
                      </div>
                      <div className="text-right font-bold">
                        ₦{parseFloat(claim.totalAmount).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
