"use client";

import React, { useState } from "react";
import { Icons } from "../ui/Icons";
import { Reveal } from "../ui/Reveal";

export function WhoItsFor() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "Patients", icon: Icons.Users },
    { label: "Doctors", icon: Icons.Stethoscope },
    { label: "Clinics", icon: Icons.Hospital },
  ];

  const tabContent = [
    {
      heading: "Healthcare that understands you",
      body: "Check symptoms, analyze lab results, track medications, and connect with verified doctors — all in one platform that actually knows what malaria looks like in Lagos versus Kano.",
      points: ["Smart symptom checker with AfriDx weighting", "Lab result analyzer in plain English", "Personal health profile with history", "Find verified doctors near you"],
    },
    {
      heading: "Your AI clinical co-pilot",
      body: "Stop spending 40% of consultation time on documentation. MedBridge generates your SOAP notes, surfaces differentials you might have missed, and builds a structured referral packet in one click.",
      points: ["AI-powered differential diagnosis", "Automated SOAP note generation", "Structured referral packets", "Drug interaction alerts at prescription time"],
    },
    {
      heading: "Run your clinic smarter",
      body: "From patient intake to billing, MedBridge replaces your WhatsApp groups, paper files, and spreadsheets with a purpose-built system that learns how your clinic works.",
      points: ["Full EMR and patient records", "Appointment scheduling and reminders", "AI-generated clinical reports", "Staff management and role access"],
    },
  ];

  return (
    <section className="section tab-section" id="who">
      <div className="container">
        <Reveal>
          <div className="section-header-center">
            <span className="section-eyebrow">Built For Everyone</span>
            <h2 className="section-title text-center">One platform,<br />every role.</h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="tab-controls">
            {tabs.map(({ label, icon: Icon }, i) => (
              <button
                key={i}
                className={`tab-btn ${activeTab === i ? "active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                <Icon /> {label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="tab-content-area">
          <Reveal className="tab-text" key={activeTab}>
            <h2>{tabContent[activeTab].heading}</h2>
            <p>{tabContent[activeTab].body}</p>
            <ul className="tab-points">
              {tabContent[activeTab].points.map((p, i) => (
                <li key={i}>
                  <span className="check-icon"><Icons.Check /></span>
                  {p}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 28 }}>
              <a href="#" className="btn btn-primary">
                Get started free <Icons.ArrowRight />
              </a>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="tab-visual">
              <div className="tab-visual-inner">
                <div className="mock-title">
                  {activeTab === 0 && "Symptom Analysis"}
                  {activeTab === 1 && "Clinical Copilot"}
                  {activeTab === 2 && "Clinic Dashboard"}
                </div>
                {activeTab === 0 && <>
                  <div className="mock-stat-row"><span className="mock-stat-label">Condition match</span><span className="mock-stat-value">Malaria (P. falciparum)</span></div>
                  <div className="mock-bar" style={{ marginTop: 4 }}><div className="mock-bar-fill" style={{ width: "82%", background: "var(--accent-primary)" }} /></div>
                  <div className="mock-stat-row" style={{ marginTop: 4 }}><span className="mock-stat-label">AfriDx confidence</span><span className="mock-stat-value">82%</span></div>
                  <div className="mock-stat-row"><span className="mock-stat-label">Severity</span><span className="mock-stat-value" style={{ color: "var(--accent-warm)" }}>Moderate</span></div>
                  <div className="mock-stat-row"><span className="mock-stat-label">Urgency</span><span className="mock-stat-value">See GP today</span></div>
                  <div style={{ padding: "10px 14px", background: "rgba(0,229,160,0.07)", borderRadius: 8, fontSize: 12, color: "var(--accent-primary)", border: "1px solid rgba(0,229,160,0.15)", marginTop: 4 }}>
                    Not a diagnosis. Please consult a qualified healthcare professional.
                  </div>
                </>}
                {activeTab === 1 && <>
                  <div className="mock-stat-row"><span className="mock-stat-label">Top differential</span><span className="mock-stat-value">Viral meningitis</span></div>
                  <div className="mock-bar" style={{ marginTop: 4 }}><div className="mock-bar-fill" style={{ width: "71%", background: "var(--accent-secondary)" }} /></div>
                  <div className="mock-stat-row" style={{ marginTop: 4 }}><span className="mock-stat-label">Suggested test</span><span className="mock-stat-value">LP + FBC</span></div>
                  <div className="mock-stat-row"><span className="mock-stat-label">SOAP note</span><span className="mock-stat-value" style={{ color: "var(--accent-primary)" }}>Generated ✓</span></div>
                  <div className="mock-stat-row"><span className="mock-stat-label">Referral</span><span className="mock-stat-value">Neurology — Urgent</span></div>
                </>}
                {activeTab === 2 && <>
                  <div className="mock-stat-row"><span className="mock-stat-label">Today's appointments</span><span className="mock-stat-value">24 / 30</span></div>
                  <div className="mock-bar" style={{ marginTop: 4 }}><div className="mock-bar-fill" style={{ width: "80%", background: "var(--accent-tertiary)" }} /></div>
                  <div className="mock-stat-row" style={{ marginTop: 4 }}><span className="mock-stat-label">Active patients</span><span className="mock-stat-value">1,847</span></div>
                  <div className="mock-stat-row"><span className="mock-stat-label">Pending records</span><span className="mock-stat-value" style={{ color: "var(--accent-warm)" }}>7</span></div>
                  <div className="mock-stat-row"><span className="mock-stat-label">Monthly revenue</span><span className="mock-stat-value">₦4.2M</span></div>
                </>}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
