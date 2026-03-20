"use client";

import React from "react";

export function Footer() {
  const columns = [
    { title: "Product", links: [["Symptom Checker","#"],["Document Analyzer","#"],["Drug Intelligence","#"],["Doctor Copilot","#"],["Clinic OS","#"],["CommunityRx","#"]] },
    { title: "Company", links: [["About","#"],["Blog","#"],["Careers","#"],["Press Kit","#"],["Contact","#"]] },
    { title: "Legal", links: [["Privacy Policy","#"],["Terms of Service","#"],["NDPR Compliance","#"],["Cookie Policy","#"],["Security","#"]] },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#" className="nav-logo" style={{ display: "inline-flex" }}>
              <div className="logo-mark">M</div>
              <span className="logo-text">Med<span>Bridge</span></span>
            </a>
            <p>AI-powered medical intelligence built for Africa. Connecting patients, doctors, and clinics through technology that understands the continent.</p>
            <div className="status-pill" style={{ marginTop: 16 }}>
              <div className="status-dot" />
              All systems operational
            </div>
          </div>
          {columns.map(({ title, links }) => (
            <div key={title} className="footer-col">
              <h4>{title}</h4>
              <ul>
                {links.map(([label, href]) => (
                  <li key={label}><a href={href}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <p>© 2025 MedBridge Health Technologies Ltd. Built in Nigeria 🇳🇬</p>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
