# Celebrai

A wedding-first celebration planner for budget-conscious planners in regional Indian cities, while keeping birthday and community-event flows available. Users choose an AI specialist—All-round, Budget coach, Theme & guest experience, Vendor quote coach, or Timeline & logistics—then submit an event brief through a clear disclosure and confirmation step. Discovery captures ranked priorities, must-haves, children/older-adult mix and venue constraints. Budget tools preview priority-aware reallocations and 20%+ overrun scenarios for explicit approval; timeline delays preview dependent date shifts; vendor comparisons capture scope, guest coverage, inclusions and extra charges without inventing or verifying businesses or prices.

> **AI honesty:** with no `GEMINI_API_KEY`, Celebrai uses a deterministic planner and labels the result **Demo plan · not live AI**. The Challenge 5 summary you supplied requires model integration, so configure and verify a live Gemini request before competition submission. Vendor names, availability and real quotes are never invented; allocations are planning estimates only.

## Stack

- React, TypeScript, Vite, accessible custom CSS
- FastAPI, Pydantic, SQLAlchemy
- SQLite for local demo; PostgreSQL-compatible `DATABASE_URL`
- Server-side Gemini REST integration with deterministic demo fallback (live key required to demonstrate the challenge's GenAI criterion)

## Quick start

### 1. Backend

```bash
cp .env.example .env
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A fresh local SQLite database can be created automatically at `backend/celebrai.db`. For a migration-managed database, run `alembic upgrade head` from `backend/` before starting the API. Migration `0002_event_context` adds persisted priorities, must-haves, guest-age counts and venue constraints; `0003_planner_focus` persists the selected AI specialist. If an older local database was created by SQLAlchemy `create_all` and has no Alembic revision table, back it up and verify it matches revision `0001_create_events` before using `alembic stamp 0001_create_events && alembic upgrade head`; do not stamp an unverified schema.

### 2. Frontend

In another terminal, from the repository root:

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the Vite URL shown in the terminal. Vite proxies `/api` to FastAPI on port 8000.

### Live Gemini (needed for the challenge's GenAI demonstration)

Set `GEMINI_API_KEY` in the backend environment (never in Vite/client variables). Set `GEMINI_MODEL` if needed. Gemini receives the event brief, selected specialist focus, ranked priorities, must-haves, age mix and venue constraints and shapes recommendations around that focus; budget arithmetic, priority-weighted allocations, overrun previews, scenario rebalancing, event facts and dependency dates remain application logic. Editing event details requests a refreshed plan; actual spend, completed tasks, vendor records and entered quotes are preserved. Provider output is validated; failures fall back to a visibly labeled demo plan. The wizard states that Celebrai receives the brief and, in live mode, sends its event details and notes to Google Gemini; the user must explicitly confirm before submission. The API key stays server-side. Avoid guest names, contact details and unnecessary sensitive information. Do not commit a real `.env` file.

## Database

Local setup uses SQLite, requiring no service. To use PostgreSQL, set a SQLAlchemy URL such as `postgresql+psycopg://...` in `DATABASE_URL`, install the optional driver with `pip install -r requirements-postgres.txt`, then apply migrations:

```bash
cd backend
alembic upgrade head
```

For a new deployment, keep secrets in the host's secret manager and configure `CORS_ORIGINS` to the frontend origin. This prototype has no authentication; do not host private event data publicly without adding auth and per-user authorization.

## Tests and build

```bash
cd backend && pytest -q && ruff check app tests alembic && ruff format --check app tests alembic
cd .. && npm test
npm run typecheck
npm run build
npm run format:check
npm audit
```

Use the test outcomes, not this template, as the source of truth for readiness.

## Demo walkthrough

1. Open Celebrai and choose **Plan a celebration**.
2. Choose an AI planner focus, then enter a wedding, birthday or community gathering with date, city, guest count, budget/currency, ranked top-three priorities, optional must-haves, children/older-adult counts and venue constraints.
3. Review the data-sharing disclosure, explicitly confirm, then submit; note the visible mode label (demo unless a Gemini key is configured).
4. In Budget, try a what-if change (for example, raise photography) and inspect the suggested shifts before confirming. A projection at least 20% over budget offers priority-aware alternatives; no changes apply without your approval.
5. In Timeline, preview a prerequisite delay, inspect downstream milestone dates, and confirm only if the full shift stays on or before the event date.
6. In Vendors, compare entered estimates using service scope, covered guest count, inclusions and extra charges; use service-specific negotiation prompts. These are user-entered details, not verified quotes.
7. Edit the event to change guests, priorities or date; verify the plan adapts while actuals, completed statuses and vendor details remain.
8. Reopen the saved event and export its plan as CSV or JSON.

## Project documents

- [Requirements](REQUIREMENTS.md) · [Architecture](ARCHITECTURE.md) · [Evaluation matrix](EVALUATION_MATRIX.md)
- [Implementation plan](IMPLEMENTATION_PLAN.md) · [Security plan](SECURITY_PLAN.md) · [Test plan](TEST_PLAN.md)
- [Evaluation report](EVALUATION_REPORT.md) · [Deployment guide](DEPLOYMENT.md) · [Submission checklist](SUBMISSION_CHECKLIST.md)
- [Demo walkthrough](DEMO_WALKTHROUGH.md) · [LinkedIn post draft](LINKEDIN_POST_DRAFT.md)

## Challenge/submission note

The detailed session summary you supplied says a live GenAI/API integration and four external artifacts are required: deployed web app, GitHub repo, demo video and LinkedIn post. This workspace has code and a LinkedIn draft, but those public links are not created here. The connected Vercel account currently lists no projects, and no GitHub remote is configured in this workspace, so deployment/push remain separate steps. Never paste a secret into chat; add Gemini credentials only through a server-side secret manager after the backend/project exists. Your summary also says only the last of up to three submissions is evaluated; verify that rule in the organizer dashboard before submitting. The partial transcript I accessed suggested builder tools were flexible, while the original prompt mentioned Antigravity as required; Antigravity was not available here, so confirm any separate builder-tool rule and disclose actual tooling truthfully.
