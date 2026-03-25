"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export default function ClinicDashboardPage() {
  const { user } = useAuthStore();
  const [clinic, setClinic] = useState<{ name: string; verificationStatus: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<{ name: string; verificationStatus: string }>("/api/v1/clinics/me", {
      headers: {
        "x-user-id": user.id,
        "x-user-role": user.role,
      }
    })
    .then(setClinic)
    .catch(() => setClinic(null))
    .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="p-8 text-center">Loading clinic profile...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-syne mb-2">Welcome to {clinic?.name || "your Clinic"}</h1>
        <p className="text-muted-foreground">Manage your staff, appointments, and EMR from here.</p>
      </div>

      {clinic?.verificationStatus !== "approved" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            ⏳
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-500 mb-1">Verification {clinic?.verificationStatus === "pending" ? "Pending" : "Required"}</h3>
            <p className="text-sm text-muted-foreground">
              {clinic?.verificationStatus === "pending" 
                ? "Your clinic application is currently being reviewed. Most reviews are completed within 48 hours."
                : "Your clinic registration is incomplete or was rejected. Please check your settings or contact support."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card-bg border border-card-border rounded-2xl p-6">
          <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold font-syne">--</div>
              <div className="text-xs text-muted-foreground">Total Staff</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-syne">--</div>
              <div className="text-xs text-muted-foreground">Active Patients</div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-card-bg border border-card-border rounded-2xl p-6">
          <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <a href="/dashboard/settings/staff" className="p-4 rounded-xl bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
              <div className="font-bold mb-1">Invite Staff</div>
              <div className="text-xs text-muted-foreground">Add doctors, nurses, etc.</div>
            </a>
            <button className="p-4 rounded-xl bg-glass border border-white/5 hover:border-white/10 transition-colors text-left" disabled>
              <div className="font-bold mb-1">Clinic Profile</div>
              <div className="text-xs text-muted-foreground">Edit details (coming soon)</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
