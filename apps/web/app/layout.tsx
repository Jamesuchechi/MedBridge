import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "MedBridge — AI Healthcare Intelligence for Africa",
    template: "%s | MedBridge",
  },
  description:
    "MedBridge is an AI-powered medical intelligence platform built for Africa. Symptom analysis, document analyzer, drug intelligence, doctor copilot — all trained on African epidemiological data.",
  keywords: [
    "AI healthcare Africa",
    "Nigeria medical AI",
    "AfriDx",
    "symptom checker Nigeria",
    "NAFDAC drug database",
    "doctor copilot",
    "medical document analyzer",
  ],
  authors: [{ name: "MedBridge Health Technologies" }],
  creator: "MedBridge",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://medbridge.health",
    siteName: "MedBridge",
    title: "MedBridge — AI Healthcare Intelligence for Africa",
    description:
      "Symptom analysis, document analyzer, drug intelligence & clinic OS — built on African disease data.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedBridge — AI Healthcare Intelligence for Africa",
    description:
      "Symptom analysis, document analyzer, drug intelligence & clinic OS — built on African disease data.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#03050a" },
    { media: "(prefers-color-scheme: light)", color: "#f0f4f8" },
  ],
  width: "device-width",
  initialScale: 1,
};

import { Providers } from "./providers";

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

