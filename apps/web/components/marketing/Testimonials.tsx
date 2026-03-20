"use client";

import React from "react";
import { Reveal, useInView } from "../ui/Reveal";

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  avatar: string;
  delay: number;
}

function TestimonialCard({ quote, name, role, avatar, delay }: TestimonialCardProps) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`testimonial-card glass-card ${inView ? "in-view" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="quote-mark">"</div>
      <p className="quote-text">{quote}</p>
      <div className="testimonial-author">
        <div className="author-avatar">{avatar}</div>
        <div>
          <div className="author-name">{name}</div>
          <div className="author-role">{role}</div>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const testimonials = [
    { quote: "For the first time I have an AI that correctly raised malaria before I even mentioned fever. It just understood the symptom pattern.", name: "Dr. Aisha Bello", role: "GP, Abuja — Doctor Copilot user", avatar: "A", delay: 0 },
    { quote: "I uploaded my lab results and it explained my low haemoglobin in plain English and told me which foods to eat. My doctor didn't even do that.", name: "Emeka O.", role: "Patient, Lagos", avatar: "E", delay: 100 },
    { quote: "We replaced our paper appointment book and three WhatsApp groups. Now our front desk runs the whole clinic from one screen.", name: "Nurse Funmi A.", role: "Clinic Admin, Ibadan", avatar: "F", delay: 200 },
    { quote: "The drug interaction checker caught a dangerous combination I almost prescribed. That feature alone is worth everything.", name: "Dr. Kwame S.", role: "Internal Medicine, Accra", avatar: "K", delay: 100 },
    { quote: "CommunityRx showed me three pharmacies near me with my exact medication and the prices. I saved ₦4,000 that day.", name: "Blessing N.", role: "Patient, Port Harcourt", avatar: "B", delay: 200 },
    { quote: "AfriDx is the real thing. It weighted sickle cell crisis differently for my patient because she had SS genotype on her profile. That's nuance.", name: "Dr. Tunde A.", role: "Haematologist, Lagos", avatar: "T", delay: 0 },
  ];

  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <div className="section-header-center">
            <span className="section-eyebrow">Early Access</span>
            <h2 className="section-title text-center">From our beta users.</h2>
          </div>
        </Reveal>
        <div className="testimonials-grid">
          {testimonials.map((t) => <TestimonialCard key={t.name} {...t} />)}
        </div>
      </div>
    </section>
  );
}
