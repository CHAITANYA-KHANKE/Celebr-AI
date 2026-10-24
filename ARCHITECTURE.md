# Celebrai — Architecture

## System shape

```text
React + TypeScript + Vite
      │ same-origin /api (Vite proxy in development)
      ▼
FastAPI routes → Pydantic contracts → domain services
                                   ├─ guest-sensitive budget allocation
                                   ├─ dependency-validated timeline
                                   ├─ planner provider interface
                                   │    ├─ deterministic demo provider
                                   │    └─ server-side Gemini REST provider
                                   └─ SQLAlchemy repository → SQLite / PostgreSQL
```

## Modules

- `frontend/src/`: app shell, discovery form and workspace tabs. `lib/tradeoffs.ts` computes overrun and what-if previews without applying changes; `lib/task-shifts.ts` calculates dependent dates; `lib/adaptation.ts` preserves saved work and quote scope on event replans; `lib/storage.ts` backfills older browser-saved records.
- `backend/app/schemas.py`: bounded request/response contracts; event context and vendor quote scope are typed; task dependencies are validated for references, cycles, dates and completion order.
- `backend/app/planner.py`: category-, guest- and priority-weighted deterministic allocation, focus-specific demo recommendations, tailored trade-off advice, dependency-linked milestones and checklist assembly.
- `backend/app/ai_provider.py`: server-side Gemini call receives the selected specialist focus, ranked priorities, must-haves, age mix and venue constraints; output is parsed and schema-validated; the prompt forbids invented providers/prices.
- `frontend/src/components/EventWizard.tsx`: specialist selection, structured brief collection, disclosure of Google Gemini data transfer, and explicit user confirmation before submission.
- `backend/app/models.py`, `database.py`, `repository.py`: SQLAlchemy persistence; event brief context uses typed columns; the mutable plan aggregate (including user-entered quote scope) is JSON.
- `backend/app/main.py`: API routing, CORS/configuration, generic API errors.
- `backend/tests/`: unit, API, validation, export, persistence, and mocked-provider tests.

## Data flow

1. User chooses an AI planner focus, reviews the data-sharing disclosure and confirms; the browser submits event facts plus the chosen focus, ranked priorities, must-haves, optional children/older-adult counts and bounded venue constraints to `POST /api/plans/generate`.
2. Backend validates input; Gemini receives the structured context only when configured, otherwise the API returns focus-aware, clearly marked deterministic demo mode.
3. The returned plan is validated, shown with a mode label, and can be saved via `POST /api/events`.
4. Budget calculations stay deterministic. A ≥20% projected overrun previews reductions to uncommitted lines while protecting the highest-ranked priority and must-haves; the what-if simulator previews increases. Explicit user action is required to apply either scenario.
5. Editing event details requests a fresh plan. Reconciliation keeps actual spend, custom lines, task statuses, provider details and quote-scope fields; task-date shifting separately previews dependent dates and only applies after confirmation.
6. `PUT /api/events/{id}` validates and saves the aggregate; task dependencies are checked server-side. Reopening reads persisted data via `GET`.
7. Multiple user-entered options can be compared by category/service, entered amount, guest coverage, inclusions and extra charges; service-specific negotiation prompts do not imply provider verification.
8. CSV/JSON export includes event context, vendor scope fields and task prerequisites.

## Persistence and deployment

- Local default: SQLite file `backend/celebrai.db`; new databases are created from current metadata. Existing databases must be upgraded with `alembic upgrade head`.
- Alembic revisions `0001_create_events`, `0002_event_context` and `0003_planner_focus` create/migrate the event table; the latest persists the selected AI specialist focus. A migration smoke test should be rerun after each schema change.
- SQLite is the executable local default; deployment can set `DATABASE_URL` to PostgreSQL and run migrations before serving. The connected Vercel account currently lists no projects; no deployment is claimed.
- No authentication in this prototype; it is for single-user/local demo use. Do not expose personal event data publicly until auth, authorization, quotas, and privacy controls are implemented.

## AI boundary

- `PlannerProvider` isolates the generator from route and business logic.
- Gemini key is read only in backend process from `GEMINI_API_KEY`; model output is untrusted and validated before persistence.
- Network call has a bounded timeout and sanitized error response. No provider key is sent to the browser.
- Without credentials or on provider failure, the request returns a deterministic, explicitly labeled demo result; it does not claim live AI generation. The supplied Challenge 5 summary requires GenAI integration, so a real key and live test are still required before that criterion can be demonstrated.

## Key decisions

- SQLite default lowers setup friction for a working demo; PostgreSQL remains available through `DATABASE_URL`.
- Budget math is deterministic application logic rather than delegated to a model. The ≥20% overrun threshold and confirmation-only scenarios are product defaults, not user-selected settings.
- Delayed prerequisite tasks preview descendant shifts and cannot be confirmed if any shift would pass the event date; statuses are retained.
- Primary product persona: budget-conscious wedding planners in regional Indian cities; the event categories from the original brief remain available.
- User-provided provider/quote details are not enriched or verified. “Lowest” is only the lowest entered estimate, not a quality recommendation.
- Auth is excluded rather than implemented incompletely; limitation is explicit.
