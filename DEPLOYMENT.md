# Celebrai — Deployment Guide

## Status

No cloud deployment was performed from this workspace. The connected Vercel account currently lists no projects; this workspace has no Git repository/remote, and the GitHub connector is unsupported in this conversation. The competition's permitted hosting choices and dashboard fields were not verified; confirm them with the organizer before publishing/submitting.

## Recommended topology

- Static frontend build (`npm run build`) served over HTTPS.
- FastAPI service served over HTTPS, reachable by the browser at a stable API origin.
- Managed PostgreSQL database for durable deployed data. Do not deploy private events on an unauthenticated public API.

### Vercel preparation (not yet configured)

- Recommended split: deploy the Vite frontend to Vercel and host FastAPI plus PostgreSQL on a backend-capable service, unless you intentionally configure and test a Vercel Python-function deployment. Set `VITE_API_BASE_URL` to the HTTPS API origin at frontend build time and set backend `CORS_ORIGINS` to the exact Vercel origin.
- Add `GEMINI_API_KEY` only to the backend host's server-side secret store—never as a `VITE_*` value and never in chat. Verify `/api/health` reports AI-ready and complete one actual keyed generation before claiming live Gemini.
- No Vercel project was available to attach settings to. Create/select a project and choose the backend topology before deployment; the current preview is local only.
- GitHub push is not complete. No Git remote is configured; the GitHub connector is unsupported in this conversation. Do not call code in this workspace a public repository.

## Build and configure

1. Build the frontend: `npm ci && npm run build`.
2. Run the backend from `backend/`: install `requirements-postgres.txt`, set `DATABASE_URL=postgresql+psycopg://...`, and set `CORS_ORIGINS` to the exact frontend origin(s).
3. Apply schema before starting the service: `alembic upgrade head`. If adopting a legacy database created by `create_all` without an Alembic revision row, back it up, verify it exactly matches revision `0001_create_events`, then stamp that revision and upgrade to head; never stamp an unverified schema.
4. Set `VITE_API_BASE_URL=https://your-api-origin.example` at frontend build time. Leave it blank for same-origin hosting/proxying.
5. For the Challenge 5 GenAI demonstration, add `GEMINI_API_KEY` only to the backend secret manager. Never add the key to the frontend build environment. Verify one real request and keep the demo fallback behavior for provider outages.
6. Configure the static host or edge proxy to serve `dist/` and point API requests to the backend. Verify `/api/health`, plan generation, create/read/update, and exports from the actual deployed origin.

## Before public access

This prototype has no authentication or per-user ownership model. Add identity, authorization, API rate limits, request quotas, HTTPS enforcement, backups, retention/deletion controls, monitoring without sensitive payloads, and a privacy review before hosting real user event data. CORS is not authorization.

## Operational checks

- Verify all expected browser origins against the production `CORS_ORIGINS` list.
- Confirm migrations work against an empty PostgreSQL database and upgrades are backed up.
- Test AI missing-key, provider timeout, malformed output, and provider quota behavior.
- Confirm event estimates are visibly estimates and no vendor is presented as verified.
- Run `npm audit`, frontend tests/build and backend tests in CI.
- Record the deployed URL and a short demo video only after those items are actually completed.
