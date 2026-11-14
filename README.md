# ASTRA — Autonomous Space Triage & Response Assistant

TypeScript-only astronaut medical decision-support prototype.

**One Next.js application.** The UI, the API routes, the deterministic triage engine, the retrieval layer, the LLM client, and persistence all live in TypeScript. There is no Python service to run.

## Demo path

1. Astronaut profile and explicitly simulated vitals load from `/api/health/summary`.
2. The astronaut submits a concern.
3. Keyword retrieval over a small curated NASA HRP corpus returns references, or none.
4. An **independent deterministic triage rule** returns `red`, `yellow`, or `green`.
5. Kimi K3.1 Pro (via an OpenAI-compatible endpoint) explains the concern using only the retrieved references.
6. A safety guard ensures model text can never downgrade the deterministic escalation.
7. The consultation is saved as an incident in SQLite.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + React + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js Route Handlers (`src/app/api/**`) |
| Persistence | SQLite via `better-sqlite3` |
| LLM | `kimi-k3.1-pro` at `https://api.cosmoshub.tech/v1` |
| Tests | Node's built-in `node:test` (zero extra deps) |

## Run

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then add your own LLM_API_KEY
npm run dev
```

Open http://localhost:3000.

## Test and verify

```bash
cd frontend
npm test          # 19 tests: triage, retrieval, safety, persistence
npm run typecheck # tsc --noEmit
npm run build
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service status and whether an LLM is configured |
| GET | `/api/health/summary` | Demo astronaut profile and simulated vitals |
| GET | `/api/astronaut/profile` | Astronaut profile |
| GET | `/api/health/vitals` | Latest vitals |
| POST | `/api/consultation/message` | Full consultation: triage + retrieval + response + incident |
| POST | `/api/triage/evaluate` | Deterministic triage only |
| GET | `/api/incidents` | Incident history |
| GET | `/api/incidents/{id}` | Single incident |

## Safety and scope

- This is a **prototype**, not a medical device or a diagnostic system.
- All astronaut data and vitals are **fictional/simulated**.
- Triage rules are **illustrative, not clinically validated**, and always carry `validated: false`.
- Reference material is background from NASA's Human Research Program, not a treatment protocol.
- The LLM never owns urgency: `enforceTriageSafety` runs on every response, and red emergencies skip generation entirely.
- Provider failure falls back to a deterministic response labeled `deterministic_demo` or `llm_error_fallback` — it never silently succeeds.

## Layout

```
frontend/
├── src/app/
│   ├── page.tsx                 Astronaut dashboard + consultation UI
│   └── api/**                   Route handlers
├── src/lib/
│   ├── triage.ts                Deterministic triage rules
│   ├── retrieval.ts             Curated NASA HRP corpus + keyword retrieval
│   ├── safety.ts                Triage escalation guard + JSON extraction
│   ├── llm.ts                   OpenAI-compatible client
│   ├── fallback.ts              Deterministic responder
│   ├── db.ts                    SQLite persistence
│   └── demo-data.ts             Fictional astronaut and vitals
└── tests/                       node:test suites
docs/schema.sql                  Postgres/Supabase target schema
```

## Design source

The UI is based on the Figma file [NASA Space Apps Challenge 2026](https://www.figma.com/design/On7vnkMBuq5kxgXMOwcdpY/NASA-Space-Apps-Challenge-2026):

- `/login` — spacecraft image, email/password fields, and demo-access flow. This is **not real authentication**.
- `/dashboard` — Overview, Physiological, Radiation, Daily, and Fitness tabs; crew selection; environment metrics; SOS response; and ASTRA consultation modal.
- `public/orbital-login.png` — image exported from the user's Figma file.

The Figma source has empty Radiation, Daily, and Fitness frames. The app renders explicit placeholder states for those rather than inventing measurements or charts.

## Not yet built

- Supabase Postgres (SQLite is the zero-setup demo store)
- Real authentication and role-based access (the login screen is a demo-access flow)
- Ground-support review view
- Offline cached references
- Deployment configuration
- Designs for the Radiation, Daily, and Fitness frames
