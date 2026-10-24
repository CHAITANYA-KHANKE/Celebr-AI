# Celebrai — Requirements & Traceability

## Evidence and scope decisions

- Workspace was inspected before building; it was initially empty.
- The user supplied a detailed summary of the Hack2skill PromptWars Virtual Challenge 5 explainer. This is the working source for the challenge-specific acceptance criteria below; organizer-dashboard rules were not independently checked.
- I accessed only a partial transcript excerpt from the public video and did not watch the full session end-to-end.
- **Primary persona selected:** budget-conscious couples planning weddings in regional Indian cities. Wedding planning is the default and receives the strongest budget/adaptation focus; birthday and community-event flows remain supported.

## Product requirements and implementation status

| ID  | Requirement                                                                             | Implementation evidence                                                                                                                                                                                    | Status / limit                                                                     |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| R1  | Support wedding, birthday and community-event briefs                                    | Event wizard and category-aware plans                                                                                                                                                                      | Implemented; wedding-first positioning                                             |
| R2  | Capture event facts, ranked priorities, must-haves, guest age mix and venue constraints | Validated wizard/API; top-three ordered priorities, optional must-haves, children/older-adult counts and bounded venue notes persist to SQL columns                                                        | Implemented; age counts are approximate and optional                               |
| R3  | Allocate budget with priority-aware trade-offs                                          | Category/guest-sensitive allocation weights; projected-cost calculation; at ≥120% of budget, preview cuts that protect first priority/must-haves; interactive reallocation simulator requires confirmation | Implemented as estimates; changes never apply silently or claim market prices      |
| R4  | Adapt if brief changes without losing work                                              | Replan on edit; preserve actuals, custom lines, task status and vendor quote fields; include new event context in regeneration                                                                             | Implemented and integration-tested; live AI depends on a configured key            |
| R5  | Create and safely reschedule sequenced milestones                                       | Dependency gates; delaying a prerequisite previews downstream dates, preserves statuses and requires confirmation; shifts beyond event date cannot be applied                                              | Implemented; schedule remains a planning aid, not a supplier guarantee             |
| R6  | Coordinate vendors and compare service quotes                                           | User-entered options compare service scope, guest coverage, inclusions and extra charges; tailored negotiation prompts guide like-for-like questions                                                       | Implemented; providers and estimates are not fabricated or verified                |
| R7  | Generate personalized ideas and make GenAI integration visible                          | Server-side Gemini adapter receives selected focus plus ranked priorities, must-haves, age mix and venue constraints; strict output validation and explicit fallback                                       | Adapter implemented; a live request remains unverified until user configures a key |
| R12 | Let users choose an AI planning specialist and explicitly submit their event brief      | Five focus modes; focus passes through demo/live planning, persists, and shapes recommendations; final-step data disclosure and required submit confirmation                                               | Implemented and tested; no live Gemini call is claimed                             |
| R8  | Preserve user-entered facts and avoid false vendor/price claims                         | Deterministic budget/date logic; estimates labeled; vendor availability/prices not claimed                                                                                                                 | Implemented                                                                        |
| R9  | Save, revisit and export plans                                                          | SQLAlchemy persistence; CSV/JSON export                                                                                                                                                                    | Implemented locally; no public deployment                                          |
| R10 | Responsive and accessible web interface                                                 | Semantic React UI, keyboard controls, responsive CSS, status messaging                                                                                                                                     | Automated/spot checks only; no full screen-reader certification                    |
| R11 | Tests and truthful evaluation                                                           | Backend/frontend tests, lint, format, build and evaluation report                                                                                                                                          | Implemented; see current outcomes below                                            |

## Challenge and submission criteria from the user-provided summary

- Required model integration: Google AI Studio/Gemini, Vertex AI, Firebase GenAI, or a related AI API. Celebrai has a server-side Gemini adapter; the workspace currently has **no key configured**, so this local preview remains demo mode. A valid live request and screen recording still need to be performed with the user's key.
- Four submission artifacts are described as compulsory: deployed web-app URL, GitHub repository URL, public/viewable demo-video URL, and LinkedIn post URL describing architecture, prompt flow and GenAI integration (with screenshots).
- The summary says a maximum of three attempts are permitted and only the **last** submission is evaluated. Confirm this in the official dashboard before submitting.
- Instagram Reels are described as optional and separate from core grading.
- Three evaluation pillars are described: problem alignment, effective GenAI/prompt integration, and code quality/architecture. No official numeric weights are supplied here or invented.
- Any statement about a final winning score or guaranteed acceptance is outside the evidence and is not claimed.

## Explicit remaining work / constraints

- No Gemini credential, Vercel project (the connected account currently lists none), local Git remote, public demo-video URL or LinkedIn post URL is available here. The GitHub connector is unsupported in this conversation. No deploy, push or external submission is claimed; those artifacts remain outstanding.
- No live Gemini call, cloud deployment, PostgreSQL integration test or real-browser E2E was performed.
- Authentication and per-user ownership are absent. Do not host private event data publicly until those controls are implemented.
- Budget numbers are allocations generated from the user's own total, not local prices or vendor quotes; compare like-for-like estimates manually.
- No official numeric scoring weights or authenticated dashboard view were available.
