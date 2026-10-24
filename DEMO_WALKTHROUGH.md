# Celebrai — 4-minute Challenge 5 Demo Walkthrough

## Before recording

- Start the API and frontend; verify `/api/health` reports `ai_configured: true` if you intend to show live Gemini. If not, present the output honestly as **Demo plan · not live AI**.
- Use a made-up sample brief and a test provider quote; do not show private data or imply provider prices/availability are verified.
- Keep a clean browser tab and enable screen recording. The demo video is a required submission artifact per the user-provided session summary.

## Walkthrough

1. **Focused persona (20 sec):** show the wedding-first landing message for budget-conscious couples in regional Indian cities; point out that birthday and community-event flows are still supported.
2. **Choose a specialist and submit (35 sec):** select Budget coach (or another focus), then enter a wedding brief in Nagpur; add date, guests, budget, ranked priorities, one must-have, children/older-adult estimates, venue limits and access/dietary needs. Read the disclosure: Celebrai receives the brief; live Gemini forwards event details/notes to Google. Confirm explicitly before submitting. Avoid guest names, contact details and unnecessary sensitive information; credentials stay server-side.
3. **Generation and allocation (30 sec):** show mode status, budget per guest and category shares. Explain that stated priorities and must-haves affect deterministic allocations; values are planning estimates, not local quotes.
4. **Budget scenarios (45 sec):** simulate an increase to photography and review the exact category changes before confirming. Then enter an actual that pushes projected cost to ≥120% of budget; show the options to reduce uncommitted lower-priority lines, revisit guest count or increase budget. Do not apply a scenario until the explicit confirmation action.
5. **Replanning and task delays (45 sec):** edit guest count/date and show saved actuals, task statuses and vendor data remain. In Timeline, preview a prerequisite delay, inspect shifted descendants and the event-date guard, then confirm a feasible schedule shift.
6. **Quote comparison (40 sec):** enter two user-supplied estimates for the same service, record covered guest counts, inclusions and extra charges, then expand the service-specific negotiation prompts. Say clearly that Celebrai does not verify providers or estimates.
7. **Saved plan and export (20 sec):** revisit the event from saved plans and export CSV/JSON. Mention the relational persistence path and supported deployment configuration.
8. **Close truthfully (20 sec):** identify React/TypeScript, FastAPI/Pydantic, SQLAlchemy, SQLite locally, and the server-side Gemini adapter. Share real GitHub/deployed/video/LinkedIn links only after those artifacts exist. State that this prototype has no authentication.
