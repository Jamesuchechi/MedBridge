# Healthbridge

> One platform. Two portals. Your complete healthcare OS.

Healthbridge is a unified healthcare platform that connects everyday consumers to trusted medical care — and gives hospitals and clinics the management system to run efficiently. The consumer portal handles symptom triage, verified provider discovery, and medication availability. The hospital portal is a full-featured HMS covering EMR, appointments, wards, pharmacy inventory, billing, staff scheduling, and lab diagnostics.

---

## What It Does

### Consumer Portal
- **Symptom triage** — AI-guided check that tells you what level of care you need (self-care / GP / urgent / ER), with hardcoded red-flag escalation for emergencies
- **Provider directory** — verified doctors, clinics, and hospitals ranked by outcome-weighted trust scores, not just star ratings
- **Appointment booking** — real-time slot availability, teleconsult or in-person, with pre-visit prep checklist
- **Medication finder** — search by brand or generic name, see which pharmacies near you have it in stock and at what price
- **Prescription scanner** — photograph a prescription, auto-extract drug names, search availability instantly
- **Health history** — personal symptom and visit log, shareable with providers

### Hospital Portal (HMS)
- **EMR** — full electronic medical records per patient, linked to consumer portal bookings
- **Appointment & ward management** — live bed availability, patient admission/discharge, outpatient scheduling
- **Pharmacy & inventory** — drug stock management, expiry tracking, low-stock alerts, procurement requests
- **Billing & insurance** — invoice generation, itemised billing, insurance claim submission and tracking
- **Staff & shift scheduling** — rota management, shift swaps, department-level staffing views
- **Lab results & diagnostics** — test request workflow, result upload, automated patient notification

---

## How the Two Portals Connect

The platform is one backend, two front-end experiences. A consumer books an appointment through the consumer portal → the booking appears instantly in the hospital portal's scheduling system. When a doctor updates a patient's EMR with a prescription, the medication appears in the consumer's health history and triggers a medication finder search. Lab results uploaded by hospital staff notify the patient automatically.

This shared data layer is the core moat: neither portal is as valuable without the other.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (consumer) | React Native + Expo (iOS, Android, Web) |
| Frontend (hospital) | React + Vite (web dashboard) |
| Backend | Node.js + Express |
| Database | PostgreSQL (primary) + Redis (cache) |
| Auth | Supabase Auth + JWT |
| AI triage | Claude API with hardcoded red-flag rules |
| OCR (prescriptions) | Google Vision API |
| Maps & proximity | Google Maps API |
| Notifications | Twilio SMS + Expo Push |
| File storage | AWS S3 |
| Infrastructure | AWS (EC2, RDS, S3) / Supabase for early stage |

---

## Repository Structure

```
healthbridge/
├── apps/
│   ├── consumer/          # React Native consumer app
│   ├── hospital/          # React hospital dashboard
│   └── api/               # Node.js backend API
├── packages/
│   ├── shared/            # Shared types, utils, constants
│   ├── ui/                # Shared UI component library
│   └── config/            # Shared config (eslint, tsconfig)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DOCUMENTATION.md
│   └── TODO.md
├── infrastructure/
│   ├── docker-compose.yml
│   └── terraform/
├── .env.example
├── README.md
└── package.json           # Monorepo root (pnpm workspaces)
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/healthbridge.git
cd healthbridge

# Install dependencies (all workspaces)
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your API keys (see DOCUMENTATION.md for full list)

# Run database migrations
pnpm --filter api db:migrate

# Seed development data
pnpm --filter api db:seed

# Start all services in development
pnpm dev
```

This starts:
- Consumer app at `http://localhost:8081` (Expo web) or via Expo Go on mobile
- Hospital dashboard at `http://localhost:3001`
- API server at `http://localhost:3000`

### Individual services

```bash
pnpm --filter consumer dev   # Consumer app only
pnpm --filter hospital dev   # Hospital dashboard only
pnpm --filter api dev        # API only
```

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/healthbridge
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
GOOGLE_VISION_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
AWS_S3_BUCKET=healthbridge-uploads
JWT_SECRET=your_secret
```

---

## Contributing

See [DOCUMENTATION.md](./docs/DOCUMENTATION.md) for full API reference, data models, and contribution guidelines.

---

## License

MIT