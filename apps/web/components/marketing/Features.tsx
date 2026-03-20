"use client";

import React from "react";
import { Icons } from "../ui/Icons";
import { Reveal, useInView } from "../ui/Reveal";

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  delay 
}: {
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string; 
  delay: number;
}) {
  const { ref, inView } = useInView();
  
  return (
    <div 
      ref={ref} 
      className={`feature-card ${inView ? "in-view" : ""}`} 
      style={{ 
        transitionDelay: `${delay}ms`, 
        "--accent-card": color 
      } as React.CSSProperties}
    >
      <div className="feature-icon-wrap">
        <Icon />
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{description}</p>
      <div className="feature-arrow">
        <Icons.ArrowRight />
      </div>
    </div>
  );
}

export function Features() {
  const features = [
    { icon: Icons.Brain, title: "Symptom Intelligence", description: "Describe what you feel. Our AfriDx engine — trained on West African disease patterns — analyzes your symptoms with regional precision you won't find anywhere else.", color: "var(--accent-primary)", delay: 0 },
    { icon: Icons.FileText, title: "Document Analyzer", description: "Upload your lab results, prescriptions, or medical reports. Get plain-English summaries, flagged abnormalities, and risk insights in seconds.", color: "var(--accent-secondary)", delay: 100 },
    { icon: Icons.Stethoscope, title: "Doctor Copilot", description: "For clinicians: AI-assisted differential diagnosis, SOAP note generation, and clinical decision support built for the Nigerian healthcare context.", color: "var(--accent-tertiary)", delay: 200 },
    { icon: Icons.Pill, title: "Drug Intelligence", description: "Search our 5,000+ NAFDAC-registered drug database. Check interactions, understand medications, and find them near you with real-time pricing.", color: "var(--accent-primary)", delay: 0 },
    { icon: Icons.Hospital, title: "Clinic Operating System", description: "Complete EMR for clinics — appointment scheduling, patient records, AI-generated reports, and billing. Built for Nigerian healthcare workflows.", color: "var(--accent-secondary)", delay: 100 },
    { icon: Icons.Globe, title: "CommunityRx", description: "Real-time drug availability and pricing from verified pharmacies near you. Crowdsourced, verified, and fighting the counterfeit drug epidemic.", color: "var(--accent-tertiary)", delay: 200 },
  ];

  return (
    <section className="section" id="features">
      <div className="container">
        <Reveal>
          <div className="section-header-center">
            <span className="section-eyebrow">Core Platform</span>
            <h2 className="section-title text-center">
              Six modules.<br />One platform.
            </h2>
            <p className="section-subtitle">
              Every tool a patient, doctor, or clinic needs — connected by a shared intelligence layer that learns from every interaction.
            </p>
          </div>
        </Reveal>

        <div className="features-grid">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        <Reveal delay={300}>
          <div className="trust-row">
            {["NAFDAC","MDCN","NHIS","NDPR","HL7 FHIR","ICD-11"].map(l => (
              <div key={l} className="trust-logo">{l}</div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
