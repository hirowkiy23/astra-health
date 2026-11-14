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
| GET | `/api/consultation/history?consultation_id={id}` | Restored multi-turn chat history |
| POST | `/api/triage/evaluate` | Deterministic triage only |
| GET | `/api/incidents` | Incident history |
| GET | `/api/incidents/{id}` | Single incident |
| GET | `/api/incidents/{id}/report` | Incident report with vitals snapshot |

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
- `/dashboard` — Overview, Physiological, Radiation, Daily/Sleep & Mental Health, Fitness, Environment and AI Risk tabs; crew selection; environment metrics; SOS response; and ASTRA consultation modal.
- SOS requires three deliberate presses before logging an incident and presenting the acknowledgement screen. Acknowledgement resets the activation count, and returning to the overview resets the button to its idle state.
- Content surfaces use the Figma source's navy radial background, cyan/teal borders, white Inter typography, and blue active tabs.
- ASTRA's retrieval corpus includes summarized NASA HRP hazards, risks and ongoing research from the three supplied source URLs. These are research background, not treatment protocols.
- The chat supports knowledge-base questions and incident reports, persists user and assistant turns in SQLite, restores the latest conversation after a page refresh, and resolves short follow-up questions using recent context.
- The selected crew member's simulated vitals are sent to triage, which now escalates on critical or abnormal readings and on missing data; each incident stores a vitals snapshot.
- The AI Risk tab includes an incident log that opens the stored rule, vitals, and recorded response for review.
- `public/orbital-login.png` — image exported from the user's Figma file.

The original Figma source has empty Radiation, Daily, and Fitness frames. Their application views, plus Environment and AI Risk, were designed in the same visual system and clearly label simulated data.

## Not yet built

- Supabase Postgres (SQLite is the zero-setup demo store)
- Real authentication and role-based access (the login screen is a demo-access flow)
- Ground-support review view
- Offline cached references
- Deployment configuration
- Designs for the Radiation, Daily, and Fitness frames
