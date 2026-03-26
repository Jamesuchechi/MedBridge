"use client";

import React from "react";

export default function EmployerPulsePage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold font-syne mb-2">Pulse Analytics <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">AI</span></h1>
        <p className="text-muted-foreground text-sm">Aggregated, anonymized health trends and population insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
         <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Participation Rate</div>
            <div className="text-3xl font-bold font-syne">--%</div>
            <div className="text-xs text-muted-foreground mt-1">Minimum 5 employees required</div>
         </div>
         <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Top Health Concern</div>
            <div className="text-3xl font-bold font-syne italic text-muted-foreground">Scanning...</div>
            <div className="text-xs text-muted-foreground mt-1">Aggregate data only</div>
         </div>
         <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Emergency Alerts</div>
            <div className="text-3xl font-bold font-syne text-green-500">0</div>
            <div className="text-xs text-muted-foreground mt-1">Real-time monitoring active</div>
         </div>
      </div>

      <div className="bg-card border border-dashed rounded-3xl p-20 text-center bg-muted/5">
         <div className="text-5xl mb-6">📊</div>
         <h3 className="text-2xl font-bold font-syne mb-3">Insufficient Data to Reveal Trends</h3>
         <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            To protect employee privacy, analytics only appear when at least **5 employees** have shared their anonymized health activity. Invite your team to get started.
         </p>
         <button className="mt-8 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
            Invite Employees
         </button>
      </div>
    </div>
  );
}
