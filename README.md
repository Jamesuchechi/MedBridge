# MedBridge

> AI-powered medical intelligence platform built for Africa — assistive, not authoritative.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-orange)]()
[![Built for: Nigeria / Africa](https://img.shields.io/badge/Market-Nigeria%20%2F%20Africa-green)]()

---

## What is MedBridge?

MedBridge is a full-stack AI medical intelligence platform that bridges the gap between patients, clinicians, and healthcare facilities across Africa. It is not a diagnostic tool — it is an assistive intelligence layer that makes health information more accessible, clinical workflows faster, and medical records smarter.

The product is designed from the ground up for the African healthcare context: local disease patterns (malaria, typhoid, sickle cell), Nigerian drug databases, low-bandwidth environments, and a healthcare system where the doctor-to-patient ratio makes AI assistance not optional but essential.

---

## Core Modules

### 1. Medical Document Analyzer *(v1 wedge)*
Upload lab results, prescriptions, NHIS forms, NAFDAC drug labels, or any medical report. MedBridge extracts key findings, flags abnormal values, highlights risk indicators, and explains everything in plain English (and Pidgin, optionally).

### 2. Symptom Intelligence
Patients describe symptoms in natural language. MedBridge returns possible conditions ranked by likelihood, a severity score, and a recommended next action — from "rest and hydrate" to "go to A&E now." Never a diagnosis. Always a direction.

### 3. Doctor Copilot
A professional-grade assistant for clinicians. Summarizes patient history, surfaces differential diagnoses, recommends investigations, flags drug interactions, and generates structured clinical notes — all within the consultation window.

### 4. Drug & Treatment Intelligence
Explains medications in plain language, checks for interactions across a patient's medication list, provides dosage guidance with weight and age adjustments, and cross-references against the Nigerian NAFDAC drug registry.

### 5. Clinic & Facility OS
A lightweight clinic management layer: patient records, appointment scheduling, referral coordination, AI-generated discharge summaries, and visit reports. Designed for the 3-doctor private clinic, not just tertiary hospitals.

### 6. Health Profile Memory *(new)*
A longitudinal health record that builds over time. The more a user engages, the more personalized and accurate MedBridge's intelligence becomes. Fully encrypted. User-owned. Exportable.

### 7. AfriRisk Engine *(new — Africa-first differentiator)*
A risk-scoring engine trained on African epidemiological patterns. Inputs: symptoms, age, sex, location, season, travel history. Output: condition probability ranked by regional prevalence. Malaria in Lagos in rainy season scores differently than the same symptoms in December.

### 8. Community Health Intelligence *(new)*
Anonymized, aggregated health signal data from MedBridge users feeds a public health dashboard — surfacing outbreak patterns, regional disease prevalence, and seasonal health trends. Useful for NGOs, NCDC, and state health ministries.

---

## Who It's For

| User | What they get |
|------|--------------|
| Patient / consumer | Symptom guidance, document analysis, health memory |
| General practitioner | Doctor copilot, differential support, note generation |
| Specialist | Referral intake, structured history, investigation recommendations |
| Clinic admin | Records, scheduling, billing summaries |
| Public health body | Anonymized regional health signal data |

---

## What MedBridge Is Not

- **Not a diagnostic tool.** MedBridge never tells a user they have a condition. It surfaces possibilities and recommends actions.
- **Not a replacement for doctors.** Every clinical feature is explicitly assistive. The human clinician remains authoritative.
- **Not a pharmacy.** MedBridge does not prescribe or dispense medications.

---

## Key Design Principles

1. **Assistive, not authoritative** — AI supports decisions, never makes them.
2. **Safety-first** — Critical symptom patterns trigger immediate emergency escalation.
3. **Africa-native** — Local disease patterns, local drugs, local languages, local infrastructure constraints.
4. **Offline-resilient** — Core features degrade gracefully on low bandwidth. USSD integration planned.
5. **Privacy by design** — HIPAA-equivalent structure, end-to-end encryption, user data sovereignty.
6. **Explainability** — Every AI output includes a plain-language rationale, not just a result.

---

## Tech Stack (Overview)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, Tailwind CSS, Zustand |
| Backend | Node.js + Python hybrid (FastAPI for AI routes) |
| AI / LLM | OpenAI GPT-4o / Groq (Llama 3) / Mistral — swappable |
| Medical NLP | Custom embeddings on PubMed + African clinical corpus |
| Database | PostgreSQL (structured), Redis (cache/sessions) |
| File storage | Supabase Storage / AWS S3 (reports, scans) |
| Auth | NextAuth.js + JWT + RBAC |
| Infra | Docker, Vercel (frontend), Railway or Render (backend) |

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project setup, monorepo, CI/CD | Planned |
| 1 | Landing page + waitlist | Planned |
| 2 | Document Analyzer MVP | Planned |
| 3 | Symptom Intelligence MVP | Planned |
| 4 | Auth, health profiles, dashboard | Planned |
| 5 | Doctor Copilot | Planned |
| 6 | Drug Intelligence + NAFDAC DB | Planned |
| 7 | Clinic OS | Planned |
| 8 | AfriRisk Engine | Planned |
| 9 | Community Health Intelligence | Planned |
| 10 | Mobile app, offline mode, USSD | Planned |

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Python 3.11+ (for local AI service development)

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/your-org/medbridge.git
cd medbridge

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL and API keys in .env

# Start infrastructure (Redis)
docker-compose up -d

# Initialize database
pnpm --filter @medbridge/db db:push
pnpm --filter @medbridge/db db:seed

# Start all services in development mode
pnpm dev
```

### 3. Service Map
- **Frontend**: http://localhost:3000
- **Node API**: http://localhost:4000
- **AI Service**: http://localhost:8000
- **Redis**: localhost:6379

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design and [DOCUMENTATION.md](./DOCUMENTATION.md) for feature specifications.

---

## Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MedBridge

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medbridge
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# AI
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk-...

# Storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...

# Email
RESEND_API_KEY=re_...

# SMS / USSD (Africa)
TERMII_API_KEY=...
TERMII_SENDER_ID=MedBridge
```

---

## Safety & Compliance

MedBridge operates under a strict safety framework:

- All AI outputs carry mandatory disclaimers
- Emergency symptom patterns trigger immediate escalation with nearest facility lookup
- No dangerous treatment or dosage recommendations without clinical-grade validation
- Patient data is encrypted at rest and in transit
- Role-based access control separates patient, doctor, clinic, and admin contexts
- Full audit trail on all clinical AI outputs
- No AI diagnostic claim is ever surfaced without a "consult a doctor" follow-up

---

## License

MIT License. See [LICENSE](./LICENSE).

---

## Contributing

MedBridge is being built in public. Contributions, issues, and feedback are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.

---

*MedBridge — Bridging intelligence and care across Africa.*