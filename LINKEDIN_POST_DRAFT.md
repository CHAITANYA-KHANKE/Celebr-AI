# LinkedIn Challenge 5 Post — Draft (review before publishing)

> **Do not publish as-is.** First configure a Gemini key, verify at least one real model call, deploy the app, record a public demo, and replace every bracketed link. If no live call was made, keep the demo-mode disclosure and do not describe the app as live-AI tested.

## Draft post

I built **Celebrai**, a wedding-first celebration-planning web app for budget-conscious couples in regional Indian cities. Birthday and community-event plans are also supported.

The challenge was to go beyond a list of generic party ideas and connect the planning pieces:

- **Context-aware discovery:** planners choose an AI specialist focus (All-round, Budget coach, Theme & guest experience, Vendor quote coach, Timeline & logistics), rank up to three priorities, mark must-haves, estimate children/older-adult counts and note venue limits. A final disclosure and explicit submit confirmation precede brief sharing.
- **Adaptive budget:** allocations respond to event category, guest count and stated priorities. A projection ≥20% over budget previews trade-offs, and a what-if simulator shows allocation changes before the planner confirms them; no cost line is silently cut. Editing event details refreshes the plan while preserving actual spend, task statuses and vendor quote scope.
- **Sequenced timeline:** generated milestones have prerequisites. Delaying a task previews dependent dates and requires confirmation before applying; completion statuses stay intact.
- **Vendor coordination:** users record guest coverage, inclusions and extra charges and compare entered estimates for matching services; negotiation prompts help ask the same scope questions. The app does not invent or verify providers, quotes or availability.
- **Responsible GenAI:** after the user confirms the disclosure, the backend sends the selected specialist focus and structured event context to Gemini for tailored planning guidance. The prompt treats user-entered text as untrusted data, requests priority-aware trade-offs, and forbids fabricated businesses/prices. Structured model output is validated before display. Budget arithmetic, event facts and task dates remain application logic. Without a valid model configuration, the app shows a clearly labeled deterministic demo plan.

**Architecture:** React + TypeScript + Vite frontend → FastAPI/Pydantic API → server-side Gemini adapter → SQLAlchemy persistence (SQLite locally; PostgreSQL is a deployment option). The API key is a backend environment secret, never a frontend variable.

**Evidence and links:**

- Deployed web app: [ADD PUBLIC URL]
- GitHub repository: [ADD REPOSITORY URL]
- Public demo video: [ADD YOUTUBE/DRIVE URL]
- Screenshots: [ATTACH LANDING, ADAPTIVE BUDGET, DEPENDENCY TIMELINE, QUOTE COMPARISON]

**AI disclosure:** [STATE whether a live Gemini request was tested, the model used, and whether the recorded demo shows live AI or labeled demo mode.]

This is a prototype, not a verified vendor marketplace. Providers, estimates, availability and quality must be confirmed directly. Authentication and per-user data isolation are not included yet.

#PromptWars #Hack2Skill #GenAI #Gemini #EventPlanning

## Screenshot/video capture checklist

1. Wedding-first landing page, selected AI specialist, and discovery showing priorities/must-haves.
2. Final share disclosure/confirmation and live/demo mode label.
3. Budget what-if simulation and ≥20% overrun scenario; show confirmation before applying.
4. Task prerequisites plus downstream delay preview and confirmation.
5. Side-by-side estimates with guest coverage, inclusions, extras and negotiation prompts.
6. A completed task/recorded actual and quote scope retained after replanning.

Do not claim official scores, winning status, verified local prices, or security certification.
