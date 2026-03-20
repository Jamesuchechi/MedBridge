# MedBridge — Architecture

---

## Overview

MedBridge is a distributed, multi-service platform. At its core it is three applications communicating over HTTP, with an async job layer for heavy workloads, and a shared PostgreSQL database with pgvector for semantic search.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
│   Browser / PWA          Mobile (future)        USSD (Phase 5)  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────────┐
│                        PRESENTATION LAYER                       │
│              Next.js 14 App (Vercel Edge Network)               │
│   App Router | RSC | Streaming | ISR | Edge Middleware           │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST (internal)
┌─────────────────────────────▼───────────────────────────────────┐
│                         API GATEWAY LAYER                       │
│            Node.js / Express — apps/api (Railway)               │
│   Auth | Rate Limiting | Validation | Request Routing            │
└──────┬───────────────────────────────────────┬──────────────────┘
       │ Sync (fast)                           │ Async (heavy)
┌──────▼──────────────┐              ┌─────────▼──────────────────┐
│   AI SERVICE        │              │      JOB QUEUE              │
│  Python FastAPI     │              │   BullMQ + Redis            │
│  (Railway)          │◄─────────────│   Document analysis         │
│                     │              │   Batch processing          │
│  AfriDx Engine      │              │   Report generation         │
│  LLM Integration    │              └────────────────────────────┘
│  Safety Layer       │
│  Embeddings         │
└──────┬──────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                          DATA LAYER                             │
│                                                                 │
│  PostgreSQL + pgvector    Redis              Supabase Storage   │
│  (Supabase Cloud)         (Upstash / local)  (Files/Docs)       │
│                                                                 │
│  Typesense                Cloudinary                            │
│  (Drug/Symptom search)    (Image optimization)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Boundaries

### apps/web — Presentation Service

**Responsibility:** Everything the user sees and touches.

**Key decisions:**
- Next.js App Router with React Server Components for data-fetching pages (reduces client JS)
- Client components only where interactivity is needed (symptom form, document upload, real-time results)
- API routes in Next.js are thin proxies only — no business logic lives here
- Auth session managed via Supabase Auth with httpOnly cookies

**Does not:**
- Call the AI service directly
- Write to the database directly
- Store any patient data in browser storage

### apps/api — Application Service

**Responsibility:** Business logic, orchestration, auth enforcement, job dispatch.

**Key decisions:**
- Every incoming request is authenticated and authorized here
- Decides whether an AI call is synchronous (symptom check, drug query — fast, <3s) or async (document analysis — slow, 5–30s)
- Owns the database schema and all writes
- All AI calls routed through this service — frontend never calls AI service directly

**Does not:**
- Run inference or call LLMs directly
- Store files (delegates to Supabase Storage via pre-signed URLs)

### apps/ai-service — Intelligence Service

**Responsibility:** All AI/ML processing.

**Key decisions:**
- Stateless — no database writes (results returned to API which writes them)
- Python because the ML ecosystem (LangChain, HuggingFace, spaCy) is Python-native
- AfriDx engine is isolated here and can be updated without touching other services
- Prompt versioning managed here — prompts are Jinja2 templates, not hardcoded strings
- Safety layer runs on every request before LLM call AND on every response before returning

**Does not:**
- Authenticate users (trusts API gateway to only forward verified requests)
- Write to any database
- Serve the frontend

---

## Data Flow — Symptom Check (Sync Path)

```
User submits symptoms
        │
        ▼
Next.js client component
  → POST /api/symptoms/analyze (Next.js API route — thin proxy)
        │
        ▼
Node.js API route handler
  → Validate request (Zod schema)
  → Authenticate user (JWT middleware)
  → Enrich with user health profile (DB query)
  → POST /internal/symptom/analyze (AI service)
        │
        ▼
Python AI service
  → Run safety check
    ├─ EMERGENCY detected → return emergency response immediately (skip LLM)
    └─ SAFE → continue
  → Build prompt from Jinja2 template + user context
  → Call LLM (GPT-4o or Groq Llama3)
  → Parse structured response
  → Apply AfriDx regional weighting
  → Apply response safety filter (no dangerous advice slips through)
  → Return structured result
        │
        ▼
Node.js API
  → Append mandatory disclaimer
  → Save result to symptom_checks table
  → Return to Next.js
        │
        ▼
Next.js
  → Update Zustand state
  → Render results UI
```

---

## Data Flow — Document Analysis (Async Path)

```
User uploads file
        │
        ▼
Next.js
  → GET /api/documents/upload-url  ──► Node.js API generates pre-signed URL
  → PUT file directly to Supabase Storage (browser → Supabase, no API in middle)
  → POST /api/documents { filePath, documentType }
        │
        ▼
Node.js API
  → Creates document record { status: 'pending' }
  → Enqueues job: documentQueue.add('analyze', { documentId, filePath, userId })
  → Returns { documentId, status: 'pending' } immediately (no waiting)
        │
        ▼
BullMQ Worker (async, background)
  → Downloads file from Supabase Storage
  → POST /internal/document/analyze (AI service)
        │
        ▼
Python AI service
  → Detect file type
  → If image: run OCR (Tesseract or AWS Textract)
  → Extract raw text
  → Classify document type (lab result / prescription / report)
  → Apply domain-specific extraction prompt
  → Parse structured findings
  → Flag abnormal values
  → Generate plain English summary
  → Return extraction result
        │
        ▼
BullMQ Worker
  → Updates document record { status: 'complete', ai_extraction: result }
  → Sends websocket notification to user's session
        │
        ▼
Next.js
  → Websocket listener receives notification
  → Fetches complete document record
  → Renders analysis results
```

---

## Database Architecture

### Schema Design Principles

1. **UUID primary keys** everywhere — no sequential IDs exposed externally
2. **Row-Level Security (RLS)** on every table with patient data
3. **Soft deletes** via `deleted_at` column — never hard-delete medical records
4. **Audit timestamps** (`created_at`, `updated_at`) on all tables
5. **JSONB for flexible AI outputs** — AI result structure may evolve; JSONB avoids migrations
6. **pgvector for embeddings** — semantic search on health profile, symptom history

### RLS Policy Pattern

```sql
-- Example: users can only read their own symptom checks
CREATE POLICY "Users read own symptom checks"
  ON symptom_checks FOR SELECT
  USING (auth.uid() = user_id);

-- Doctors can read symptom checks of their clinic's patients
CREATE POLICY "Doctors read clinic patient checks"
  ON symptom_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff cs
      JOIN appointments a ON a.clinic_id = cs.clinic_id
      WHERE cs.user_id = auth.uid()
        AND a.patient_id = symptom_checks.user_id
    )
  );
```

### Vector Search (Health Profile Memory)

```sql
-- Embedding column on health profiles
ALTER TABLE health_profiles
  ADD COLUMN symptom_embedding vector(1536);

-- Semantic similarity search
SELECT * FROM health_profiles
  ORDER BY symptom_embedding <=> $1  -- cosine similarity
  LIMIT 5;
```

---

## AI Architecture

### LLM Routing Strategy

MedBridge routes to different LLMs based on task requirements:

| Task | Primary Model | Fallback | Reason |
|------|--------------|---------|--------|
| Symptom analysis | GPT-4o | Groq Llama3-70b | Needs clinical reasoning depth |
| Document extraction | GPT-4o Vision | GPT-4o (text only) | Vision for image lab results |
| Drug queries | Groq Llama3-70b | GPT-4o | Speed matters, task is well-defined |
| Doctor copilot | GPT-4o | Claude 3.5 Sonnet | Highest stakes — best model |
| Summarization | Groq Llama3-8b | GPT-3.5-turbo | Fast, cheap, high volume |

### AfriDx Pipeline

```
Raw LLM Differential Output
          │
          ▼
┌─────────────────────────────────┐
│   Step 1: Condition Mapping     │
│   Map free-text to ICD-11 codes │
│   + local condition taxonomy    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Step 2: Regional Weighting    │
│   Apply Nigeria prevalence DB   │
│   Adjust by: state, season,     │
│   age group, risk factors       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Step 3: Profile Intersection  │
│   Cross-reference with user's   │
│   known conditions, genotype,   │
│   medications, age, sex         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Step 4: Urgency Scoring       │
│   1 = self-care                 │
│   2 = see GP within 48h         │
│   3 = see GP today              │
│   4 = urgent care now           │
│   5 = emergency — go now        │
└──────────────┬──────────────────┘
               │
               ▼
   Weighted Differential List
   + Urgency Score
   + Recommended Next Steps
```

### Prompt Architecture

Prompts are never hardcoded strings. All prompts are versioned Jinja2 templates:

```
apps/ai-service/core/prompts/
├── symptom_analysis/
│   ├── v1.j2    ← current production
│   └── v2.j2    ← in testing
├── document_extraction/
│   ├── lab_result_v1.j2
│   ├── prescription_v1.j2
│   └── radiology_report_v1.j2
└── doctor_copilot/
    └── v1.j2
```

Version is stored with every AI result in the database — enables regression analysis when prompts are updated.

---

## Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Unauthorized data access | RLS on all tables, JWT on all API routes |
| Prompt injection via uploaded docs | Input sanitization before LLM, output validation |
| LLM hallucination causing harm | Safety layer, mandatory disclaimers, human escalation |
| Data exfiltration | Encryption at rest, no PII in logs, audit trail |
| Rate abuse / API scraping | Per-user rate limits, IP rate limits on auth routes |
| IDOR (insecure direct object reference) | UUID keys + RLS prevent enumeration |

### Network Security

```
Internet → Vercel Edge (WAF + DDoS protection)
  → Next.js API routes (thin proxy, auth check)
    → Node.js API (Railway private network)
      → Python AI service (Railway internal — not exposed to internet)
      → Supabase (TLS only, IP allowlist)
      → Redis (Railway private network)
```

The AI service is never directly reachable from the internet. Only the Node.js API can call it, and only from within Railway's private network.

---

## Caching Strategy

| Data | Cache | TTL | Reason |
|------|-------|-----|--------|
| Drug DB search results | Redis | 1 hour | DB is slow, queries repeat |
| User health profile | Redis | 5 min | Attached to every AI call |
| Clinic appointment list | Redis | 30 sec | High-read, moderate freshness |
| AI results | Never cached | — | Each result is unique |

---

## Observability

### Logging

```
Structured JSON logs via Winston (API)
  → Sentry (error tracking, 4xx/5xx alerts)
  → Railway log drain → Datadog (future)

Log levels:
  ERROR — exceptions, 5xx, AI service failures
  WARN  — 4xx, safety layer triggers, slow queries
  INFO  — request/response, job completions
  DEBUG — dev only, AI prompt/response details
```

### Metrics (Posthog + Custom)

Key product metrics tracked:

- Symptom checks per day (by severity outcome)
- Document analysis completion rate + processing time
- Emergency detection triggers per week
- Doctor copilot sessions per doctor
- Drug interaction queries per drug (surfaces high-demand drugs)
- Clinic appointment booking funnel

### Health Checks

```
GET /health          → API status
GET /health/db       → Database connectivity
GET /health/ai       → AI service reachability
GET /health/queue    → BullMQ queue depth

Uptime Robot monitors all four every 60 seconds.
PagerDuty alert if /health fails for >2 minutes.
```

---

## Scalability Considerations

### Current Architecture Limits and Next Steps

| Component | Current Limit | Scale Solution |
|-----------|-------------|----------------|
| Node.js API | ~1K req/s single instance | Horizontal scaling on Railway |
| AI service | LLM API rate limits | Multiple API keys, request queuing |
| Document processing | Queue depth | Add more BullMQ workers |
| PostgreSQL | ~10K connections | PgBouncer connection pooling |
| File storage | Supabase free tier 1GB | Upgrade tier or migrate to S3 |

### Phase 5 — USSD Architecture (Offline/Low-Data)

For USSD integration, a separate lightweight service will handle:

```
USSD Gateway (Africa's Talking)
  → USSD Service (simple Node.js, no frontend)
    → Simplified symptom checker (text-only)
    → Drug lookup
    → Clinic locator
  → SMS gateway for result delivery
```

This runs as a completely separate service — does not share codebase with the main app.

---

*Architecture is a living document. Update this file when significant structural decisions are made.*