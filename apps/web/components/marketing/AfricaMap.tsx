"use client";

import React from "react";

export function AfricaMap() {
  return (
    <div className="africa-map-container">
      <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="africa-svg">
        {/* Simplified Africa outline */}
        <path d="M155 30 L170 25 L195 28 L220 22 L245 28 L268 25 L285 35 L295 55 L300 75 L298 95 L305 115 L315 130 L318 150 L312 170 L320 185 L325 205 L322 225 L330 245 L335 265 L325 285 L320 305 L305 325 L295 345 L278 365 L258 385 L240 400 L225 415 L210 425 L195 420 L182 410 L168 398 L152 382 L140 365 L125 348 L112 328 L100 308 L92 288 L88 268 L80 248 L75 228 L72 208 L70 188 L75 168 L70 148 L65 128 L68 108 L72 88 L80 70 L92 55 L108 42 L130 32 Z"
          stroke="var(--accent-primary)" strokeWidth="1.5" fill="var(--africa-fill)" className="africa-path"/>

        {/* Nigeria highlight */}
        <circle cx="185" cy="258" r="12" fill="var(--accent-primary)" opacity="0.3" className="nigeria-pulse"/>
        <circle cx="185" cy="258" r="6" fill="var(--accent-primary)" opacity="0.8"/>

        {/* Data point nodes */}
        {[
          {cx:160,cy:180},{cx:210,cy:195},{cx:240,cy:240},{cx:155,cy:300},
          {cx:220,cy:310},{cx:190,cy:350},{cx:270,cy:200},{cx:130,cy:240}
        ].map((p,i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r="4" fill="var(--accent-secondary)" opacity="0.6" className={`map-node node-${i}`}/>
            <line x1={p.cx} y1={p.cy} x2="185" y2="258" stroke="var(--accent-primary)" strokeWidth="0.5" opacity="0.25" strokeDasharray="3 4"/>
          </g>
        ))}

        {/* Labels */}
        <text x="170" y="248" fill="var(--accent-primary)" fontSize="9" fontWeight="600" fontFamily="monospace">NGR</text>
      </svg>
    </div>
  );
}
