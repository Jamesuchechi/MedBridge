"use client";

import React from "react";

export function HeroIllustration() {
  return (
    <div className="hero-illustration-wrapper">
      <svg viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-svg">
        {/* Outer orbit rings */}
        <circle cx="260" cy="260" r="220" stroke="var(--ring-color)" strokeWidth="0.5" strokeDasharray="4 8" className="orbit-ring ring-1"/>
        <circle cx="260" cy="260" r="170" stroke="var(--ring-color)" strokeWidth="0.5" strokeDasharray="3 6" className="orbit-ring ring-2"/>
        <circle cx="260" cy="260" r="120" stroke="var(--ring-color)" strokeWidth="1" className="orbit-ring ring-3"/>

        {/* Central glow */}
        <circle cx="260" cy="260" r="80" fill="url(#centerGlow)" className="pulse-circle"/>
        <circle cx="260" cy="260" r="55" fill="url(#innerGlow)"/>

        {/* Heart ECG center */}
        <polyline points="220,260 232,260 240,240 248,280 256,250 264,270 272,260 284,260 292,260 300,260" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ecg-line"/>

        {/* Orbiting module orbs */}
        {/* Brain orb - top */}
        <g className="orb-group orb-1">
          <circle cx="260" cy="90" r="32" fill="url(#orbGrad1)" className="orb-glow"/>
          <circle cx="260" cy="90" r="28" fill="var(--glass-bg)" stroke="var(--accent-primary)" strokeWidth="1.5"/>
          <g transform="translate(248,78)" width="24" height="24" style={{color:"var(--accent-primary)"}}>
            <path d="M6.5 2A2.5 2.5 0 0 1 9 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.677A3 3 0 0 1 2 11a3 3 0 0 1 1.5-2.598A2.5 2.5 0 0 1 6.5 2Z" stroke="var(--accent-primary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.677A3 3 0 0 0 14 11a3 3 0 0 0-1.5-2.598A2.5 2.5 0 0 0 9.5 2Z" stroke="var(--accent-primary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </g>

        {/* Doc orb - right */}
        <g className="orb-group orb-2">
          <circle cx="430" cy="260" r="32" fill="url(#orbGrad2)" className="orb-glow"/>
          <circle cx="430" cy="260" r="28" fill="var(--glass-bg)" stroke="var(--accent-secondary)" strokeWidth="1.5"/>
          <g transform="translate(418,248)" style={{color:"var(--accent-secondary)"}}>
            <path d="M8.5 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L13.5 2z" stroke="var(--accent-secondary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="13 2 13 8 19 8" stroke="var(--accent-secondary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="13" x2="5" y2="13" stroke="var(--accent-secondary)" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="9" y1="17" x2="5" y2="17" stroke="var(--accent-secondary)" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
        </g>

        {/* Pill orb - bottom */}
        <g className="orb-group orb-3">
          <circle cx="260" cy="430" r="32" fill="url(#orbGrad3)" className="orb-glow"/>
          <circle cx="260" cy="430" r="28" fill="var(--glass-bg)" stroke="var(--accent-tertiary)" strokeWidth="1.5"/>
          <g transform="translate(248,418)" style={{color:"var(--accent-tertiary)"}}>
            <path d="m7.5 14.5 7-7a3.54 3.54 0 1 0-5-5l-7 7a3.54 3.54 0 1 0 5 5Z" stroke="var(--accent-tertiary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="6" y1="6" x2="11" y2="11" stroke="var(--accent-tertiary)" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
        </g>

        {/* Hospital orb - left */}
        <g className="orb-group orb-4">
          <circle cx="90" cy="260" r="32" fill="url(#orbGrad1)" className="orb-glow"/>
          <circle cx="90" cy="260" r="28" fill="var(--glass-bg)" stroke="var(--accent-primary)" strokeWidth="1.5"/>
          <g transform="translate(78,248)" style={{color:"var(--accent-primary)"}}>
            <path d="M8 6v4M10 14H6M10 18H6M10 8H6" stroke="var(--accent-primary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" stroke="var(--accent-primary)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </g>

        {/* Connector lines */}
        <line x1="260" y1="118" x2="260" y2="180" stroke="var(--accent-primary)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.6"/>
        <line x1="402" y1="260" x2="340" y2="260" stroke="var(--accent-secondary)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.6"/>
        <line x1="260" y1="402" x2="260" y2="340" stroke="var(--accent-tertiary)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.6"/>
        <line x1="118" y1="260" x2="180" y2="260" stroke="var(--accent-primary)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.6"/>

        {/* Small data points */}
        {[
          {cx:160,cy:130},{cx:360,cy:130},{cx:160,cy:390},{cx:360,cy:390},
          {cx:195,cy:195},{cx:325,cy:195},{cx:195,cy:325},{cx:325,cy:325}
        ].map((p,i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r="3" fill="var(--accent-primary)" opacity="0.35" className={`data-dot dot-${i}`}/>
        ))}

        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="orbGrad1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="orbGrad2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="orbGrad3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-tertiary)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--accent-tertiary)" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
