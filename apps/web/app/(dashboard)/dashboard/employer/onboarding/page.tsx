"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    state: "",
    lga: "",
    industry: "",
    size: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/employer/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          ...formData,
          size: formData.size ? parseInt(formData.size) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register company");
      }

      // Success! Refresh session/metadata if needed, then redirect
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unknown error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-syne mb-2">Register your Company</h1>
        <p className="text-muted-foreground">Submit your company details to start using MedBridge Pulse for your employees.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-2xl p-8 shadow-sm">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name *</label>
            <input
              name="name"
              required
              className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
              placeholder="e.g. Acme Health Corp"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Business Email *</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
              placeholder="hr@company.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <input
              name="phone"
              className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
              placeholder="+234..."
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <input
              name="industry"
              className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
              placeholder="e.g. Finance, Tech"
              value={formData.industry}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">State *</label>
            <input
              name="state"
              required
              className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
              placeholder="Lagos"
              value={formData.state}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company Size</label>
            <select
              name="size"
              className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
              value={formData.size}
              onChange={handleChange}
            >
              <option value="">Select...</option>
              <option value="10">1-10</option>
              <option value="50">11-50</option>
              <option value="200">51-200</option>
              <option value="500">201-500</option>
              <option value="1000">500+</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Office Address</label>
          <input
            name="address"
            className="w-full bg-background border rounded-lg px-4 py-2.5 outline-none focus:ring-2 ring-primary/20 transition-all"
            placeholder="123 Admiralty Way, Lekki"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Registering..." : "Complete Registration"}
        </button>
      </form>
    </div>
  );
}
