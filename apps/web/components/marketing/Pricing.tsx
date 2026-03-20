"use client";

import React from "react";
import { Icons } from "../ui/Icons";
import { Reveal, useInView } from "../ui/Reveal";

interface PricingCardProps {
  plan: string;
  price: string;
  features: string[];
  highlight?: boolean;
  delay: number;
}

function PricingCard({ plan, price, features, highlight = false, delay }: PricingCardProps) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`pricing-card ${highlight ? "pricing-highlight" : ""} ${inView ? "in-view" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {highlight && <div className="pricing-badge">Most Popular</div>}
      <div className="pricing-plan">{plan}</div>
      <div className="pricing-price">{price}</div>
      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i}><span className="check-icon"><Icons.Check /></span>{f}</li>
        ))}
      </ul>
      <button className={`btn ${highlight ? "btn-primary" : "btn-outline"} w-full`}>Get Started</button>
    </div>
  );
}

export function Pricing() {
  return (
    <section className="section" id="pricing" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <Reveal>
          <div className="section-header-center">
            <span className="section-eyebrow">Pricing</span>
            <h2 className="section-title text-center">Accessible from day one.</h2>
            <p className="section-subtitle">
              Free for patients. Powerful for professionals. Enterprise-grade for clinics.
            </p>
          </div>
        </Reveal>
        <div className="pricing-grid">
          <PricingCard
            plan="Free"
            price="₦0 / mo"
            features={["5 symptom checks/month","Document analyzer (3 docs)","Drug search & lookup","Basic health profile","Community drug prices"]}
            delay={0}
          />
          <PricingCard
            plan="Pro Patient"
            price="₦1,500 / mo"
            features={["Unlimited symptom checks","Unlimited document analysis","Full health profile + history","Doctor connection","Priority support"]}
            highlight
            delay={150}
          />
          <PricingCard
            plan="Clinic OS"
            price="₦45,000 / mo"
            features={["Full EMR & patient records","Appointment scheduling","Doctor Copilot (all staff)","AI clinical reports","Billing & invoicing","Up to 10 staff accounts"]}
            delay={300}
          />
        </div>
        <Reveal delay={200}>
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 14, color: "var(--text-muted)" }}>
            All plans include a 14-day free trial. No card required. Employer Pulse pricing on request.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
