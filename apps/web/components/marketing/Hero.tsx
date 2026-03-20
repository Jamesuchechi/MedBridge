"use client";

import React from "react";
import { Icons } from "../ui/Icons";
import { Particles } from "../ui/Particles";
import { HeroIllustration } from "./HeroIllustration";

export function Hero() {
  return (
    <section className="hero" id="product">
      <div className="hero-bg" />
      <div className="hero-grid" />
      <Particles />
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-dot" />
              Built for Africa. Powered by AI.
            </div>
            <h1 className="hero-headline font-display">
              Healthcare<br />
              intelligence<br />
              <span className="highlight">re-imagined.</span>
            </h1>
            <p className="hero-subhead">
              MedBridge connects patients, doctors, and clinics through AI that actually understands African medicine — malaria patterns, local drug databases, and clinical workflows built for how Nigerian healthcare really works.
            </p>
            <div className="hero-cta-group">
              <a href="/signup" className="btn btn-primary">
                Get Started <Icons.ArrowRight />
              </a>
              <a href="#features" className="btn btn-outline">
                See how it works
              </a>
            </div>
            <div className="hero-badges">
              {[
                { label: "AfriDx Engine", icon: Icons.Brain },
                { label: "NDPR Compliant", icon: Icons.Shield },
                { label: "5,000+ Drugs", icon: Icons.Pill },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="hero-badge">
                  <Icon />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <HeroIllustration />
        </div>

        {/* Floating status cards */}
        <div className="floating-cards-row" style={{ marginTop: 64 }}>
          {[
            { dot: "var(--accent-primary)", text: "Symptom analyzed in 2.4s" },
            { dot: "var(--accent-secondary)", text: "Lab result processed" },
            { dot: "var(--accent-tertiary)", text: "Referral packet sent" },
          ].map((c, i) => (
            <div key={i} className="floating-card">
              <div className="floating-card-dot" style={{ background: c.dot }} />
              <span>{c.text}</span>
              <span className="badge badge-green" style={{ marginLeft: 4 }}>Live</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
