"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "../ui/Icons";
import { useTheme } from "next-themes";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="container">
          <div className="nav-inner">
            <a href="#" className="nav-logo">
              <div className="logo-mark">M</div>
              <span className="logo-text">Med<span>Bridge</span></span>
            </a>
            
            <ul className="nav-links">
              {[
                ["Product", "#product"],
                ["Features", "#features"],
                ["AfriDx", "#afridx"],
                ["Pricing", "#pricing"],
                ["Docs", "#docs"]
              ].map(([label, href]) => (
                <li key={label}><a href={href}>{label}</a></li>
              ))}
            </ul>

            <div className="nav-actions">
              <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
              </button>
              <a href="/login" className="btn btn-ghost btn-sm nav-desktop-cta">Log in</a>
              <a href="/signup" className="btn btn-primary btn-sm nav-desktop-cta">Get Started</a>
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                {menuOpen ? <Icons.X /> : <Icons.Menu />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      >
        <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
          <button className="mobile-menu-close" onClick={() => setMenuOpen(false)}>
            <Icons.X />
          </button>
          
          <div className="mobile-menu-links">
            {["Product", "Features", "Pricing", "About"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)}>
                {l}
              </a>
            ))}
          </div>
          
          <div className="mobile-menu-actions">
            <a href="/login" className="btn btn-outline w-full" onClick={() => setMenuOpen(false)}>Log in</a>
            <a href="/signup" className="btn btn-primary w-full" onClick={() => setMenuOpen(false)}>Get Started</a>
          </div>
        </div>
      </div>
    </>
  );
}
