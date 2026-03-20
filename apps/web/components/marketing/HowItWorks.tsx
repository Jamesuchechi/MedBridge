"use client";

import React from "react";
import { Reveal, useInView } from "../ui/Reveal";

function Step({ n, title, desc, delay }: { n: number; title: string; desc: string; delay: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`step-item ${inView ? "in-view" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="step-number">{String(n).padStart(2, "0")}</div>
      <div className="step-connector" />
      <div className="step-content">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    {
      title: "Describe what you feel",
      desc: "Type or speak your symptoms — in English, Pidgin, or local language. MedBridge understands context that generic apps miss.",
    },
    {
      title: "AfriDx analyzes and weights",
      desc: "Our engine cross-references your symptoms, health profile, location, and seasonal patterns against African epidemiological data.",
    },
    {
      title: "Get actionable intelligence",
      desc: "Possible conditions ranked by regional probability, severity score, and your next step — from rest at home to emergency room.",
    },
    {
      title: "Connect to care",
      desc: "Book a verified doctor, get a referral packet generated automatically, or find a pharmacy with your medication in stock near you.",
    },
  ];

  return (
    <section className="section" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <Reveal>
          <div className="section-header-center">
            <span className="section-eyebrow">How It Works</span>
            <h2 className="section-title text-center">From symptom to solution<br />in minutes.</h2>
          </div>
        </Reveal>

        <div className="steps-container">
          {steps.map((s, i) => (
            <Step key={i} n={i + 1} title={s.title} desc={s.desc} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
