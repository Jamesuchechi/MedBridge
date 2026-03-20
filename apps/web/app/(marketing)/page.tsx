"use client";

import React from "react";
import { AnnouncementBar } from "../../components/marketing/AnnouncementBar";
import { Navbar } from "../../components/layout/Navbar";
import { Hero } from "../../components/marketing/Hero";
import { StatsBar } from "../../components/marketing/StatsBar";
import { Features } from "../../components/marketing/Features";
import { AfriDxEngine } from "../../components/marketing/AfriDxEngine";
import { HowItWorks } from "../../components/marketing/HowItWorks";
import { WhoItsFor } from "../../components/marketing/WhoItsFor";
import { Testimonials } from "../../components/marketing/Testimonials";
import { Pricing } from "../../components/marketing/Pricing";
import { CTA } from "../../components/marketing/CTA";
import { Footer } from "../../components/layout/Footer";

import "./marketing.css";

export default function MedBridgeLanding() {
  return (
    <div>
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <Features />
        <div className="glow-line" />
        <AfriDxEngine />
        <HowItWorks />
        <WhoItsFor />
        <Testimonials />
        <div className="glow-line" />
        <Pricing />
        <CTA />
      </main>
      <AnnouncementBar />
      <Footer />
    </div>
  );
}