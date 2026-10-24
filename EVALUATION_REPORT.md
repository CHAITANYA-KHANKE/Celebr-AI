# Celebrai — Challenge 5 Evaluation Report

**Assessment date:** 2026-10-24  
**Rubric basis:** the user-provided Challenge 5 summary plus the partial organizer transcript previously retrieved. The three pillars in the supplied summary and technical signals from the accessible excerpt are documented in `EVALUATION_MATRIX.md`. **No official weights, score or winning outcome is invented.**  
**Persona:** budget-conscious wedding planners in regional Indian cities; birthday and community-event support remains available.

## Executive assessment

The blueprint audit gaps identified in the previous pass have been implemented locally: structured ranked priorities/must-haves and guest/venue context; priority-aware budget allocations and confirmed scenario previews; downstream task-date shift previews; and vendor quote comparisons that include service scope, guest coverage, inclusions, extra charges and negotiation prompts. Persistence, browser-local compatibility, API contracts, tests and documentation were updated.

The app remains in **demo mode** because there is no Gemini API key configured and no live model request was made. There is no public deployment, GitHub URL, demo-video URL or LinkedIn post URL. The connected Vercel account lists no projects; the GitHub connector is unsupported in this conversation and no local Git remote exists. These external artifacts are not complete.

The user selected an AI planning specialist workflow and left the sharing UX to the implementation. The app now offers five AI focus modes and requires explicit confirmation after disclosing that live Gemini sends event data/notes to Google. Separate earlier defaults remain assumptions—not user-confirmed settings: top three ranked priorities plus optional must-haves; trigger overrun scenarios at projected cost ≥120% of budget and require explicit confirmation; preview dependent-task shifts before applying.

## Pillar 1 — Problem-statement alignment

**Implemented**

- Event discovery captures the user-selected AI planner focus (All-round, Budget, Experience, Vendors, or Timeline), up to three ordered priorities, optional must-haves, approximate children/older-adult counts and bounded venue constraints. Focus is persisted, supplied to Gemini when configured and reflected in demo recommendations. Final submission requires explicit confirmation after the data-sharing disclosure.
- Deterministic allocations respond to event category, guest count and selected priorities/must-haves; totals remain tied to the entered budget. These are planning estimates, not local market pricing.
- Projected cost uses the higher of a category's planned amount or recorded actual. At 20%+ over budget, the interface previews eligible cuts to uncommitted lower-priority allocations, protects the top-ranked priority/must-haves and actuals, and offers guest-count/budget alternatives. Nothing changes until the user confirms.
- The what-if simulator can increase a selected allocation (such as photography), preview available buffer and candidate category shifts, and show any unfunded remainder before the user applies it.
- Delaying a prerequisite previews transitive dependent-date shifts. Completion statuses stay unchanged; shifts past the event date are shown but cannot be applied.
- Quote comparison captures user-entered service scope, guest count covered, inclusions and extra charges; service-specific negotiation questions support like-for-like requests. Provider identity, quote accuracy, quality and availability are not verified.
- Event replanning continues to preserve actual spending, task statuses, custom budget lines and vendor quote details. Older browser-local records receive safe defaults for newly added fields.
- Alembic migration `0002_event_context` persists structured discovery fields; `0003_planner_focus` persists the chosen AI specialist. Fresh and upgrade smokes pass. CSV/JSON export includes the selected focus and event context.

**Limitations**

- Allocation weights and guest-count savings are planning heuristics, not validated local price data or guaranteed savings.
- The guest-count option is explicitly labeled rough; fixed costs and provider re-quotes can change the result.
- The reusable timeline is not a venue, legal or supplier deadline guarantee.

## Pillar 2 — Effective GenAI / prompt integration

**Implemented in source**

- Gemini is called only from the backend after the user submits the brief. The prompt includes selected specialist focus, category, location, guests, budget/per-guest context, ranked priorities, must-haves, age mix, venue constraints, preferences, dietary and accessibility needs.
- User-entered data is treated as untrusted context; the prompt asks for priority-aware trade-offs and forbids invented businesses, contacts, availability, market prices or quotes.
- Model output is schema-validated. Core budget math, event facts, user-confirmed scenarios and dependency dates remain application-controlled.
- A mocked provider test verifies the new context reaches the prompt and the key is not embedded in prompt text. Missing-key/provider failures return a clearly labeled demo plan.

**Not verified**

- No live Gemini request, actual model response or provider quota behavior is claimed. Configure the key in a server-side secret manager and verify one real request before describing the app as live AI.

## Pillar 3 — Code quality & architecture

- React/TypeScript/Vite frontend, FastAPI/Pydantic API, SQLAlchemy persistence and Alembic migrations remain separated by responsibility.
- New focused helpers cover budget trade-offs, downstream schedule shifts, and browser-record backfills. Quote comparisons and adaptation preserve user-entered scope fields.
- Current automated outcomes: backend **13 passed**; frontend **21 passed across 8 files**; Ruff, Prettier, typecheck, production build and `pip check` pass; `npm audit` reports **0 vulnerabilities**.
- Fresh and `0002_event_context`-to-head SQLite migration smokes passed: **21 event columns**, revision `0003_planner_focus`. Vite-proxied health and focus-aware generation returned HTTP 200 in labeled demo mode.
- No independent code review, clean-clone install, CI run or deployed review has been performed.

## Supporting technical signals

- **Security:** no model key in frontend; strict API/output schemas and CSV formula neutralization. No authentication, per-user ownership isolation or rate limiting; do not host private event data publicly.
- **Efficiency:** deterministic calculations and a bounded model request; no load test or measured live-provider latency.
- **Testing:** UI flow covers overrun and what-if confirmation, delay preview, vendor scope/coverage/extras, and event replan preservation. No real-browser E2E, PostgreSQL integration or live AI test.
- **Accessibility:** axe semantic checks passed on the wizard's first and priority steps with color contrast disabled. No full browser-wide, screen-reader or comprehensive contrast audit is claimed; jsdom emitted a non-failing canvas API warning during axe execution.

## Required submission artifacts still missing

Per the user's supplied summary: deployed web app; GitHub repository; public/viewable demo video; LinkedIn post with architecture, prompt flow, GenAI details and screenshots. `LINKEDIN_POST_DRAFT.md` and `DEMO_WALKTHROUGH.md` are preparation aids only. Instagram Reel is described as optional. The summary says only the last of up to three attempts is evaluated; confirm the rule in the official portal.

## Tool and AI disclosure

- This code was developed in Arena Agent Mode with local project tools. Google Antigravity was not available in this workspace; the original prompt mentions it while the partial transcript suggested builder-tool choice was flexible. Verify any separate builder-tool requirement and disclose actual tools truthfully.
- The source includes a server-side Gemini REST adapter, but the current local preview has no key and therefore uses deterministic demo planning.

## Recommendation

The code now covers the identified blueprint gaps and automated local checks pass. **It is not submission-ready yet:** configure and test live GenAI, choose/create the Vercel project and backend/database topology, establish a GitHub repository, run final checks on the intended release commit, and create/verify the public video and LinkedIn artifacts. Add authentication/ownership controls before public use with private event data.
