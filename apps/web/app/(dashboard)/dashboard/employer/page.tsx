"use client";

import React from "react";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { useAuthStore } from "@/store/auth.store";

export default function EmployerDashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;
  return <DashboardHome user={{
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(), // Shell expects lowercase or uppercase, DashboardHome handle both
    initials: user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
    profileComplete: 100 // Employers don't have the same profile completion as patients
  }} />;
}
