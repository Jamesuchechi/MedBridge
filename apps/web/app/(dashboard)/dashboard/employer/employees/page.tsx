"use client";

import React from "react";

export default function EmployerEmployeesPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-syne mb-2">My Employees</h1>
          <p className="text-muted-foreground text-sm">Manage employee enrollment and view enrollment status.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
          Invite Employees
        </button>
      </div>

      <div className="bg-card border rounded-2xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">👥</div>
        <h3 className="text-xl font-bold mb-2">No employees enrolled yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Upload your employee list or invite them individually to start tracking health trends across your organization.
        </p>
        <div className="flex justify-center gap-4">
           <button className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">Bulk Upload (CSV)</button>
           <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Add Individual</button>
        </div>
      </div>
    </div>
  );
}
