"use client";

import React from "react";
import { Counter } from "../ui/Counter";

export function StatsBar() {
  const stats = [
    { n: 5000, s: "+", label: "NAFDAC drugs indexed" },
    { n: 14, s: "", label: "African countries covered" },
    { n: 99, s: "%", label: "Emergency detection rate" },
    { n: 2500, s: ":1", label: "Doctor-patient ratio addressed" },
  ];

  return (
    <div className="stats-bar">
      <div className="container">
        <div className="stats-grid">
          {stats.map(({ n, s, label }) => (
            <div key={label} className="stat-item">
              <div className="stat-number">
                <Counter to={n} suffix={s} />
              </div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
