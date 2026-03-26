"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export default function StaffManagementPage() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CLINIC_STAFF");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setStatus(null);

    try {
      await api.post("/api/v1/clinics/invite", { email, role }, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        }
      });
      setStatus({ type: "success", message: `Invitation sent to ${email}` });
      setEmail("");
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      setStatus({ type: "error", message: apiErr.data?.error || "Failed to send invitation." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-syne mb-2">Staff Management</h1>
        <p className="text-muted-foreground">Invite and manage your clinical and administrative team.</p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-2xl p-8 mb-8">
        <h2 className="text-xl font-bold mb-6">Invite New Staff</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Email Address</label>
            <input
              type="email"
              placeholder="staff@clinic.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-accent/50 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Role</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-accent/50 transition-colors"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="CLINIC_STAFF">Staff (Nurse/Receptionist)</option>
              <option value="CLINICIAN">Doctor</option>
              <option value="CLINIC_ADMIN">Admin</option>
            </select>
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-accent to-accent2 text-black font-bold p-3 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>

        {status && (
          <div className={`mt-4 p-4 rounded-xl text-sm ${status.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
            {status.message}
          </div>
        )}
      </div>

      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
        <div className="p-6 border-bottom border-white/5">
          <h2 className="text-xl font-bold">Active Staff & Invitations</h2>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          <p>No active staff members yet or pending invitations.</p>
          <p className="text-sm mt-2 font-mono uppercase tracking-widest text-white/20">Data will appear here</p>
        </div>
      </div>
    </div>
  );
}
