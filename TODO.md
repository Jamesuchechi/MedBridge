# Healthbridge — Building Phases

> Status legend: `[ ]` not started · `[~]` in progress · `[x]` complete

---

## Phase 0 — Foundation (Week 1–2)

### Monorepo & tooling
- [ ] Initialise pnpm workspace monorepo
- [ ] Set up `packages/config` with shared ESLint, Prettier, TypeScript configs
- [ ] Set up `packages/shared` with base type definitions
- [ ] Configure Turborepo for parallel builds
- [ ] Set up GitHub Actions CI (lint + typecheck on every PR)
- [ ] Set up Husky pre-commit hooks

### Infrastructure
- [ ] `docker-compose.yml` with PostgreSQL 15 + Redis 7
- [ ] Prisma schema — initial tables (users, hospitals, staff, providers, appointments)
- [ ] Initial database migration
- [ ] `.env.example` with all required keys documented
- [ ] Basic seed script (1 hospital, 5 providers, 10 medications)

### API — base setup
- [ ] Express app with TypeScript
- [ ] Request validation middleware (Zod)
- [ ] Error handling middleware (standardised error shape)
- [ ] Auth middleware (JWT verification, role extraction)
- [ ] Health check endpoint `GET /health`
- [ ] Logging (Pino)

---

## Phase 1 — Consumer Auth + Triage (Week 3–5)

### Consumer auth
- [ ] `POST /auth/register` — email + phone OTP
- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] Supabase Auth integration
- [ ] React Native auth screens (Register, Login, OTP verify)
- [ ] Secure token storage (Expo SecureStore)

### Triage engine
- [ ] Claude API client setup (`packages/shared/lib/claude.ts`)
- [ ] Hardcoded red-flag rules layer (runs before AI, can never be overridden)
- [ ] Triage session model in DB
- [ ] `POST /triage/start`
- [ ] `POST /triage/answer`
- [ ] `GET /triage/result/:sessionId`
- [ ] Consumer triage UI — conversational flow screen
- [ ] Triage result screen — care level + explanation + CTA to find provider
- [ ] Medical disclaimer screen shown on first use (stored to DB)

---

## Phase 2 — Provider Directory + Booking (Week 6–8)

### Provider data
- [ ] Full Prisma schema for providers, appointments, reviews
- [ ] Manual seed: 30 providers in launch city (Abuja)
- [ ] `GET /providers` — search with lat/lng, speciality, type filters
- [ ] `GET /providers/:id`
- [ ] Provider trust score calculation service (weighted: repeat visits, reviews, response time)

### Booking flow
- [ ] `POST /providers/:id/book`
- [ ] `GET /appointments` (consumer)
- [ ] `PATCH /appointments/:id/cancel`
- [ ] Consumer UI — provider search + map view
- [ ] Consumer UI — provider profile page
- [ ] Consumer UI — booking flow (date/time picker, type selector)
- [ ] Consumer UI — appointments list

### Reviews
- [ ] `POST /appointments/:id/review`
- [ ] Review only allowed after appointment status = `completed`
- [ ] Trust score recalculation job triggered on new review
- [ ] Consumer UI — post-visit review form

### Notifications
- [ ] Twilio SMS client setup
- [ ] Expo Push notification setup
- [ ] BullMQ + Redis queue setup
- [ ] Appointment confirmation SMS
- [ ] 24h reminder job
- [ ] 1h reminder job

---

## Phase 3 — Medication Finder (Week 9–10)

### Medication data
- [ ] Medications table seeded (top 200 common drugs in Nigeria)
- [ ] Pharmacy stock table
- [ ] Manual onboard 10 pharmacies in Abuja with stock data
- [ ] `GET /medications/search`
- [ ] `GET /medications/:id/stock` — nearby pharmacies with stock + price
- [ ] Stock staleness logic — flag results older than 48h

### Prescription scanner
- [ ] Google Vision API client
- [ ] `POST /medications/scan` — upload image, OCR, extract drug names
- [ ] Consumer UI — medication search screen
- [ ] Consumer UI — pharmacy results map + list
- [ ] Consumer UI — prescription scanner (camera + upload)

### Crowdsource confirmations
- [ ] `PATCH /medications/stock/:id/confirm` — "still in stock"
- [ ] Last-verified timestamp shown in UI
- [ ] BullMQ job to sync and aggregate confirmations every 30 min

---

## Phase 4 — Hospital Portal: Core (Week 11–13)

### Hospital auth + onboarding
- [ ] Hospital registration flow (admin creates account, provides license)
- [ ] Staff invitation system (admin invites staff by email + role)
- [ ] Hospital portal React app scaffold (Vite + React Router + Zustand)
- [ ] Login + role-based dashboard routing

### Appointment management
- [ ] `GET /hospital/appointments`
- [ ] `PATCH /hospital/appointments/:id/confirm`
- [ ] `PATCH /hospital/appointments/:id/complete`
- [ ] Hospital UI — appointment calendar (day/week view)
- [ ] Hospital UI — appointment detail panel
- [ ] Real-time update when consumer books (WebSocket)

### Patient directory
- [ ] `GET /hospital/patients`
- [ ] `GET /hospital/patients/:id`
- [ ] Hospital UI — patient list with search
- [ ] Hospital UI — patient profile

---

## Phase 5 — Hospital Portal: EMR + Wards (Week 14–16)

### EMR
- [ ] Full EMR Prisma schema
- [ ] `GET /hospital/patients/:id/emr`
- [ ] `POST /hospital/patients/:id/emr`
- [ ] `PUT /hospital/patients/:id/emr/:recordId`
- [ ] Hospital UI — EMR form (chief complaint, diagnosis, treatment plan, prescriptions, vitals)
- [ ] When prescription added to EMR → push to consumer's health history
- [ ] Consumer UI — health history screen showing EMR prescriptions

### Ward management
- [ ] Wards + admissions Prisma schema
- [ ] `GET /hospital/wards`
- [ ] `POST /hospital/admissions`
- [ ] `PATCH /hospital/admissions/:id/discharge`
- [ ] Hospital UI — ward overview (live bed count per ward)
- [ ] Hospital UI — admission form
- [ ] Hospital UI — discharge flow
- [ ] Real-time bed count via WebSocket

---

## Phase 6 — Hospital Portal: Pharmacy, Lab, Billing (Week 17–20)

### Pharmacy / inventory
- [ ] `GET /hospital/pharmacy/stock`
- [ ] `POST /hospital/pharmacy/stock`
- [ ] `PATCH /hospital/pharmacy/stock/:id`
- [ ] Low-stock alert job (threshold configurable per hospital)
- [ ] Hospital UI — pharmacy stock table (search, filter by category)
- [ ] Hospital UI — add/edit stock form
- [ ] Hospital UI — low-stock alerts panel
- [ ] Hospital pharmacy stock feeds into consumer medication finder (opt-in)

### Lab results
- [ ] Lab requests Prisma schema
- [ ] `GET /hospital/lab/requests`
- [ ] `POST /hospital/lab/requests`
- [ ] `PATCH /hospital/lab/requests/:id/result` — upload PDF to S3
- [ ] Auto-notification to patient on result upload
- [ ] Consumer UI — lab results screen (view + download PDF)
- [ ] Hospital UI — lab request queue
- [ ] Hospital UI — result upload form

### Billing
- [ ] Invoices Prisma schema
- [ ] `GET /hospital/billing/invoices`
- [ ] `POST /hospital/billing/invoices`
- [ ] `PATCH /hospital/billing/invoices/:id/status`
- [ ] Hospital UI — invoice list
- [ ] Hospital UI — invoice builder (line items, total)
- [ ] Hospital UI — insurance claim tracking column
- [ ] Consumer UI — my invoices + payment status

---

## Phase 7 — Staff Scheduling (Week 21–22)

- [ ] Shifts Prisma schema
- [ ] `GET /hospital/staff/shifts`
- [ ] `POST /hospital/staff/shifts`
- [ ] `PATCH /hospital/staff/shifts/:id`
- [ ] Shift swap request flow
- [ ] Hospital UI — rota calendar (week view per department)
- [ ] Hospital UI — shift creation modal
- [ ] Hospital UI — swap request notifications
- [ ] Staff can view own upcoming shifts

---

## Phase 8 — Polish, Performance, Launch (Week 23–26)

### Consumer app
- [ ] Offline mode — checklists and health history cached locally
- [ ] App icon + splash screen
- [ ] Onboarding flow (3-screen intro)
- [ ] Push notification deep linking
- [ ] App Store + Play Store submission prep

### Hospital dashboard
- [ ] Analytics dashboard — appointments per day, avg wait time, bed occupancy %
- [ ] Export reports (PDF invoices, staff rotas)
- [ ] Print-friendly EMR view

### Performance
- [ ] API response caching (Redis) for provider search results
- [ ] Database indexes on high-frequency query columns
- [ ] Image optimisation for prescription uploads
- [ ] Load testing (k6) — target: 500 concurrent users

### Security
- [ ] Penetration test on auth flows
- [ ] Column-level encryption for EMR sensitive fields
- [ ] S3 bucket policy audit (private buckets, signed URLs only)
- [ ] Rate limiting on all public endpoints
- [ ] NDPR compliance review

### Launch
- [ ] Onboard 50 providers in Abuja manually
- [ ] Onboard 10 pharmacies with live stock
- [ ] Onboard 3 pilot hospitals for HMS
- [ ] Set up status page (statuspage.io or similar)
- [ ] Error monitoring (Sentry)
- [ ] Analytics (PostHog)
- [ ] Soft launch to 100 beta users
- [ ] Iterate on feedback for 2 weeks
- [ ] Public launch

---

## Backlog (Post-Launch)

- [ ] Teleconsult video integration (Daily.co or Whereby API)
- [ ] Insurance provider API integration
- [ ] Multi-language support (Yoruba, Hausa, Igbo)
- [ ] Expand to Lagos
- [ ] Provider mobile app (instead of web dashboard for doctors on rounds)
- [ ] AI assistant in consumer app ("Ask Healthbridge anything")
- [ ] Referral system (doctor refers patient to specialist within platform)
- [ ] Subscription tier for consumers (health history export, unlimited triage, priority booking)
- [ ] B2B corporate wellness plan integration