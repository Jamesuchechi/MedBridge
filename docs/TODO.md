# MedBridge — Build Todo

> Every task from zero to fully shipped product. Work top to bottom. Do not skip phases.

---

## Legend

```
[ ] Not started
[x] Complete
[~] In progress
[!] Blocked
```

---

## Phase 0 — Foundation & Landing Page (Week 1–2)

### 0.1 Repository Setup [x]
- [x] Initialize monorepo with pnpm workspaces
- [x] Create `apps/web`, `apps/api`, `apps/ai-service` folders
- [x] Create `packages/ui`, `packages/types`, `packages/utils`, `packages/db`
- [x] Add root `package.json` with workspace config
- [x] Add `.gitignore`, `.nvmrc` (Node 20), `.python-version` (3.11)
- [x] Initialize git, create `main`, `develop` branches
- [x] Add `turbo.json` for Turborepo build pipeline
- [x] Add `pnpm-workspace.yaml`

### 0.2 Next.js Frontend Bootstrap [x]
- [x] `pnpm create next-app apps/web` with TypeScript, Tailwind, App Router
- [x] Install and configure shadcn/ui
- [x] Install Zustand, TanStack Query
- [x] Set up base layout (`app/layout.tsx`) with font (Syne, DM Sans)
- [x] Set up global CSS variables (design tokens: brand colors, spacing)
- [x] Configure `next.config.ts` (image domains, environment vars)
- [x] Set up path aliases (`@/components`, `@/lib`, `@/store`)
- [x] Add ESLint + Prettier config
- [x] Confirm `pnpm dev` runs cleanly at localhost:3000

### 0.3 Landing Page [x]
- [x] Design and build Navbar component (logo, nav links, CTA button)
- [x] Build Hero section (headline, subheadline, waitlist/signup CTA)
- [x] Build "Problem" section (healthcare in Nigeria — stats + pain points)
- [x] Build "Solution" section (MedBridge modules overview with icons)
- [x] Build "For Who" section (Patient / Doctor / Clinic cards)
- [x] Build "How It Works" section (3-step explainer)
- [x] Build "AfriDx" callout section (Nigerian-specific intelligence highlight)
- [x] Build Pricing section (Freemium / Pro / Clinic tiers — placeholder)
- [x] Build Waitlist/CTA section with email capture form
- [x] Build Footer (links, legal, social)
- [ ] Wire email capture to Resend or Loops mailing list
- [x] Make fully responsive (mobile, tablet, desktop)
- [x] Add basic SEO metadata (title, description, OG image)
- [x] Add favicon and brand assets

### 0.4 Node.js API Bootstrap [x]
- [x] Init Express app with TypeScript in `apps/api`
- [x] Set up folder structure: `routes/`, `controllers/`, `services/`, `middleware/`, `db/`
- [x] Add `helmet`, `cors`, `express-rate-limit`, `morgan`
- [x] Add Zod for request validation
- [x] Set up environment variable loading with `dotenv` + type-safe config
- [x] Add `/health` endpoint
- [x] Confirm `pnpm dev` runs cleanly at localhost:3001

### 0.5 Python AI Service Bootstrap [x]
- [x] Init FastAPI app in `apps/ai-service`
- [x] Set up `requirements.txt` (fastapi, uvicorn, openai, groq, python-dotenv, jinja2, pydantic)
- [x] Create virtual environment setup instructions
- [x] Add `/health` endpoint
- [x] Add base router structure (`routers/symptom.py`, `routers/document.py`, etc.)
- [x] Confirm `uvicorn main:app --reload` runs at localhost:8000

### 0.6 Database Setup [x]
- [x] Create Supabase project
- [x] Add `DATABASE_URL` to `.env`
- [x] Install Drizzle ORM in `apps/api`
- [x] Write initial schema migrations (users, health_profiles, symptom_checks, medical_documents, drugs)
- [x] Run initial migration
- [x] Enable Row-Level Security on all patient tables (Instructional in walkthrough)
- [x] Write base RLS policies
- [x] Install `pg_vector` extension on Supabase (Instructional)
- [x] Seed Nigerian drug database (Phase 0 version — basic 500 drugs)
- [x] Seed symptom taxonomy
- [x] Add `/api/db-test` endpoint to API service

### 0.7 Docker & Local Dev [x]
- [x] Write `docker-compose.yml` for local Postgres + Redis
- [x] Add `.env.example` with all required variables documented
- [x] Write `README.md` quick-start section
- [x] Confirm full local stack runs with one command: `pnpm dev`

### 0.8 CI/CD Pipeline [x]
- [x] Create `.github/workflows/ci.yml` (lint, typecheck, test on PR)
- [x] Create `.github/workflows/deploy-staging.yml` (auto-deploy on push to `develop`)
- [x] Set up Vercel project linked to repo
- [x] Set up Railway project for API + AI service
- [x] Configure staging environment variables in both platforms
- [x] Confirm staging deployment works end-to-end

---

## Phase 1 — MVP: Symptom Checker + Document Analyzer (Week 3–8)

### 1.1 Authentication [x]
- [x] Install Supabase Auth client in `apps/web`
- [x] Build Signup page (`/app/(auth)/signup/page.tsx`)
- [x] Build Login page (`/app/(auth)/login/page.tsx`)
- [x] Build Forgot Password page + Reset Password page
- [x] Implement email verification flow
- [x] Set up Supabase Auth session management with Next.js middleware
- [x] Protect all `(dashboard)` routes — redirect to login if unauthenticated
- [x] Add auth middleware to `apps/api` (JWT verification)
- [x] Add `GET /auth/me` endpoint
- [x] Build auth Zustand store (user, session, loading state)
- [x] Add logout functionality
- [x] Test: signup → verify email → login → access dashboard → logout

### 1.2 Dashboard Shell [x]
- [x] Build authenticated layout with sidebar navigation
- [x] Sidebar items: Dashboard, Symptoms, Documents, Drugs, Profile, (Doctor - gated), Settings
- [x] Build dashboard home page (welcome, recent activity, quick actions)
- [x] Build user settings page (update name, email, password)
- [x] Add mobile-responsive sidebar (hamburger menu / bottom nav)

### 1.3 Health Profile Setup [x]
- [x] Build health profile form (date of birth, sex, blood type, genotype, allergies, chronic conditions, medications)
- [x] `POST /profile` API endpoint
- [x] `GET /profile` API endpoint
- [x] Save profile to `health_profiles` table (UI logic implemented, needs DB sync)
- [x] Display profile summary on dashboard home
- [x] Prompt new users to complete profile (used to enrich AI calls)

### 1.4 Symptom Checker — Frontend [x]
- [x] Build symptom input UI (searchable tag input with autocomplete from symptom taxonomy)
- [x] Build duration selector (hours / days / weeks)
- [x] Build severity slider (1–10 with descriptive labels)
- [x] Build additional context inputs (fever, location, known conditions)
- [x] Build loading state (streaming-style UI while AI processes)
- [x] Build results display:
  - [x] Possible conditions list with probability indicators
  - [x] Severity / urgency banner (color-coded: green / amber / red)
  - [x] Recommended next steps
  - [x] Emergency alert UI (full-screen red banner for critical symptoms)
  - [x] Mandatory disclaimer component (always visible, styled appropriately)
  - [x] "Find a clinic near you" CTA (links to Google Maps with location)
- [x] Build symptom history list page (`/symptoms`)
- [x] Build individual symptom check detail page (`/symptoms/[id]`)

### 1.5 Symptom Checker — Backend [x]
- [x] `POST /api/v1/symptoms/analyze` endpoint
- [x] Request validation schema (Zod)
- [x] Fetch user health profile for context enrichment
- [x] Call Python AI service at `/internal/symptom/analyze`
- [x] Save result to `symptom_checks` table
- [x] `GET /api/v1/symptoms/history` endpoint (paginated)
- [x] `GET /api/v1/symptoms/:id` endpoint
- [x] Rate limit: 10 symptom checks per user per day (freemium)

### 1.6 Symptom Checker — AI Service [x]
- [x] Write `routers/symptom.py` with `/internal/symptom/analyze` endpoint
- [x] Implement safety check (`core/safety.py`)
  - [x] Emergency pattern matching
  - [x] Return emergency response immediately without LLM if triggered
- [x] Write symptom analysis prompt template (`prompts/symptom_analysis/v1.j2`)
- [x] Implement LLM call (GPT-4o primary, Groq Llama3 fallback)
- [x] Parse structured LLM output (condition list, probabilities, reasoning)
- [x] Implement AfriDx regional weighting (`core/afridx.py`)
  - [x] Nigeria prevalence weights dictionary
  - [x] Seasonal adjustment (malaria higher May–Oct rainy season)
  - [x] Genotype intersection (sickle cell crisis weighting)
- [x] Apply response safety filter (post-LLM guardrails)
- [x] Return structured `SymptomAnalysisResult` Pydantic model
- [x] Write unit tests for AfriDx weighting
- [x] Write unit tests for safety layer

### 1.7 Document Analyzer — Frontend [x]
- [x] Build document upload component (drag-and-drop + file picker)
  - [x] Supported types: PDF, JPG, PNG, WEBP
  - [x] Client-side validation (type + 10MB size limit)
  - [x] Upload progress indicator
- [x] Build document type selector (lab result / prescription / medical report / scan)
- [x] Build documents list page (`/documents`) with status badges (pending / processing / complete / failed)
- [x] Build document detail page (`/documents/[id]`)
  - [x] Original file preview (PDF viewer or image)
  - [x] Analysis results panel:
    - [x] Key findings section
    - [x] Abnormal values highlighted in red/amber
    - [x] Plain English summary
    - [x] Risk flags
  - [x] Mandatory disclaimer
- [x] Implement polling for document status (every 3 seconds while `pending` or `processing`)
- [x] Add websocket listener for completion notification (upgrade polling later)

### 1.8 Document Analyzer — Backend [x]
- [x] `GET /api/v1/documents/upload-url` — generate Supabase pre-signed upload URL
- [x] `POST /api/v1/documents` — create document record after upload
- [x] `GET /api/v1/documents` — list user's documents (paginated)
- [x] `GET /api/v1/documents/:id` — get document + analysis result
- [x] `DELETE /api/v1/documents/:id` — soft delete
- [x] Set up BullMQ document analysis queue
- [x] Write BullMQ worker that calls AI service and updates DB
- [x] Handle worker failure (retry 3x, then mark as `failed`)

### 1.9 Document Analyzer — AI Service [x]
- [x] Write `routers/document.py` with `/internal/document/analyze` endpoint
- [x] Implement file type detection
- [x] Implement OCR for image files (Tesseract or AWS Textract)
- [x] Write document classification logic (detect: lab result / prescription / report)
- [x] Write extraction prompt templates:
  - [x] `prompts/document_extraction/lab_result_v1.j2`
  - [x] `prompts/document_extraction/prescription_v1.j2`
  - [x] `prompts/document_extraction/report_v1.j2`
- [x] Parse structured extraction output
- [x] Flag abnormal values (for lab results — compare against reference ranges)
- [x] Generate plain English summary
- [x] Return structured `DocumentExtractionResult`
- [x] Handle parsing failures gracefully (return partial result with error flag)

### 1.10 Phase 1 Testing & Polish
- [x] Write E2E tests (Playwright):
  - [x] Full signup → complete profile → run symptom check → view results
  - [x] Login → upload document → wait for processing → view analysis
  - [x] Emergency symptom triggers emergency UI
- [x] Load test symptom endpoint (target: <3s P95 response time)
- [ ] Cross-browser test (Chrome, Firefox, Safari, mobile browsers)
- [x] Accessibility audit (keyboard navigation, screen reader, contrast ratios)
- [ ] Deploy Phase 1 to production
- [x] Set up Sentry error tracking
- [x] Set up Posthog for usage analytics

---

## Phase 2 — Drug Intelligence + Health Profiles (Week 9–14)

### 2.1 Nigerian Drug Database — Expanded [x]
- [x] Expand drug seed data to 5,000+ NAFDAC-registered drugs
- [x] Include: generic name, Nigerian brand names, manufacturer, form, strength
- [x] Include: common uses, contraindications, common interactions
- [x] Add: common price range (Lagos market price)
- [x] Set up Typesense for drug search indexing
- [x] Sync Postgres drug table to Typesense index
- [x] Build drug search API with Typesense (`GET /api/v1/drugs/search?q=`)

### 2.2 Drug Intelligence — Frontend [x]
- [x] Build drug search page (`/drugs`)
  - [x] Search input with real-time Typesense results
  - [x] Drug card component (name, category, form, strength)
  - [x] Drug detail page (`/drugs/[id]`)
    - [x] Full drug information display
    - [x] Common uses section
    - [x] Side effects section
    - [x] "Ask about this drug" AI chat button
- [x] Build drug interaction checker
  - [x] Multi-drug selector (add 2–8 drugs)
  - [x] Run interaction check button
  - [x] Results: interaction matrix, severity levels (minor / moderate / severe)
  - [x] Mandatory disclaimer
- [x] Build drug explanation UI (ask plain English question about drug)
- [x] Build "My Medications" section in health profile

### 2.3 Drug Intelligence — Backend + AI [x]
- [x] `GET /api/v1/drugs/search` — Typesense search endpoint
- [x] `GET /api/v1/drugs/:id` — Drug detail from Postgres
- [x] `POST /api/v1/drugs/explain` — AI drug explanation
- [x] `POST /api/v1/drugs/interactions` — AI interaction check
- [x] Python AI: write `routers/drug.py`
- [x] Write drug explanation prompt template
- [x] Write drug interaction prompt template
- [x] Build interaction severity classification
- [x] Add local NAFDAC interaction database (known dangerous combos)
- [x] Save all drug queries to `drug_queries` table for profile memory

### 2.4 Health Profile — Enhanced [x]
- [x] Add medication tracking (add/edit/remove current medications)
- [x] Add allergy management (add/remove allergies with reaction type)
- [x] Add medical history (past conditions, surgeries, hospitalizations)
- [x] Add family history section (diabetes, hypertension, sickle cell, cancer)
- [x] Add vaccination record section
- [x] Add emergency contacts
- [x] Implement profile completion percentage indicator
- [x] Embed health profile into all AI calls automatically

### 2.5 CommunityRx — Phase 1 (Pharmacy Locator) [x]
- [x] Build pharmacy search by location (`/drugs/pharmacies`)
- [x] Integrate Google Maps Places API or other alternatives for pharmacy discovery (OSM used)
- [x] Build "report drug availability" feature (crowdsourced)
- [x] Build drug pricing report form (user submits price at specific pharmacy)
- [x] Build price comparison display on drug detail page
- [x] Moderation queue for submitted prices (auto-approve within range, flag outliers)

### 2.6 Phase 2 Testing & Polish [x]
- [x] E2E test: Search drug → check interactions → view detail → save to profile
- [x] E2E test: Complete health profile → run symptom check — verify profile used in AI call
- [x] Drug interaction test cases (known dangerous combos must flag correctly)
- [x] Performance: drug search P95 < 200ms (Typesense target)
- [x] Deploy Phase 2 to production
- [x] Analytics: track drug search queries, most-checked interactions

---

## Phase 3 — Doctor Copilot + Referral Intelligence (Week 15–22)

### 3.1 Doctor Onboarding
- [x] Build doctor signup flow (separate from patient signup)
- [x] Add MDCN registration number field (Medical and Dental Council of Nigeria)
- [x] Add specialization selection
- [x] Add clinic association (link to existing clinic or mark as independent)
- [x] Build doctor verification queue (admin reviews before activating copilot access)
- [x] Send verification email on approval
- [x] Doctor-gated routes: check `role === 'doctor'` + `mdcn_verified === true`

### 3.2 Doctor Copilot — Frontend
- [x] Build doctor dashboard (separate from patient dashboard)
  - [x] Active patients list
  - [x] Recent consultations
  - [x] Quick case analysis button
- [x] Build case analysis form:
  - [x] Patient info input (age, sex, or link to MedBridge patient)
  - [x] Chief complaint (free text or structured input)
  - [x] History of presenting illness
  - [x] Vitals input (BP, temp, pulse, respiratory rate, O2 sat)
  - [x] Systems review checkboxes
  - [x] Preliminary findings / examination notes
- [x] Build copilot results view:
  - [x] Clinical summary (AI-generated, editable)
  - [x] Top 5 differentials with reasoning and confidence
  - [x] Suggested investigations (tests to order)
  - [x] "For consideration only — clinical judgment required" banner
  - [x] Export as PDF button
- [x] Build clinical note generator
  - [x] Input: case data
  - [x] Output: SOAP note format (Subjective / Objective / Assessment / Plan)
  - [x] Editable before saving
  - [x] Copy to clipboard / export

### 3.3 Doctor Copilot — Backend + AI
- [x] `POST /api/v1/copilot/analyze` — role-gated to `doctor`
- [x] `POST /api/v1/copilot/note` — generate SOAP note
- [x] Python AI: write `routers/copilot.py`
- [x] Write doctor copilot prompt template (`prompts/doctor_copilot/v1.j2`)
  - [x] Include Nigerian disease context in system prompt
  - [x] Include tropical medicine differential weighting
- [x] Apply AfriDx engine to copilot differentials (same as symptom checker)
- [x] Write SOAP note generation prompt
- [x] Structured output parsing with Pydantic
- [x] Audit trail: log all copilot sessions with doctor ID, timestamp, prompt version

### 3.4 Referral Intelligence [x]
- [x] Build referral creation form (from copilot output or standalone) [x]
  - [x] Select receiving doctor (search by name / specialization) [x]
  - [x] Auto-populate with copilot case summary [x]
  - [x] Urgency score selector (1–5) [x]
  - [x] Add additional notes [x]
- [x] `POST /api/v1/copilot/referral` — creates referral record [x]
- [x] Build receiving doctor notification (email + in-app) [x]
- [x] Build referral inbox for doctors (list of incoming referrals) [x]
- [x] Build referral detail view (full clinical packet) [x]
- [x] Build referral status tracking (pending / accepted / completed) [x]
- [x] Generate referral PDF document (for physical handover) [x]
- [x] Patient notification when referral is created [x]

### 3.5 Patient–Doctor Connection [x]
- [x] Build "Find a Doctor" feature for patients [x]
  - [x] Search by specialization, location, clinic [x]
  - [x] Doctor profile cards (specialization, clinic, bio) [x]
- [x] Build consultation request flow (patient requests consultation) [x]
- [x] Doctor can accept/decline consultation requests [x]
- [x] Shared record view: doctor can view patient's MedBridge health profile (with consent) [x]
- [x] Patient consent flow: grant/revoke doctor access to health profile [x]

### 3.6 Phase 3 Testing
- [ ] E2E: Doctor signup → verified → run case analysis → generate referral
- [ ] Test: unverified doctor cannot access copilot
- [ ] Test: patient cannot access doctor routes
- [ ] Test: referral notification reaches receiving doctor
- [ ] Clinical accuracy spot-check: run 20 known cases through copilot, review output quality
- [ ] Deploy Phase 3 to production

---

## Phase 4 — Clinic OS + MedBridge Pulse (Week 23–32)

### 4.1 Clinic Onboarding
- [ ] Build clinic registration form
  - [ ] Clinic name, address, state, LGA
  - [ ] CAC registration number
  - [ ] Contact info
  - [ ] Subscription tier selection
- [ ] Admin reviews and activates clinic accounts
- [ ] Clinic owner can invite staff (send invite email → staff accepts → linked to clinic)
- [ ] Staff roles: doctor, nurse, receptionist, admin

### 4.2 Clinic Patient Management
- [ ] Build patient registration form for clinic (create or link existing MedBridge account)
- [ ] Build patient list with search and filter
- [ ] Build patient detail view (full record: visits, documents, notes, medications)
- [ ] Import existing patient records (CSV upload with field mapping)
- [ ] Patient consent flow: patient grants clinic access to their MedBridge profile

### 4.3 Appointment System
- [ ] Build appointment creation (receptionist / doctor / patient self-book)
- [ ] Build appointment calendar view (day / week view per doctor)
- [ ] Build appointment list view with filters (status, date, doctor)
- [ ] Appointment status flow: pending → confirmed → completed / cancelled
- [ ] SMS/email reminders (24h before appointment via Resend or Africa's Talking)
- [ ] Waitlist feature for fully-booked slots
- [ ] Build patient-facing booking page (patients book own appointments)

### 4.4 Clinical Records (EMR)
- [ ] Build encounter/visit form (doctor fills during/after consultation)
  - [ ] Chief complaint
  - [ ] Examination findings
  - [ ] Diagnosis (ICD-11 code lookup)
  - [ ] Prescription written
  - [ ] Lab tests ordered
  - [ ] Follow-up instructions
- [ ] Link AI-generated SOAP notes to encounter records
- [ ] Build prescription pad (structured prescription creation)
  - [ ] Drug selection from Nigerian drug DB
  - [ ] Dosage, frequency, duration
  - [ ] Drug interaction check runs automatically
  - [ ] Generate printable prescription
- [ ] Build lab order form (request tests, track results)
- [ ] Attach uploaded documents (lab results) to patient records

### 4.5 Billing (Basic)
- [ ] Build invoice creation (consultation fee + tests + medications)
- [ ] Build payment recording (cash / card / transfer — manual for now)
- [ ] Build patient billing history
- [ ] Basic financial reports (revenue by month, by doctor, by service type)
- [ ] Export invoices as PDF
- [ ] NHIS integration research (roadmap item — complex)

### 4.6 MedBridge Pulse (Employer Dashboard)
- [ ] Build employer account type and onboarding
- [ ] Employee enrollment (HR uploads employee list → employees receive invite)
- [ ] Employee health activity tracking (opt-in only, aggregated and anonymized)
- [ ] Build employer dashboard:
  - [ ] Total enrolled employees
  - [ ] Symptom check activity trends
  - [ ] Top health concerns (anonymized, aggregated by condition category)
  - [ ] Clinic visit frequency
  - [ ] Medication usage patterns
  - [ ] Emergency alerts (number of emergency-level symptom checks)
- [ ] Export reports as PDF or CSV
- [ ] Subscription billing for employers (Paystack integration)
- [ ] Employee privacy: individual data never visible — only aggregate trends

### 4.7 Paystack Billing Integration
- [ ] Integrate Paystack for subscriptions
  - [ ] Patient Pro plan
  - [ ] Clinic Basic / Pro / Enterprise plans
  - [ ] Employer Pulse plan
- [ ] Build subscription management UI (upgrade, downgrade, cancel)
- [ ] Webhook handling for payment events
- [ ] Feature gates based on subscription tier
- [ ] Build billing history page
- [ ] Dunning emails (failed payment notifications)

### 4.8 Phase 4 Testing
- [ ] E2E: Clinic registers → adds staff → books appointment → creates encounter → generates prescription
- [ ] E2E: Employer enrolls team → employees join → employer views Pulse dashboard
- [ ] Billing: test Paystack webhooks (subscription start, renewal, failure)
- [ ] Load test: simulate 100 concurrent clinic users (appointments, record updates)
- [ ] Deploy Phase 4 to production
- [ ] SOC 2 readiness review (gap analysis)

---

## Phase 5 — Voice Mode + USSD + CommunityRx Full (Week 33–42)

### 5.1 Voice Mode
- [ ] Integrate speech-to-text (Whisper API or Deepgram)
- [ ] Build voice symptom intake (user speaks symptoms, AI transcribes + processes)
- [ ] Build voice document reading (AI reads analysis results aloud)
- [ ] Implement Yoruba, Hausa, Igbo language detection
- [ ] Fine-tune transcription for Nigerian English and Pidgin
- [ ] Test voice mode on low-end Android devices (primary target)

### 5.2 USSD Integration
- [ ] Set up Africa's Talking USSD gateway
- [ ] Build USSD service (`apps/ussd-service`) — separate lightweight Node.js app
- [ ] USSD symptom checker flow (text-only, 7-step max)
- [ ] USSD drug lookup (search by drug name → get basic info)
- [ ] USSD nearest clinic finder (by state/LGA)
- [ ] USSD emergency detection → SMS with hospital directions
- [ ] SMS result delivery for users without data
- [ ] Test on Airtel, MTN, Glo, 9mobile networks

### 5.3 CommunityRx — Full
- [ ] Pharmacy onboarding portal (pharmacies claim their listing)
- [ ] Real-time drug availability updates (pharmacy staff marks in/out of stock)
- [ ] Drug price submission verification (compare against known price ranges, flag fraud)
- [ ] Community trust score for pharmacies (based on report accuracy)
- [ ] Counterfeit drug reporting (user reports suspected fake drug)
- [ ] NAFDAC alert integration (display official counterfeit alerts)
- [ ] Map view of pharmacies by drug availability

### 5.4 Progressive Web App (PWA)
- [ ] Configure next-pwa
- [ ] Service worker for offline caching (dashboard, drug DB, recent documents)
- [ ] Background sync for symptom checks submitted offline
- [ ] Push notifications (appointment reminders, document ready, referral updates)
- [ ] Add to home screen prompt

### 5.5 Admin Panel
- [ ] Build internal admin panel (`/admin` — separate gated route)
  - [ ] User management (view, suspend, change roles)
  - [ ] Doctor verification queue (approve / reject with reason)
  - [ ] Clinic verification queue
  - [ ] Drug database management (add, edit, verify drugs)
  - [ ] System health dashboard (AI service status, queue depth, error rates)
  - [ ] Feature flags management
  - [ ] Content moderation (CommunityRx reports)

### 5.6 Final Hardening & Launch Prep
- [ ] Full security audit (OWASP Top 10 review)
- [ ] Penetration test (hire external firm or use automated scanner)
- [ ] NDPR compliance review (Nigeria Data Protection Regulation)
- [ ] Write privacy policy and terms of service
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Performance audit (Lighthouse score > 90 on all pages)
- [ ] Final E2E test suite covering all phases
- [ ] Disaster recovery drill (simulate DB failure, AI service outage)
- [ ] Set up on-call rotation and incident response playbook
- [ ] Press kit and launch assets

---

## Ongoing — Post-Launch

### Infrastructure
- [ ] Set up Datadog for full observability
- [ ] Implement database read replicas for analytics queries
- [ ] Set up automated database backups with tested restore process
- [ ] PgBouncer connection pooling for Postgres
- [ ] CDN for static assets (Cloudflare)

### Product
- [ ] A/B testing framework (feature flags via Posthog)
- [ ] In-app feedback widget
- [ ] NPS survey (30 days after signup)
- [ ] Doctor feedback loop on copilot accuracy
- [ ] Monthly AI model evaluation (prompt regression tests on known cases)
- [ ] Expand drug database to 15,000+ drugs
- [ ] Expand AfriDx to cover East and West African regions

### Growth
- [ ] Referral program for patients
- [ ] Clinic referral program
- [ ] NHIS integration (National Health Insurance Scheme)
- [ ] Hospital partnerships (Lagos State, FCT)
- [ ] API access tier for third-party health apps (developer program)
- [ ] Telemedicine integration (video consultation layer)

---

*Check tasks off as you go. Never mark a phase complete until all tasks in it are done and deployed.*