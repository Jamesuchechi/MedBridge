import Link from "next/link";

export function Footer() {
  const columns = [
    { title: "Product", links: [["Symptom Checker","#"],["Document Analyzer","#"],["Drug Intelligence","#"],["Doctor Copilot","#"],["Clinic OS","#"],["CommunityRx","#"]] },
    { title: "Company", links: [["About","#"],["Blog","#"],["Careers","#"],["Press Kit","#"],["Contact","#"]] },
    { 
      title: "Doctors", 
      links: [
        ["Join MedBridge", "/signup/doctor"],
        ["Doctor Login", "/login"],
        ["Doctor Copilot", "#"],
        ["Referral System", "#"],
      ] 
    },
    { title: "Legal", links: [["Privacy Policy","#"],["Terms of Service","#"],["NDPR Compliance","#"],["Cookie Policy","#"],["Security","#"]] },
  ];

  return (
    <footer className="footer footer-desktop-only">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="nav-logo" style={{ display: "inline-flex" }}>
              <div className="logo-mark">M</div>
              <span className="logo-text">Med<span>Bridge</span></span>
            </Link>
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
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link href={href}>{label}</Link>
                    ) : (
                      <a href={href}>{label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} MedBridge Health Technologies Ltd. Built in Nigeria 🇳🇬</p>
          <div className="footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
