# MedBridge — Developer Documentation

> Complete setup guide, environment configuration, API reference, and contribution standards.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Project Initialization](#project-initialization)
4. [Service Configuration](#service-configuration)
5. [Database Setup](#database-setup)
6. [AI Service Setup](#ai-service-setup)
7. [Running in Development](#running-in-development)
8. [Environment Variables Reference](#environment-variables-reference)
9. [API Reference](#api-reference)
10. [Frontend Structure](#frontend-structure)
11. [Authentication & Roles](#authentication--roles)
12. [File Upload & Storage](#file-upload--storage)
13. [AI Pipeline Guide](#ai-pipeline-guide)
14. [Offline / USSD Layer](#offline--ussd-layer)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [Code Standards](#code-standards)
18. [Security Guidelines](#security-guidelines)

---

## Prerequisites

Ensure the following are installed before proceeding:

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | Frontend and API runtime |
| Python | 3.11+ | AI microservice |
| pnpm | 8.x | Monorepo package manager |
| Docker | 24.x | Local PostgreSQL and Redis |
| Docker Compose | 2.x | Service orchestration |
| Git | 2.x | Version control |

Optional but recommended:
- VS Code with ESLint, Prettier, and Prisma extensions
- Postman or Bruno for API testing
- TablePlus or DBeaver for database inspection

---

## Environment Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/medbridge.git
cd medbridge
```

### 2. Install pnpm globally

```bash
npm install -g pnpm
```

### 3. Install all workspace dependencies

```bash
pnpm install
```

### 4. Set up environment files

```bash
# Root env (shared secrets)
cp .env.example .env

# Web frontend
cp apps/web/.env.example apps/web/.env.local

# API gateway
cp apps/api/.env.example apps/api/.env

# AI microservice
cp apps/ai-service/.env.example apps/ai-service/.env
```

Fill in all required variables before proceeding. See [Environment Variables Reference](#environment-variables-reference).

---

## Project Initialization

### Start infrastructure services

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                STATUS          PORTS
medbridge-db        running         0.0.0.0:5432->5432/tcp
medbridge-redis     running         0.0.0.0:6379->6379/tcp
```

### Set up the database

```bash
# Generate Prisma client
pnpm db:generate

# Run all migrations
pnpm db:migrate

# Seed development data (test users, sample records, drug DB snapshot)
pnpm db:seed
```

### Set up the Python AI service

```bash
cd apps/ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download base medical embeddings (first-time only, ~2GB)
python scripts/download_embeddings.py

cd ../..
```

---

## Service Configuration

### apps/web — Next.js Frontend

- Framework: Next.js 14 with App Router
- Styling: Tailwind CSS with custom MedBridge design tokens
- State: Zustand for global state, React Query (TanStack) for server state
- Forms: React Hook Form + Zod validation
- Charts: Recharts for health dashboards

Key configuration files:
- `apps/web/next.config.js` — Next.js config, image domains, env exposure
- `apps/web/tailwind.config.ts` — Custom color palette and typography
- `apps/web/lib/api.ts` — Typed API client (wraps fetch with auth headers)

### apps/api — Node.js API Gateway

- Framework: Express with TypeScript
- Auth: NextAuth.js sessions + JWT for service-to-service
- Validation: Zod on all request bodies
- Rate Limiting: express-rate-limit per user tier
- Logging: Winston + structured JSON logs

Key configuration files:
- `apps/api/src/config/index.ts` — Centralized config from env
- `apps/api/src/middleware/auth.ts` — Role-based auth middleware
- `apps/api/src/middleware/safety.ts` — Emergency detection middleware

### apps/ai-service — Python FastAPI

- Framework: FastAPI with async support
- LLM Orchestration: LangChain + custom pipeline classes
- Embeddings: sentence-transformers with custom medical fine-tune
- Document Parsing: PyMuPDF, pdfplumber, python-docx, Pillow (OCR via Tesseract)
- Inference: Claude API (primary), Groq API (fallback)

Key configuration files:
- `apps/ai-service/config.py` — All settings via Pydantic BaseSettings
- `apps/ai-service/pipelines/` — One pipeline class per module (documents, symptoms, copilot, drugs)
- `apps/ai-service/agents/safety_agent.py` — Emergency detection logic (runs first on every input)

---

## Database Setup

MedBridge uses PostgreSQL as the primary database managed via Prisma ORM.

### Schema overview

```
Users                 — patients, clinicians, clinic admins
Clinics               — clinic profiles and settings
Patients              — patient records linked to users or created by clinics
HealthProfiles        — longitudinal health memory per patient
Symptoms              — logged symptom sessions
DocumentAnalyses      — uploaded document results
ClinicalNotes         — AI-generated and clinician-edited notes
DrugInteractionLogs   — queried drug combinations and results
Appointments          — scheduling records
Referrals             — referral network events
AuditLogs             — all AI output events with context
```

### Common database commands

```bash
# Open Prisma Studio (visual DB browser)
pnpm db:studio

# Create a new migration after schema changes
pnpm db:migrate:dev --name describe_your_change

# Reset database (development only — destroys all data)
pnpm db:reset

# Push schema without migration (prototyping only)
pnpm db:push
```

### Prisma schema location

```
packages/db/schema.prisma
```

All models, relations, and enums are defined here. Any schema change requires a migration before the API can use the updated types.

---

## AI Service Setup

### Pipeline architecture

Each MedBridge feature has a dedicated pipeline:

```
pipelines/
├── document_pipeline.py     # Document upload → parse → extract → explain
├── symptom_pipeline.py      # Symptom input → safety check → scoring → output
├── copilot_pipeline.py      # Patient history → summarize → differentials → notes
├── drug_pipeline.py         # Drug query → interaction check → explanation
└── surveillance_pipeline.py # Anonymized event aggregation → pattern detection
```

Every pipeline runs the safety agent first. No pipeline can return output until the safety agent has cleared the input or escalated it.

### Safety agent logic

```python
# agents/safety_agent.py
# Runs on every input regardless of pipeline

EMERGENCY_PATTERNS = [
    "chest pain", "difficulty breathing", "cannot breathe",
    "unconscious", "seizure", "stroke symptoms", "severe bleeding",
    "suicidal", "overdose", "poisoning", "severe allergic reaction",
    # Extended list maintained separately in safety_patterns.json
]

async def check_safety(input_text: str) -> SafetyResult:
    # Step 1: Pattern matching (fast, runs first)
    # Step 2: LLM safety classification (slower, runs if pattern match uncertain)
    # Step 3: Return SAFE / WARNING / EMERGENCY
    # EMERGENCY short-circuits all other pipeline logic
```

### Adding a new AI pipeline

1. Create `pipelines/your_pipeline.py` inheriting from `BasePipeline`
2. Implement `async def run(self, input: YourInputModel) -> YourOutputModel`
3. Register in `routers/your_router.py`
4. Add integration tests in `tests/test_your_pipeline.py`
5. Safety agent runs automatically — do not bypass it

### Local model testing without API keys

Set `USE_MOCK_LLM=true` in your `.env`. The mock returns deterministic fixture responses from `tests/fixtures/` — useful for frontend development and CI.

---

## Running in Development

### Start all services simultaneously

```bash
# From the project root
pnpm dev
```

This runs:
- `apps/web` on http://localhost:3000
- `apps/api` on http://localhost:4000
- `apps/ai-service` on http://localhost:8000

### Start services individually

```bash
pnpm dev --filter=web           # Frontend only
pnpm dev --filter=api           # API only
pnpm dev --filter=ai-service    # AI service only
```

### Useful development URLs

| URL | Description |
|---|---|
| http://localhost:3000 | Web application |
| http://localhost:4000/health | API health check |
| http://localhost:8000/docs | AI service Swagger UI |
| http://localhost:8000/redoc | AI service ReDoc |
| http://localhost:5555 | Prisma Studio (run `pnpm db:studio`) |

---

## Environment Variables Reference

### Root `.env`

```env
# Database
DATABASE_URL=postgresql://medbridge:password@localhost:5432/medbridge_dev
REDIS_URL=redis://localhost:6379

# Secrets
NEXTAUTH_SECRET=your-secret-here-min-32-chars
JWT_SERVICE_SECRET=your-service-jwt-secret

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# File Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=medbridge-documents

# SMS / USSD (Africa's Talking)
AT_API_KEY=your-africastalking-key
AT_USERNAME=sandbox
AT_SENDER_ID=MedBridge

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

### `apps/web/.env.local`

```env
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=MedBridge
NEXT_PUBLIC_ENVIRONMENT=development
```

### `apps/api/.env`

```env
PORT=4000
AI_SERVICE_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:3000
MAX_FILE_SIZE_MB=25
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_FREE=10
RATE_LIMIT_MAX_PAID=100
```

### `apps/ai-service/.env`

```env
PORT=8000
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
USE_MOCK_LLM=false
EMBEDDINGS_PATH=./data/embeddings
DRUG_DB_PATH=./data/nafdac_drugs.json
SAFETY_PATTERNS_PATH=./data/safety_patterns.json
MAX_DOCUMENT_PAGES=50
ENABLE_SURVEILLANCE=true
```

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

All protected endpoints require `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns session token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/refresh` | Refresh access token |

### Document Analysis

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/documents/upload` | Upload and analyze medical document | Required |
| GET | `/documents` | List user's document analyses | Required |
| GET | `/documents/:id` | Get single analysis result | Required |
| DELETE | `/documents/:id` | Delete document and analysis | Required |

Request (POST `/documents/upload`):
```json
{
  "file": "<multipart/form-data>",
  "document_type": "lab_result | prescription | report | nhis_form | other",
  "notes": "Optional context from user"
}
```

Response:
```json
{
  "id": "doc_01h...",
  "status": "complete",
  "document_type": "lab_result",
  "findings": [
    {
      "field": "Haemoglobin",
      "value": "9.2 g/dL",
      "normal_range": "12.0–17.5 g/dL",
      "flag": "LOW",
      "explanation": "Your haemoglobin is below the normal range, which may indicate anaemia. This should be discussed with your doctor."
    }
  ],
  "summary": "Plain English summary of the document...",
  "risk_flags": ["Low haemoglobin", "Elevated white cell count"],
  "recommended_action": "CONSULT_DOCTOR",
  "ai_disclaimer": "This analysis is AI-generated and is not a medical diagnosis.",
  "created_at": "2025-03-20T10:00:00Z"
}
```

### Symptom Checker

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/symptoms/check` | Submit symptom session | Optional |
| GET | `/symptoms/history` | Get user's symptom history | Required |

Request (POST `/symptoms/check`):
```json
{
  "symptoms": ["fever", "headache", "chills", "body aches"],
  "duration_days": 3,
  "severity": "moderate",
  "location": "Lagos, Nigeria",
  "age": 28,
  "sex": "female",
  "known_conditions": ["sickle cell trait"],
  "current_medications": []
}
```

Response:
```json
{
  "session_id": "sym_01h...",
  "safety_status": "SAFE",
  "emergency_detected": false,
  "possible_conditions": [
    {
      "category": "Malaria",
      "probability_range": "High",
      "reasoning": "Fever with chills and body aches in Lagos context is consistent with malaria presentation."
    },
    {
      "category": "Typhoid fever",
      "probability_range": "Moderate",
      "reasoning": "Sustained fever with headache may indicate typhoid, especially given regional prevalence."
    }
  ],
  "severity_score": 6,
  "urgency": "SEE_DOCTOR_TODAY",
  "next_steps": [
    "Visit a clinic for a malaria rapid test and full blood count",
    "Stay hydrated and rest",
    "Avoid self-medicating with antimalarials before confirmed test"
  ],
  "ai_disclaimer": "These are possible condition categories, not diagnoses. See a qualified doctor."
}
```

### Doctor Copilot

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| POST | `/copilot/summarize` | Summarize patient history | Required | CLINICIAN |
| POST | `/copilot/differentials` | Get differential suggestions | Required | CLINICIAN |
| POST | `/copilot/notes` | Generate clinical note | Required | CLINICIAN |
| POST | `/copilot/note/voice` | Transcribe and structure voice note | Required | CLINICIAN |

### Drug Intelligence

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/drugs/search` | Search drug database | Optional |
| POST | `/drugs/interactions` | Check drug-drug interactions | Optional |
| GET | `/drugs/:id` | Get drug details | Optional |

### Clinic OS

| Method | Endpoint | Description | Auth | Role |
|---|---|---|---|---|
| GET | `/clinic/patients` | List all clinic patients | Required | CLINIC_STAFF |
| POST | `/clinic/patients` | Create patient record | Required | CLINIC_STAFF |
| GET | `/clinic/patients/:id` | Get patient record | Required | CLINIC_STAFF |
| PUT | `/clinic/patients/:id` | Update patient record | Required | CLINIC_STAFF |
| GET | `/clinic/appointments` | List appointments | Required | CLINIC_STAFF |
| POST | `/clinic/appointments` | Create appointment | Required | CLINIC_STAFF |
| POST | `/clinic/referrals` | Create referral | Required | CLINIC_STAFF |
| GET | `/clinic/analytics` | Clinic usage analytics | Required | CLINIC_ADMIN |

---

## Frontend Structure

```
apps/web/app/
├── (marketing)/
│   ├── page.tsx              # Landing page
│   ├── pricing/page.tsx      # Pricing page
│   ├── about/page.tsx        # About MedBridge
│   └── contact/page.tsx      # Contact page
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── onboarding/page.tsx   # Role selection + profile setup
├── (patient)/
│   ├── dashboard/page.tsx    # Patient home
│   ├── symptoms/page.tsx     # Symptom checker
│   ├── documents/page.tsx    # Document upload and history
│   ├── drugs/page.tsx        # Drug checker
│   └── profile/page.tsx      # Health profile
├── (clinician)/
│   ├── dashboard/page.tsx    # Doctor home
│   ├── copilot/page.tsx      # AI copilot interface
│   ├── patients/page.tsx     # Patient list
│   └── notes/page.tsx        # Clinical notes
└── (clinic)/
    ├── dashboard/page.tsx    # Clinic overview
    ├── patients/page.tsx     # Patient records
    ├── appointments/page.tsx # Scheduling
    ├── referrals/page.tsx    # Referral management
    └── analytics/page.tsx    # Usage and health reports
```

### Shared components

```
packages/ui/components/
├── medical/
│   ├── SymptomInput.tsx        # Conversational symptom entry
│   ├── DocumentUploader.tsx    # Drag-drop with type detection
│   ├── RiskBadge.tsx           # Color-coded risk level display
│   ├── EmergencyBanner.tsx     # Full-screen emergency alert
│   ├── AIDisclaimer.tsx        # Consistent disclaimer footer
│   └── FindingCard.tsx         # Lab finding display card
├── layout/
│   ├── PatientShell.tsx
│   ├── ClinicianShell.tsx
│   └── ClinicShell.tsx
└── common/
    ├── LoadingPulse.tsx
    ├── ErrorBoundary.tsx
    └── OfflineBanner.tsx
```

---

## Authentication & Roles

MedBridge uses NextAuth.js with four primary roles:

| Role | Access |
|---|---|
| `PATIENT` | Symptom checker, document analyzer, drug checker, health profile |
| `CLINICIAN` | All patient features + Doctor Copilot, clinical notes, referral send |
| `CLINIC_STAFF` | Clinic OS — patient records, appointments, referrals |
| `CLINIC_ADMIN` | All staff features + analytics, billing, user management |
| `SUPER_ADMIN` | Platform administration, surveillance dashboard |

Role is set at registration and can be elevated by a CLINIC_ADMIN or SUPER_ADMIN. Clinician accounts require verification (license number validation flow).

---

## File Upload & Storage

All uploaded medical documents are handled through a secure upload pipeline:

1. Frontend requests a pre-signed upload URL from the API
2. File is uploaded directly from the browser to Cloudflare R2 (never through the API server)
3. API receives upload confirmation with the R2 object key
4. API queues the document for AI processing via the ai-service
5. Processed results are stored in PostgreSQL; original file stays in R2
6. Files are encrypted at rest using AES-256 (managed by Cloudflare)
7. Access requires a short-lived signed URL generated per request

Maximum file size: 25MB. Supported types: PDF, PNG, JPG, DOCX.

---

## AI Pipeline Guide

### How to add a new feature with AI

1. Define your input/output models in `apps/ai-service/models/your_feature.py`
2. Create a pipeline in `apps/ai-service/pipelines/your_feature_pipeline.py`
3. The safety agent is called automatically in `BasePipeline.run()` — never skip it
4. Write your prompt templates in `apps/ai-service/prompts/your_feature/`
5. Add an API router in `apps/ai-service/routers/your_feature.py`
6. Add a corresponding API route in `apps/api/src/routes/your-feature.ts`
7. Add a frontend page or component in `apps/web/app/`
8. Write tests before shipping

### Prompt engineering standards

- Always include the safety disclaimer instruction in every system prompt
- Always specify the response format explicitly (JSON schema)
- Always include the African medical context instruction
- Never allow the model to present output as a confirmed diagnosis
- Include few-shot examples in prompts for clinical features

---

## Offline / USSD Layer

MedBridge supports low-connectivity users through two mechanisms:

### Progressive Web App (offline mode)

- Service workers cache the symptom checker and drug search
- IndexedDB stores the last 10 document analyses locally
- Sync happens automatically when connection is restored
- Offline banner shown clearly when operating without connection

### USSD / SMS integration (Africa's Talking)

USSD shortcode: `*384*MEDBRIDGE#` (placeholder — register with telecoms)

```
Main Menu:
1. Check symptoms
2. Drug information
3. Find nearest clinic
4. Emergency contacts

Symptom Check (USSD):
→ Enter main symptom as text
→ AI responds with severity level and next steps
→ Emergency detected → sends SMS with nearest emergency clinic
```

USSD handler: `apps/api/src/routes/ussd.ts`
SMS handler: `apps/api/src/services/sms.service.ts`

---

## Testing

### Run all tests

```bash
pnpm test
```

### Run tests per service

```bash
pnpm test --filter=web          # Frontend unit + component tests
pnpm test --filter=api          # API integration tests
pnpm test --filter=ai-service   # Python pytest
```

### Test coverage

```bash
pnpm test:coverage
```

### Critical test requirements

- Every AI pipeline must have integration tests with mock LLM responses
- The safety agent must have 100% test coverage — no exceptions
- Emergency detection paths must be tested with all emergency pattern variants
- All API routes must have authentication and authorization tests
- Document parsing must be tested against real Nigerian medical document fixtures

---

## Deployment

### Production environment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| API Gateway | Railway |
| AI Service | Railway (or Render) |
| Database | Supabase (managed PostgreSQL) |
| Cache | Upstash (managed Redis) |
| File Storage | Cloudflare R2 |
| CDN | Cloudflare |

### Deploy via GitHub Actions

Push to `main` triggers:
1. Test suite (all services)
2. Build and type check
3. Database migration (auto on staging, manual approval on production)
4. Deploy frontend to Vercel
5. Deploy API and AI service to Railway
6. Smoke tests on production endpoints

### Manual deployment

```bash
# Build all services
pnpm build

# Run database migrations on production
pnpm db:migrate:prod

# Deploy frontend
vercel deploy --prod

# Deploy API (Railway CLI)
railway up --service api

# Deploy AI service
railway up --service ai-service
```

---

## Code Standards

### TypeScript

- Strict mode enabled across all packages
- No `any` types — use `unknown` and narrow with guards
- All API responses typed via shared `packages/types`
- Zod schemas for all external input validation

### Python

- Type hints required on all functions
- Pydantic models for all request/response shapes
- Async everywhere — no blocking calls in route handlers
- Black formatting + isort imports

### Git workflow

- Branch from `develop` for all features
- Branch naming: `feature/short-description`, `fix/short-description`
- Pull requests require one approval + passing CI before merge
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`

### AI output standards

- Every AI output object must include an `ai_disclaimer` field
- Severity and urgency fields must use enum values, never free text
- Clinical outputs must include a `confidence_level` field
- All outputs must be auditable — every AI call logged to AuditLogs

---

## Security Guidelines

- Never log PHI (protected health information) — mask or omit patient identifiers in all logs
- All patient data encrypted at rest (AES-256) and in transit (TLS 1.3)
- File access via signed URLs only — never expose direct storage paths
- Rate limiting on all endpoints — stricter limits for unauthenticated requests
- NDPR compliance: users can request data export and deletion at any time
- Security headers configured in Next.js and Express (Helmet.js)
- SQL injection protected by Prisma's parameterized queries
- Input sanitization on all user-provided text before AI processing
- Audit log every clinical AI recommendation with timestamp, model version, and input hash
- Penetration testing required before any production launch

---

*Last updated: March 2025 — MedBridge v1 Development Build*