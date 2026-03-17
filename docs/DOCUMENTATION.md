# Healthbridge — Full Documentation

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles](#2-user-roles)
3. [Consumer Portal — Features](#3-consumer-portal--features)
4. [Hospital Portal — Features](#4-hospital-portal--features)
5. [API Reference](#5-api-reference)
6. [Data Models](#6-data-models)
7. [AI Triage Engine](#7-ai-triage-engine)
8. [Notification System](#8-notification-system)
9. [File Handling](#9-file-handling)
10. [Environment Variables](#10-environment-variables)
11. [Error Handling](#11-error-handling)
12. [Testing](#12-testing)
13. [Contribution Guidelines](#13-contribution-guidelines)

---

## 1. Product Overview

Healthbridge is a unified healthcare platform with two portals sharing one backend:

**Consumer portal** — helps everyday users navigate healthcare from first symptom to medication. Core features: AI symptom triage, verified provider discovery, appointment booking, medication stock finder, prescription scanner, personal health history.

**Hospital portal (HMS)** — gives hospitals and clinics a complete management system. Core features: EMR, appointment and ward management, pharmacy inventory, billing and insurance, staff shift scheduling, lab requests and results.

The two portals are connected by shared data: a booking made in the consumer portal appears instantly in the hospital's appointment system; a prescription added to an EMR appears in the consumer's health history; a lab result uploaded by a lab technician sends an automatic notification to the patient.

---

## 2. User Roles

| Role | Portal | Description |
|---|---|---|
| `consumer` | Consumer | Registered patient/user |
| `hospital_admin` | Hospital | Full access to all hospital features, manages staff |
| `doctor` | Hospital | EMR, appointments, lab requests, own schedule |
| `nurse` | Hospital | Ward management, patient view, own schedule |
| `pharmacist` | Hospital | Pharmacy stock management |
| `lab_tech` | Hospital | Lab request queue, result upload |
| `billing_officer` | Hospital | Invoice creation, insurance claims |

---

## 3. Consumer Portal — Features

### 3.1 Symptom Triage

The triage flow is a conversational AI session that determines the appropriate care level for the user's symptoms.

**Care levels returned:**
- `self_care` — rest, hydration, OTC medication. No provider needed.
- `gp` — book a general practitioner within 1–2 days.
- `urgent_care` — see a doctor today. Book an urgent slot.
- `emergency` — call emergency services or go to ER immediately.

**How it works:**
1. User starts a session (`POST /triage/start`)
2. Claude asks 3–7 follow-up questions about symptoms, duration, severity, and context
3. Each answer is submitted via `POST /triage/answer`
4. When enough information is gathered, Claude returns a structured result
5. The triage result is stored and used to filter provider recommendations

**Red flag rules (hardcoded, never AI-overridden):**
Any of the following symptoms immediately return `emergency` regardless of context:
- Chest pain radiating to arm, jaw, or back
- Sudden severe headache ("worst headache of my life")
- Difficulty breathing or shortness of breath at rest
- Sudden weakness or numbness on one side of the body
- Sudden vision loss or double vision
- Loss of consciousness or confusion
- Signs of anaphylaxis (throat swelling, hives, dizziness after exposure)
- Uncontrolled bleeding
- Suspected overdose

**Disclaimer:** Triage output is care-level guidance only, never a medical diagnosis. Users acknowledge this at account creation.

### 3.2 Provider Directory

Providers are doctors, general practitioners, and specialists listed on the platform. Each provider is linked to one or more hospitals.

**Trust score** is a weighted composite of:
- Repeat visits (same user books again): 35%
- Verified review rating: 30%
- Referral rate (other providers refer to them): 20%
- Response/confirmation time: 15%

Score is recalculated asynchronously after each review or booking event.

**Search filters:** speciality, location radius, consultation type (in-person/teleconsult), consultation fee range, language, availability.

### 3.3 Appointment Booking

Consumers book appointments through provider profiles. Booking requires:
- Selected date/time slot
- Appointment type (in-person or teleconsult)
- Optional: triage session ID (pre-fills reason for visit)

On booking, the hospital portal receives a real-time WebSocket event and the appointment appears in their system with status `pending`. Hospital staff confirm it (status → `confirmed`). Consumer receives SMS + push confirmation.

**Cancellation:** Consumer can cancel up to 2 hours before appointment time. Hospital can cancel at any time with a mandatory reason.

### 3.4 Reviews

Reviews are unlocked only after an appointment reaches `completed` status. This prevents fake or pre-visit reviews.

Review fields:
- Overall rating (1–5 stars)
- Did they listen to you? (boolean)
- Was the visit rushed? (boolean)
- Was the diagnosis/advice helpful? (boolean)
- Free-text comment (optional, max 500 chars)

Reviews are public on the provider's profile. The free-text comment is moderated (profanity filter + manual review queue for flagged items).

### 3.5 Medication Finder

**Search** accepts brand name or generic name (partial match). Returns matching medications with pharmacy stock results sorted by distance.

**Stock results** show per pharmacy:
- Distance from user
- Current price (and generic alternative price if available)
- Last verified timestamp
- "Still in stock?" confirmation button (crowdsource)

**Prescription scanner:** User photos a handwritten or printed prescription. Google Vision API extracts text. The system identifies medication names, dosages, and quantities using a regex + named entity approach. Results auto-populate the search. Raw extracted text is shown so user can verify before searching.

### 3.6 Health History

Personal timeline of:
- Completed triage sessions (date, care level, care category)
- Completed appointments (date, provider, hospital)
- EMR prescriptions shared by hospitals (drug, dosage, duration)
- Lab results (test name, date, download link)
- Medication searches (for quick re-search)

Health history is private to the consumer. Sharing with a provider requires explicit user action (generates a one-time access link).

---

## 4. Hospital Portal — Features

### 4.1 Appointment Management

The hospital appointment view shows all bookings for the hospital, filterable by date, provider, and status.

**Appointment lifecycle:**
```
pending → confirmed → completed
                   → cancelled (by either party)
```

Confirmed appointments show in the provider's daily schedule. Completed appointments unlock EMR entry and consumer review.

### 4.2 EMR (Electronic Medical Records)

Each completed appointment can have an EMR record created by the attending doctor. EMR contains:
- Chief complaint
- Diagnosis (free text — not a structured code in MVP)
- Treatment plan
- Prescriptions (array: drug name, dosage, frequency, duration, notes)
- Vitals (blood pressure, temperature, weight, height, pulse)
- Follow-up instructions

When a prescription is saved in an EMR, it is automatically pushed to the patient's consumer health history (if the patient has a Healthbridge consumer account linked to their hospital record).

EMR records are immutable after 24 hours. Amendments after that require a new record with a reference to the original.

### 4.3 Ward Management

**Wards** are defined per hospital with a total bed count. The ward overview shows real-time occupied/available beds.

**Admissions** link a patient to a ward and provider. Required fields: patient, ward, admitting doctor, admission reason. Optional: expected discharge date.

**Discharge** marks the admission as complete, frees the bed, and prompts for a discharge summary.

Bed availability is broadcast via WebSocket to all connected hospital staff dashboards.

### 4.4 Pharmacy & Inventory

Hospital pharmacists manage drug stock through a simple inventory interface.

**Stock entry:** medication name (linked to medications table), quantity, unit price, expiry date, batch number.

**Low-stock alerts:** Each medication can have a minimum threshold. A background job checks every 6 hours and sends in-app alerts to pharmacists when stock falls below threshold.

**Consumer integration:** Hospitals can opt in to share their pharmacy stock with the consumer medication finder. Opted-in stock appears in consumer search results attributed to the hospital/clinic's name and address.

### 4.5 Lab Requests & Results

**Lab request flow:**
1. Doctor creates a lab request linked to an appointment (`POST /hospital/lab/requests`)
2. Lab technician sees the request in their queue
3. Lab tech processes the test and uploads the result (PDF or image) to S3
4. System sends push + SMS notification to patient
5. Patient views and downloads result from consumer health history

Result PDFs are stored in a private S3 bucket. Access is via signed URL with 1-hour expiry.

### 4.6 Billing & Insurance

**Invoice creation:** Billing officer creates an invoice linked to an appointment. Line items are freeform (consultation fee, tests, drugs, procedures). Total is auto-calculated.

**Invoice statuses:**
```
draft → issued → paid
              → insurance_submitted → settled
```

**Insurance:** In MVP, insurance claim tracking is manual — the billing officer records the claim ID from their external insurance platform and updates the status. Full insurance API integration is a post-launch feature.

Patients can view their own invoices in the consumer app (payment via external method in MVP — direct in-app payment is post-launch).

### 4.7 Staff Scheduling

**Shift creation:** Admin creates shifts for staff with start time, end time, and department. Shifts can be created individually or as recurring weekly patterns.

**Shift swaps:** Staff can request a swap with a colleague. Both must confirm. Admin is notified and can reject if it creates a coverage gap.

**Rota view:** Week-view calendar per department. Each column is a staff member, each row is a time slot. Colour-coded by status (scheduled, active, completed, swapped).

Staff can view their own upcoming shifts from any device. Shift start reminder sent via SMS/push 1 hour before.

---

## 5. API Reference

### Base URL
```
Development: http://localhost:3000/api/v1
Production:  https://api.healthbridge.app/api/v1
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Response format
All responses follow this shape:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 42 }   // pagination where applicable
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email is required",
    "details": [ ... ]   // Zod validation details where applicable
  }
}
```

### Consumer Endpoints

#### `POST /auth/register`
```json
// Request
{
  "email": "user@example.com",
  "phone": "+2348012345678",
  "full_name": "Amaka Obi",
  "date_of_birth": "1990-05-14",
  "gender": "female"
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "full_name": "..." },
    "token": "jwt_token"
  }
}
```

#### `POST /triage/start`
```json
// Request
{ "initial_symptom": "I have a severe headache and feel nauseous" }

// Response 200
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "question": "How long have you had this headache?",
    "options": ["Less than 1 hour", "1–6 hours", "More than 6 hours", "A few days"]
  }
}
```

#### `POST /triage/answer`
```json
// Request
{
  "session_id": "uuid",
  "answer": "Less than 1 hour"
}

// Response 200 — more questions
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "question": "On a scale of 1–10, how severe is the pain?",
    "options": null   // null means free text input
  }
}

// Response 200 — result ready
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "result": {
      "care_level": "urgent_care",
      "care_category": "neurological",
      "reasoning": "A sudden severe headache with nausea that started within the last hour warrants prompt medical attention today.",
      "emergency": false
    }
  }
}
```

#### `GET /providers?lat=9.0765&lng=7.3986&speciality=gp&radius=5000`
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "Dr. Chidi Okeke",
      "speciality": "General Practitioner",
      "hospital": { "id": "uuid", "name": "Garki General Hospital", "address": "..." },
      "trust_score": 4.3,
      "consultation_fee": 5000,
      "distance_m": 1200,
      "available_for_teleconsult": true,
      "languages": ["English", "Igbo"],
      "next_available_slot": "2026-03-15T09:00:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1 }
}
```

#### `POST /providers/:id/book`
```json
// Request
{
  "scheduled_at": "2026-03-15T09:00:00Z",
  "type": "in_person",
  "triage_session_id": "uuid"   // optional
}

// Response 201
{
  "success": true,
  "data": {
    "appointment": {
      "id": "uuid",
      "status": "pending",
      "scheduled_at": "2026-03-15T09:00:00Z",
      "provider": { "full_name": "Dr. Chidi Okeke" },
      "hospital": { "name": "Garki General Hospital", "address": "..." }
    }
  }
}
```

#### `GET /medications/search?name=amoxicillin&lat=9.0765&lng=7.3986`
```json
// Response 200
{
  "success": true,
  "data": {
    "medication": {
      "id": "uuid",
      "name": "Amoxicillin",
      "generic_name": "Amoxicillin trihydrate",
      "requires_prescription": true
    },
    "stock": [
      {
        "pharmacy_id": "uuid",
        "pharmacy_name": "HealthPlus Garki",
        "address": "Plot 5, Garki Area 2",
        "distance_m": 800,
        "quantity": 120,
        "unit_price": 350,
        "last_verified_at": "2026-03-14T08:00:00Z",
        "generic_available": true,
        "generic_price": 150
      }
    ]
  }
}
```

---

## 6. Data Models

See `apps/api/prisma/schema.prisma` for the full Prisma schema. Key model relationships:

```
User (consumer)
  └── Appointments (many)
        └── EMR Records (one)
        └── Reviews (one)
        └── Lab Requests (many)
        └── Invoices (one)

Hospital
  └── Staff (many)
        └── Providers (doctors subset)
  └── Wards (many)
        └── Admissions (many)
  └── Pharmacy Stock (many)

Provider
  └── Appointments (many)
```

---

## 7. AI Triage Engine

See `ARCHITECTURE.md § AI Triage Engine` for full technical detail.

**Key implementation file:** `apps/api/src/services/triage.service.ts`

**Testing the triage engine:** A set of scenario tests lives in `apps/api/src/__tests__/triage.test.ts`. Each test provides a symptom sequence and asserts the expected care level output. Red flag scenarios always assert `emergency` care level regardless of other context.

**Prompt versioning:** The Claude system prompt is versioned in `apps/api/src/lib/prompts/triage-v1.ts`. Any changes to the prompt require a new version file and a migration note documenting what changed and why.

---

## 8. Notification System

Notifications are sent via two channels:
- **SMS** (Twilio) — for all users, works on any phone
- **Push** (Expo Push) — for users who have notifications enabled in the app

**Notification events:**

| Event | SMS | Push |
|---|---|---|
| Appointment confirmed | Yes | Yes |
| Appointment reminder (24h) | Yes | Yes |
| Appointment reminder (1h) | Yes | Yes |
| Appointment cancelled | Yes | Yes |
| Lab result ready | Yes | Yes |
| Invoice issued | No | Yes |
| Low stock alert (hospital) | No | Yes |

All notification jobs are queued via BullMQ. Queue implementation: `apps/api/src/jobs/`.

---

## 9. File Handling

### Prescription images
- Uploaded via `POST /medications/scan`
- Stored in S3: `prescriptions/{user_id}/{timestamp}.{ext}`
- Bucket is private — no public access
- Deleted after 30 days (S3 lifecycle rule)
- Max file size: 10MB
- Accepted formats: JPEG, PNG, PDF

### Lab result PDFs
- Uploaded via `PATCH /hospital/lab/requests/:id/result`
- Stored in S3: `lab-results/{hospital_id}/{request_id}.pdf`
- Access via signed URL (1-hour expiry)
- Retained indefinitely (medical records)
- Max file size: 25MB

---

## 10. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/healthbridge
DIRECT_URL=postgresql://user:password@localhost:5432/healthbridge   # Prisma migrations

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=minimum_32_char_secret_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Maps
GOOGLE_MAPS_API_KEY=AIza...

# OCR
GOOGLE_VISION_API_KEY=AIza...

# SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890

# File storage
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=healthbridge-uploads

# App
NODE_ENV=development
PORT=3000
CONSUMER_APP_URL=http://localhost:8081
HOSPITAL_APP_URL=http://localhost:3001
```

---

## 11. Error Handling

### Error codes

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g. existing booking for same slot) |
| `TRIAGE_RED_FLAG` | 200 | Red flag detected — emergency care level returned |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Triage-specific errors

The triage engine never returns a 4xx or 5xx for safety-critical scenarios. If the AI service is unavailable, the system falls back to a static decision tree covering the 20 most common symptom categories. This fallback is logged and alerted to the on-call team.

---

## 12. Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific workspace
pnpm --filter api test
pnpm --filter consumer test

# Run with coverage
pnpm --filter api test:coverage
```

### Test structure

```
apps/api/src/__tests__/
  triage.test.ts         # Triage engine scenarios (unit)
  auth.test.ts           # Auth flows (integration)
  providers.test.ts      # Provider search + booking (integration)
  medications.test.ts    # Stock search (integration)
  hospital/
    appointments.test.ts
    emr.test.ts
    billing.test.ts
```

Integration tests use a separate test database (configured via `TEST_DATABASE_URL`). The test database is reset before each test suite run.

---

## 13. Contribution Guidelines

### Branching strategy

```
main           → production
staging        → staging environment (auto-deploy on merge)
feat/xyz       → new features (branch from main)
fix/xyz        → bug fixes (branch from main)
```

### PR requirements
- All tests pass (CI enforced)
- No TypeScript errors
- ESLint passes with zero warnings
- PR description includes: what changed, why, how to test
- For triage prompt changes: include before/after output comparison for 5 test scenarios

### Commit format

```
feat: add prescription OCR endpoint
fix: correct trust score calculation on first review
docs: update triage engine documentation
chore: upgrade Claude API client to latest version
```

### Medical content changes

Any change that affects triage logic, red-flag rules, or medical disclaimer copy requires review from a medically-qualified advisor before merge. Tag `@medical-review` in the PR.