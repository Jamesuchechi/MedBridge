import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border, rgba(255,255,255,.08))",
      padding: "28px 32px",
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 16,
    }}>
      {/* Left: copyright */}
      <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>
        © {new Date().getFullYear()} MedBridge Health Technologies. Nigeria.
      </p>

      {/* Right: doctor CTA + links */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <Link
          href="/support"
          style={{ fontSize: 12, color: "var(--text3)", textDecoration: "none" }}
        >
          Support
        </Link>
        <Link
          href="/privacy"
          style={{ fontSize: 12, color: "var(--text3)", textDecoration: "none" }}
        >
          Privacy
        </Link>

        {/* Doctor onboarding CTA — the entry point for clinicians */}
        <Link
          href="/signup/doctor"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent, #00e5a0)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            background: "rgba(0,229,160,.08)",
            border: "1px solid rgba(0,229,160,.2)",
            borderRadius: 8,
            transition: "background .2s",
          }}
        >
          🩺 Are you a doctor? Join MedBridge
        </Link>
      </div>
    </footer>
  );
}
