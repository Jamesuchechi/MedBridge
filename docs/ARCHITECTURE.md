# Healthbridge — Architecture

## Overview

Healthbridge is a monorepo containing three applications sharing a single backend API and PostgreSQL database. The architecture follows a clean separation between the consumer-facing mobile/web app, the hospital-facing web dashboard, and the shared API layer.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │   Consumer App       │     │     Hospital Dashboard       │  │
│  │   React Native/Expo  │     │     React + Vite             │  │
│  │   iOS · Android · Web│     │     Web only                 │  │
│  └──────────┬───────────┘     └──────────────┬───────────────┘  │
└─────────────│────────────────────────────────│─────────────────┘
              │ HTTPS / REST + WebSocket        │
┌─────────────▼────────────────────────────────▼─────────────────┐
│                         API LAYER                               │
│                                                                 │
│   Node.js + Express                                             │
│   ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│   │Auth / RBAC │ │ Consumer  │ │ Hospital │ │  Shared/Admin │  │
│   │middleware  │ │ routes    │ │ routes   │ │  routes       │  │
│   └────────────┘ └───────────┘ └──────────┘ └───────────────┘  │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   Service Layer                          │  │
│   │  TriageService · ProviderService · MedService            │  │
│   │  BookingService · EMRService · BillingService            │  │
│   │  PharmacyService · LabService · StaffService             │  │
│   └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      DATA LAYER                                 │
│                                                                 │
│  ┌─────────────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │  PostgreSQL 15  │  │ Redis 7  │  │  AWS S3                │  │
│  │  Primary DB     │  │ Cache +  │  │  Prescriptions,        │  │
│  │                 │  │ Sessions │  │  Lab reports, Docs     │  │
│  └─────────────────┘  └──────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
│                                                                 │
│  Claude API       → Triage engine + AI assistant                │
│  Google Vision    → Prescription OCR                            │
│  Google Maps      → Provider/pharmacy proximity                 │
│  Twilio           → SMS notifications                           │
│  Expo Push        → Mobile push notifications                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
healthbridge/
├── apps/
│   ├── consumer/              # React Native (Expo)
│   │   ├── src/
│   │   │   ├── screens/       # Screen components
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── navigation/    # React Navigation setup
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── services/      # API client calls
│   │   │   ├── store/         # Zustand global state
│   │   │   └── utils/
│   │   ├── app.json
│   │   └── package.json
│   │
│   ├── hospital/              # React + Vite dashboard
│   │   ├── src/
│   │   │   ├── pages/         # Page-level components
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── modules/       # Feature modules (EMR, billing, etc.)
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── store/         # Zustand global state
│   │   ├── index.html
│   │   └── package.json
│   │
│   └── api/                   # Node.js + Express
│       ├── src/
│       │   ├── routes/        # Route definitions
│       │   ├── controllers/   # Request handlers
│       │   ├── services/      # Business logic
│       │   ├── models/        # DB models (Prisma)
│       │   ├── middleware/     # Auth, validation, error handling
│       │   ├── jobs/          # Background jobs (BullMQ)
│       │   └── lib/           # External service clients
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── package.json
│
├── packages/
│   ├── shared/                # Shared TypeScript types & utils
│   │   ├── src/
│   │   │   ├── types/         # Shared type definitions
│   │   │   ├── constants/     # Shared constants
│   │   │   └── utils/         # Shared utility functions
│   │   └── package.json
│   │
│   ├── ui/                    # Shared component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── tokens/        # Design tokens
│   │   └── package.json
│   │
│   └── config/                # Shared tooling config
│       ├── eslint/
│       ├── tsconfig/
│       └── package.json
│
├── infrastructure/
│   ├── docker-compose.yml     # Local dev (Postgres, Redis)
│   ├── docker-compose.prod.yml
│   └── terraform/             # AWS infrastructure as code
│
└── package.json               # pnpm workspace root
```

---

## Database Schema

### Core Tables

```sql
-- Users (consumer accounts)
users
  id              UUID PRIMARY KEY
  email           VARCHAR UNIQUE NOT NULL
  phone           VARCHAR
  full_name       VARCHAR NOT NULL
  date_of_birth   DATE
  gender          VARCHAR
  location        POINT              -- lat/lng
  created_at      TIMESTAMPTZ DEFAULT NOW()

-- Hospitals / clinics
hospitals
  id              UUID PRIMARY KEY
  name            VARCHAR NOT NULL
  type            VARCHAR            -- hospital | clinic | pharmacy | lab
  address         TEXT
  location        POINT
  license_number  VARCHAR UNIQUE
  is_verified     BOOLEAN DEFAULT FALSE
  created_at      TIMESTAMPTZ

-- Hospital staff accounts
staff
  id              UUID PRIMARY KEY
  hospital_id     UUID REFERENCES hospitals(id)
  email           VARCHAR UNIQUE NOT NULL
  role            VARCHAR            -- admin | doctor | nurse | pharmacist | lab_tech | billing
  full_name       VARCHAR NOT NULL
  speciality      VARCHAR            -- for doctors
  license_number  VARCHAR

-- Providers (doctors linked to hospitals)
providers
  id              UUID PRIMARY KEY
  staff_id        UUID REFERENCES staff(id)
  hospital_id     UUID REFERENCES hospitals(id)
  trust_score     DECIMAL DEFAULT 0
  consultation_fee INTEGER
  available_for_teleconsult BOOLEAN DEFAULT FALSE
  languages       VARCHAR[]

-- Appointments
appointments
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  provider_id     UUID REFERENCES providers(id)
  hospital_id     UUID REFERENCES hospitals(id)
  scheduled_at    TIMESTAMPTZ NOT NULL
  type            VARCHAR            -- in_person | teleconsult
  status          VARCHAR            -- pending | confirmed | cancelled | completed
  triage_result   JSONB              -- triage output that led to booking
  notes           TEXT
  created_at      TIMESTAMPTZ

-- EMR — patient records
emr_records
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  hospital_id     UUID REFERENCES hospitals(id)
  provider_id     UUID REFERENCES providers(id)
  appointment_id  UUID REFERENCES appointments(id)
  chief_complaint TEXT
  diagnosis       TEXT
  treatment_plan  TEXT
  prescriptions   JSONB[]            -- array of {drug, dosage, duration, notes}
  vitals          JSONB              -- {bp, temp, weight, height}
  created_at      TIMESTAMPTZ

-- Reviews
reviews
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  provider_id     UUID REFERENCES providers(id)
  appointment_id  UUID REFERENCES appointments(id) UNIQUE
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5)
  did_listen      BOOLEAN
  was_rushed      BOOLEAN
  diagnosis_helpful BOOLEAN
  comment         TEXT
  created_at      TIMESTAMPTZ

-- Medications
medications
  id              UUID PRIMARY KEY
  name            VARCHAR NOT NULL   -- brand name
  generic_name    VARCHAR
  category        VARCHAR
  requires_prescription BOOLEAN DEFAULT TRUE

-- Pharmacy stock
pharmacy_stock
  id              UUID PRIMARY KEY
  hospital_id     UUID REFERENCES hospitals(id)  -- pharmacies are a hospital type
  medication_id   UUID REFERENCES medications(id)
  quantity        INTEGER NOT NULL
  unit_price      INTEGER            -- in kobo/cents
  last_updated    TIMESTAMPTZ
  verified_by_user_at TIMESTAMPTZ   -- crowdsource timestamp

-- Ward management
wards
  id              UUID PRIMARY KEY
  hospital_id     UUID REFERENCES hospitals(id)
  name            VARCHAR NOT NULL
  total_beds      INTEGER
  occupied_beds   INTEGER DEFAULT 0

-- Admissions
admissions
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  hospital_id     UUID REFERENCES hospitals(id)
  ward_id         UUID REFERENCES wards(id)
  provider_id     UUID REFERENCES providers(id)
  admitted_at     TIMESTAMPTZ
  discharged_at   TIMESTAMPTZ
  status          VARCHAR            -- admitted | discharged | transferred

-- Lab requests
lab_requests
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  hospital_id     UUID REFERENCES hospitals(id)
  provider_id     UUID REFERENCES providers(id)
  appointment_id  UUID REFERENCES appointments(id)
  test_name       VARCHAR NOT NULL
  status          VARCHAR            -- requested | processing | completed
  result_url      VARCHAR            -- S3 URL
  result_summary  TEXT
  notified_at     TIMESTAMPTZ
  created_at      TIMESTAMPTZ

-- Billing
invoices
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  hospital_id     UUID REFERENCES hospitals(id)
  appointment_id  UUID REFERENCES appointments(id)
  line_items      JSONB[]            -- [{description, quantity, unit_price}]
  total_amount    INTEGER            -- in kobo/cents
  status          VARCHAR            -- draft | issued | paid | insurance_submitted | settled
  insurance_claim_id VARCHAR
  created_at      TIMESTAMPTZ

-- Staff shifts
shifts
  id              UUID PRIMARY KEY
  staff_id        UUID REFERENCES staff(id)
  hospital_id     UUID REFERENCES hospitals(id)
  start_time      TIMESTAMPTZ
  end_time        TIMESTAMPTZ
  department      VARCHAR
  status          VARCHAR            -- scheduled | active | completed | swapped
```

---

## Authentication & Authorization

### Two Auth Domains

**Consumer auth** — Supabase Auth (email/phone + OTP). JWT stored in device secure storage. All consumer API routes require `Authorization: Bearer <token>` with `role: consumer` claim.

**Hospital staff auth** — separate Supabase auth tenant. JWT includes `role`, `hospital_id`, and `staff_id` claims. Role-based access control (RBAC) enforced at the route middleware level.

### RBAC Matrix

| Resource | Consumer | Doctor | Nurse | Pharmacist | Lab Tech | Billing | Admin |
|---|---|---|---|---|---|---|---|
| EMR (own records) | Read | Read/Write | Read | Read | Read | — | Full |
| EMR (other patients) | — | Read/Write | Read | Read | Read | — | Full |
| Appointments | Book/Cancel | Manage | View | — | — | — | Full |
| Pharmacy stock | Search | — | — | Full | — | — | Full |
| Lab requests | View own | Create/View | View | — | Full | — | Full |
| Invoices | View own | — | — | — | — | Full | Full |
| Staff shifts | — | View own | View own | View own | View own | View own | Full |
| Ward management | — | View | Full | — | — | — | Full |

---

## API Design

All endpoints follow REST conventions. Base URL: `/api/v1`

### Consumer endpoints

```
POST   /auth/register
POST   /auth/login
GET    /auth/me

POST   /triage/start              # Begin symptom triage session
POST   /triage/answer             # Submit answer in triage flow
GET    /triage/result/:sessionId  # Get triage result + provider recommendations

GET    /providers                 # Search providers (query: lat, lng, speciality, type)
GET    /providers/:id             # Provider profile
POST   /providers/:id/book        # Book appointment
GET    /appointments              # My appointments
PATCH  /appointments/:id/cancel
POST   /appointments/:id/review

GET    /medications/search        # Search by name (query: name, lat, lng)
GET    /medications/:id/stock     # Pharmacy stock near location
POST   /medications/scan          # Upload prescription image for OCR

GET    /health/history            # My symptom + visit history
```

### Hospital endpoints

```
POST   /hospital/auth/login

GET    /hospital/appointments     # All appointments for hospital
PATCH  /hospital/appointments/:id/confirm
PATCH  /hospital/appointments/:id/complete

GET    /hospital/patients         # Patient directory
GET    /hospital/patients/:id/emr
POST   /hospital/patients/:id/emr
PUT    /hospital/patients/:id/emr/:recordId

GET    /hospital/wards            # Ward list + bed availability
POST   /hospital/admissions
PATCH  /hospital/admissions/:id/discharge

GET    /hospital/pharmacy/stock
POST   /hospital/pharmacy/stock
PATCH  /hospital/pharmacy/stock/:id

GET    /hospital/lab/requests
POST   /hospital/lab/requests
PATCH  /hospital/lab/requests/:id/result

GET    /hospital/billing/invoices
POST   /hospital/billing/invoices
PATCH  /hospital/billing/invoices/:id/status

GET    /hospital/staff
GET    /hospital/staff/shifts
POST   /hospital/staff/shifts
PATCH  /hospital/staff/shifts/:id
```

---

## AI Triage Engine

The triage engine uses Claude API with strict architectural constraints:

1. **Hardcoded red-flag rules run first** — before any AI call. Stroke symptoms, cardiac arrest signs, severe allergic reaction, etc. trigger immediate emergency escalation. The AI never overrides this layer.

2. **Claude handles the conversational flow** — asking follow-up questions, understanding context, duration, severity, history.

3. **Output is always a structured care-level enum** — `self_care | gp | urgent_care | emergency` — never a diagnosis string.

4. **System prompt enforces the constraint**:

```
You are a medical triage assistant. Your role is to determine the appropriate level of care needed, not to diagnose conditions. Always output a JSON object with:
- care_level: "self_care" | "gp" | "urgent_care" | "emergency"
- care_category: string (e.g. "respiratory", "musculoskeletal")
- reasoning: string (plain language explanation for the user)
- next_question: string | null (follow-up question, or null if enough info)

Never name a specific diagnosis. Never provide treatment instructions. If any red flag is mentioned (chest pain radiating to arm, sudden severe headache, difficulty breathing, loss of consciousness), output care_level: "emergency" immediately.
```

---

## Real-time Features

WebSocket connections (Socket.io) handle:
- Live bed availability updates in hospital ward view
- Appointment status changes pushed to consumer app
- Lab result notifications
- Pharmacy stock confirmations from crowdsourced users

---

## Background Jobs (BullMQ + Redis)

| Job | Trigger | Action |
|---|---|---|
| `send-appointment-reminder` | 24h and 1h before appointment | SMS + push notification |
| `send-lab-result-notification` | Lab result uploaded | Push + SMS to patient |
| `check-low-stock` | Every 6 hours | Alert hospital pharmacy if stock below threshold |
| `update-provider-trust-score` | New review submitted | Recalculate weighted trust score |
| `sync-pharmacy-stock` | Every 30 minutes | Aggregate crowdsourced confirmations |
| `expire-triage-sessions` | Every hour | Clean up abandoned triage sessions |

---

## Security Considerations

- All PII encrypted at rest in PostgreSQL using column-level encryption for sensitive fields (diagnosis, prescriptions)
- Prescription images stored in private S3 bucket with signed URL access (15-minute expiry)
- Lab result PDFs similarly in private S3
- Rate limiting on triage endpoint (10 sessions/hour per user) to prevent abuse
- Medical disclaimer stored and acknowledged at account creation — logged to DB with timestamp
- HIPAA/NDPR compliance considerations documented in `docs/COMPLIANCE.md`

---

## Deployment

### Development
```bash
docker-compose up    # Starts Postgres + Redis locally
pnpm dev             # Starts all three apps
```

### Production
- API: AWS EC2 behind ALB, auto-scaling group
- Consumer web: Vercel or AWS CloudFront + S3
- Hospital dashboard: Vercel or AWS CloudFront + S3
- Database: AWS RDS PostgreSQL (Multi-AZ)
- Redis: AWS ElastiCache
- File storage: AWS S3 with CloudFront CDN
- CI/CD: GitHub Actions → staging on PR, production on merge to main