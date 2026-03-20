"use client";

import React from "react";
import { Icons } from "../ui/Icons";
import { Reveal } from "../ui/Reveal";

export function CTA() {
  return (
    <section className="cta-section">
      <div className="cta-glow" />
      <div className="container">
        <Reveal>
          <div className="cta-box">
            <div className="inline-flex gap-12 flex-wrap flex-center" style={{ marginBottom: 24 }}>
              <span className="badge badge-green">Early Access Open</span>
              <span className="badge badge-blue">Free for patients</span>
              <span className="badge badge-purple">Built in Nigeria</span>
            </div>
            <h2>
              The future of African<br />
              <span className="gradient-text">healthcare starts here.</span>
            </h2>
            <p>
              Join thousands of patients, doctors, and clinics already on the waitlist. Be first when we launch.
            </p>
            <div className="flex flex-center" style={{ marginTop: 24 }}>
              <a href="/signup" className="btn btn-primary btn-lg">
                Get Started for Free <Icons.ArrowRight />
              </a>
            </div>
            <p className="cta-disclaimer">
              No spam, ever. <a href="#">Privacy policy</a>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
