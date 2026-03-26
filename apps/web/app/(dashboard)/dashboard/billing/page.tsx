"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  TrendingUp,
  Clock,
  AlertCircle,
  FileText
} from "lucide-react";

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

export default function ClinicBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await api.get<Invoice[]>("/api/v1/invoices");
      setInvoices(data);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalRevenue: invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0),
    outstanding: invoices.reduce((sum, inv) => sum + parseFloat(inv.dueAmount), 0),
    pendingCount: invoices.filter(inv => inv.status !== 'paid').length
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-syne mb-2">Clinic Billing</h1>
        <p className="text-muted-foreground">Manage invoices, payments, and financial reports.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card-bg border border-card-border rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm font-mono text-muted-foreground uppercase">Total Revenue</span>
          </div>
          <div className="text-3xl font-bold font-syne">₦{stats.totalRevenue.toLocaleString()}</div>
        </div>

        <div className="bg-card-bg border border-card-border rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock size={20} />
            </div>
            <span className="text-sm font-mono text-muted-foreground uppercase">Outstanding</span>
          </div>
          <div className="text-3xl font-bold font-syne">₦{stats.outstanding.toLocaleString()}</div>
        </div>

        <div className="bg-card-bg border border-card-border rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent2/20 flex items-center justify-center text-accent2">
              <AlertCircle size={20} />
            </div>
            <span className="text-sm font-mono text-muted-foreground uppercase">Pending Invoices</span>
          </div>
          <div className="text-3xl font-bold font-syne">{stats.pendingCount}</div>
        </div>
      </div>

      {/* Invoice Search & Filters */}
      <div className="bg-card-bg border border-card-border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search invoice number..." 
              className="w-100 bg-glass border border-card-border rounded-xl py-2 pl-10 pr-4 outline-none focus:border-accent/50 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-glass border border-card-border rounded-xl hover:bg-glass-h transition-colors">
            <Filter size={18} /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-sm uppercase font-mono">
                <th className="pb-4 font-normal">Invoice #</th>
                <th className="pb-4 font-normal">Date</th>
                <th className="pb-4 font-normal">Total</th>
                <th className="pb-4 font-normal">Paid</th>
                <th className="pb-4 font-normal">Status</th>
                <th className="pb-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No invoices found.</td></tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 font-bold">{inv.invoiceNumber}</td>
                    <td className="py-4 text-sm">{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</td>
                    <td className="py-4">₦{parseFloat(inv.totalAmount).toLocaleString()}</td>
                    <td className="py-4 text-accent">₦{parseFloat(inv.paidAmount).toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${
                        inv.status === 'paid' ? 'bg-accent/20 text-accent' :
                        inv.status === 'partial' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 rounded-lg hover:bg-glass transition-colors text-muted-foreground hover:text-white">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
