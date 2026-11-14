# ASTRA — Autonomous Space Triage & Response Assistant

Working 48-hour hackathon vertical slice for astronaut medical decision support.

## Current demo path

1. Astronaut profile and explicitly simulated vitals load from FastAPI.
2. The astronaut submits a concern.
3. A small curated NASA HRP retrieval set returns relevant references, or none.
4. An **independent deterministic triage rule** returns `red`, `yellow`, or `green`.
5. A safety guard ensures the response cannot downgrade escalation when human support is required.
6. The consultation is saved as an incident in local SQLite.
7. The astronaut sees the triage result, grounded sources, and the incident record.

## Stack implemented

- Next.js + TypeScript + Tailwind CSS
- FastAPI + Pydantic
- Local SQLite for the zero-configuration demo
- pytest/test coverage for dashboard, triage, retrieval, incident persistence, and critical-alert precedence

## Run locally

Terminal 1:

```bash
cd backend
../venv/bin/uvicorn main:app --reload --port 8000
```

Terminal 2:

```bash
cd frontend
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. API docs: http://localhost:8000/docs.

## Tests

```bash
cd backend
../venv/bin/pytest -q
```

## Safety and scope

- This is a **prototype**, not a medical device or a diagnostic system.
- All astronaut data and vitals are **fictional/simulated**.
- Triage rules are **illustrative, not clinically validated**, and carry `validated: false`.
- Reference material is background information from NASA’s Human Research Program pages, not a treatment protocol.
- The LLM cannot own or downgrade the urgency result.
- Failure states report that no assessment was produced; they do not silently succeed.

## Not yet connected

- Gemini / LLM answer generation and managed RAG. The present deterministic responder is deliberately labeled `deterministic_demo`.
- Supabase Postgres. Local SQLite is the drop-in demo store.
- Authentication, role-based access, audit-log UI, offline cached references, deployment.

## Key next steps

1. Swap the SQLite adapter for Supabase and apply the schema in `docs/schema.sql`.
2. Add a Gemini provider behind the same response contract and run every generated answer through `enforce_triage_safety`.
3. Have the medical-logic owner replace illustrative rules with approved, reviewed protocol rules and version them.
4. Add a ground-support review view, since the current build is astronaut-facing.
5. Record a backup demo before feature freeze.
