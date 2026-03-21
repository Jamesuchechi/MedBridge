"use client";

import React, { useState, useEffect } from "react";

interface Particle {
  left: string;
  delay: string;
  duration: string;
  width: string;
  opacity: number;
}

export function Particles() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setMounted(true);
    const newParticles: Particle[] = Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 10}s`,
      width: `${2 + Math.random() * 4}px`,
      opacity: 0.3 + Math.random() * 0.4,
    }));
    setParticles(newParticles);
  }, []);

  if (!mounted) return null;

  return (
    <div className="particles-container" aria-hidden>
      {particles.map((p, i) => (
        <div 
          key={i} 
          className="particle" 
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.width,
            height: p.width,
            opacity: p.opacity,
          }} 
        />
      ))}
    </div>
  );
}
