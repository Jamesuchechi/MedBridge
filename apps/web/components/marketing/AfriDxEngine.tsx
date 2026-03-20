"use client";

import React from "react";
import { Icons } from "../ui/Icons";
import { Reveal } from "../ui/Reveal";
import { AfricaMap } from "./AfricaMap";

export function AfriDxEngine() {
  return (
    <section className="section afridx-section" id="afridx">
      <div className="afridx-bg" />
      <div className="container">
        <div className="afridx-content">
          <Reveal className="afridx-text-block">
            <div>
              <span className="section-eyebrow">AfriDx Engine</span>
              <h2 className="section-title">
                Diagnosis that knows<br />
                <span className="gradient-text">where you are.</span>
              </h2>
              <p className="section-subtitle" style={{ marginTop: 12 }}>
                Generic AI symptom checkers are trained on Western epidemiological data. They miss malaria, underweight typhoid, and know nothing about sickle cell prevalence in Kano vs Ibadan.
              </p>
              <p className="section-subtitle" style={{ marginTop: 12 }}>
                AfriDx is our proprietary diagnostic weighting engine — built on West African disease prevalence data, seasonal patterns, and genotype intersections.
              </p>
            </div>
            <div className="afridx-pill-list">
              {[
                { text: "Malaria differential weighting", badge: "Rainy season adj." },
                { text: "Sickle cell crisis recognition", badge: "Genotype-aware" },
                { text: "Typhoid vs viral fever disambiguation", badge: "Regional" },
                { text: "NAFDAC drug counterfeit alerts", badge: "Real-time" },
                { text: "14 West African countries", badge: "v2.0" },
              ].map((p) => (
                <div key={p.text} className="afridx-pill">
                  <div className="afridx-pill-dot" />
                  <span className="afridx-pill-text">{p.text}</span>
                  <span className="afridx-pill-badge">{p.badge}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#" className="btn btn-primary btn-sm">Read the technical paper <Icons.ArrowRight /></a>
              <a href="#" className="btn btn-outline btn-sm">View accuracy data</a>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <AfricaMap />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
