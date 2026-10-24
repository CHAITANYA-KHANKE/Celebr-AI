# Celebrai — Security Plan

## In-scope controls

- Keep Gemini credentials server-side in environment configuration; `.env.example` contains placeholders only.
- The wizard discloses that Celebrai receives the brief and live Gemini forwards event details/notes to Google; explicit confirmation gates submission. Users are cautioned against entering guest names, contact details, or unnecessary sensitive information.
- Validate and bound all incoming strings, dates, guest counts, budgets, currency, arrays, and nested plan updates with Pydantic.
- Use SQLAlchemy ORM with bound parameters; never build SQL from user strings. Database checks also enforce positive guest counts and budgets.
- Restrict browser origins using `CORS_ORIGINS`; configure production origins explicitly.
- Bound provider timeout and response size; treat model output as untrusted, parse/validate against strict schemas, reject malformed output, and return generic errors.
- Avoid logging request bodies, contact details, secrets, or full model responses.
- Neutralize spreadsheet-formula-leading text in CSV exports; React renders user/model text as escaped text rather than HTML.
- Use server-computed budget balances and export persisted state only.

## Important limitation

This prototype has no authentication, user identity, or event ownership checks. Any reachable API can read/update event IDs. Keep it local or behind trusted access. Before public deployment, add authentication, server-side ownership authorization, rate limits, abuse controls, secure deployment secrets, HTTPS, backups, retention/deletion policy, and privacy review.

## Verification checklist

- [x] Scan repository and built client for obvious key/private-key patterns; none found, and `GEMINI_API_KEY` is not in the built client.
- [x] Automated tests reject invalid dates, negative budgets, excessive counts and oversized text; database positive-budget/guest constraints are migration-tested.
- [x] Mocked provider timeout returns labeled demo output without including provider exception text.
- [x] Default CORS is restricted to localhost; production allowlist is configurable. A deployed origin was not tested.
- [x] Export integration test reads saved state; CSV formula-leading text is neutralized.
- [x] No certification or complete security assurance is claimed.
