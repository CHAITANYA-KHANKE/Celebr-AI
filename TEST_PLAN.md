# Celebrai — Test Plan & Executed Checks

## Backend coverage

- Event input validation: supported categories/currency, dates/counts/budget/text bounds, top-three priority uniqueness, must-have bounds and age-mix totals.
- Planner output: category-, guest- and priority-sensitive allocations sum to total; recommendations incorporate must-haves, age mix and venue constraints; no fake providers/quotes.
- Budget scenarios: projected totals use max(planned, actual) per category; priority-cut and category-increase previews preserve must-haves/actuals and require explicit application; unfunded cases remain visible.
- Task sequencing: dependencies validate references, dates, cycles and completion gates; date-shift helper covers descendants, preserves statuses, leaves unrelated tasks unchanged and flags event-date overflow.
- Adaptation: replanning preserves actual spend, task status, custom lines and quote scope; browser storage backfills fields for older local records.
- Vendor management: guest coverage, inclusions, extra charges, negotiation prompts, comparison, persistence and export.
- Provider: strict output schema; prompt-context test confirms structured fields and keeps the key out of prompt text; missing key/timeout use labeled demo mode.
- Persistence/export: SQLite create/list/read/update; Alembic fresh migration and upgrade; CSV includes event context and quote scope, and neutralizes formula-leading cells.

## Frontend coverage

- Wizard validation and category selection; select a specialist focus, verify explicit sharing consent gates submission, and capture priorities, must-haves, demographic estimates and venue constraints.
- Primary app integration: create event → ≥20% overrun preview → allocation what-if and explicit application → prerequisite delay preview and confirmation → dependency gate → vendor coverage/scope/extras and negotiation prompts → event edit → preserve saved work.
- Trade-off helper tests: projected cost, protected cuts, category increase funding and unfunded edge cases.
- Task-shift tests: transitive descendants, independent-task stability, completed-status retention and event-date overflow.
- Adaptation tests: allocation totals, matching/preserving quote fields, date shift and dependency remapping; local-storage backfill test.
- Demo planner tests for priority weighting, guest sensitivity, and explicit demo label.
- Axe WCAG A/AA semantic scan on the wizard's first step; priority-step audit still requires an updated run; contrast is measured separately because jsdom has no browser layout.
- Strict TypeScript, Prettier, production build and npm audit.

## Current recorded outcomes (2026-10-24)

- Backend: `pytest -q` — **13 passed**.
- Backend: `ruff check app tests alembic`, `ruff format --check app tests alembic` and `pip check` — passed.
- Frontend: `npm test -- --run` — **21 passed across 8 files**, including specialist selection, focus-aware demo output, and required explicit share confirmation.
- Frontend: `npm run typecheck`, `npm run build`, and `npm run format:check` — passed after formatting.
- Dependency audit: `npm audit --audit-level=moderate` — **0 vulnerabilities reported**.
- SQLite Alembic fresh install and upgrade from `0002_event_context` to `head` — passed; both ended at `0003_planner_focus` with 21 event columns and the specialist-focus field.
- Vite-proxied API smoke — `/api/health` and `/api/plans/generate` returned HTTP 200; health reports `ai_configured: false`, `mode: demo`; a `vendors` focus returned the matching quote-coach recommendation.
- Axe WCAG A/AA semantic checks — passed on the wizard first and priority steps with color contrast excluded. jsdom logs a non-failing missing-canvas warning during axe execution.

## Not executed

- Live Gemini generation (no key configured), public cloud deployment, GitHub push, real-browser Playwright/Cypress E2E, PostgreSQL integration, full screen-reader/browser accessibility audit, or end-to-end public submission flow.
