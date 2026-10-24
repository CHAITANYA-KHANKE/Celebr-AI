import hashlib
import logging
import time
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

import httpx
from pydantic import ValidationError

from .ai_provider import AIEnhancements, GeminiProvider
from .schemas import EventBrief, Plan, PlannerFocus, PlanningPriority

logger = logging.getLogger(__name__)

_PLAN_CACHE: dict[str, tuple[float, Plan]] = {}
_MAX_CACHE_SIZE = 100
_CACHE_TTL = 3600.0  # 1 hour


ALLOCATIONS: dict[str, list[tuple[str, int, str]]] = {
    "Wedding": [
        ("Food & drink", 28, "Protect guest meals and dietary needs; compare like-for-like menus."),
        ("Venue & setup", 23, "Check capacity, access, inclusions and cancellation terms."),
        ("Attire & ceremony", 12, "Keep personal priorities; rent or reuse where it suits you."),
        ("Decor & atmosphere", 10, "Choose reusable, seasonal or DIY details before one-off decor."),
        ("Photo & memories", 9, "Choose coverage hours around the moments that matter most."),
        ("Music & entertainment", 7, "Match the format to the guest mix and venue constraints."),
        ("Guest comfort & logistics", 5, "Plan access, transport, water and clear wayfinding."),
        ("Contingency reserve", 6, "Hold this buffer for changes; it is not a vendor quote."),
    ],
    "Birthday": [
        ("Food, cake & drinks", 28, "Protect food and dietary needs; keep the menu easy to serve."),
        ("Venue & setup", 18, "Check capacity, access, inclusions and cancellation terms."),
        ("Activities & entertainment", 15, "Choose one or two high-value activities over many extras."),
        ("Decor & atmosphere", 12, "Reuse a few theme details instead of buying a full set."),
        ("Photo & memories", 7, "Plan coverage around key moments rather than the full day."),
        ("Guest comfort & logistics", 8, "Include access, transport and practical setup needs."),
        ("Contingency reserve", 12, "Keep a flexible buffer for last-minute changes."),
    ],
    "Community event": [
        ("Food & refreshments", 24, "Plan portions transparently and label dietary options."),
        ("Venue & permits", 18, "Confirm capacity, access, permissions and terms directly."),
        ("Program & sound", 14, "Prioritize clear sound and the activities attendees value."),
        ("Access & transport", 13, "Make step-free access and travel information visible."),
        ("Equipment & signage", 10, "Borrow or share reusable equipment where possible."),
        ("Volunteer coordination", 6, "Keep roles and handoffs simple and clearly owned."),
        ("Contingency reserve", 15, "Retain a buffer for weather and operational changes."),
    ],
}

# At larger gatherings, shift a modest share toward per-guest needs without changing the total.
GUEST_PRESSURE_ADJUSTMENTS: dict[str, dict[str, int]] = {
    "Wedding": {
        "Food & drink": 6,
        "Venue & setup": 2,
        "Guest comfort & logistics": 2,
        "Attire & ceremony": -2,
        "Decor & atmosphere": -3,
        "Photo & memories": -2,
        "Music & entertainment": -1,
        "Contingency reserve": -2,
    },
    "Birthday": {
        "Food, cake & drinks": 6,
        "Venue & setup": 3,
        "Guest comfort & logistics": 1,
        "Activities & entertainment": -3,
        "Decor & atmosphere": -3,
        "Photo & memories": -1,
        "Contingency reserve": -3,
    },
    "Community event": {
        "Food & refreshments": 5,
        "Venue & permits": 2,
        "Access & transport": 3,
        "Program & sound": -2,
        "Equipment & signage": -2,
        "Volunteer coordination": -2,
        "Contingency reserve": -4,
    },
}


def _matches_priority(category: str, priority: PlanningPriority) -> bool:
    name = category.casefold()
    if priority == PlanningPriority.food:
        return name.startswith("food")
    if priority == PlanningPriority.venue:
        return name.startswith("venue")
    if priority == PlanningPriority.photography:
        return "photo" in name or "memories" in name
    if priority == PlanningPriority.decor:
        return "decor" in name or "styling" in name
    if priority == PlanningPriority.attire:
        return "attire" in name or "ceremony" in name
    if priority == PlanningPriority.entertainment:
        return any(term in name for term in ("music", "activity", "program"))
    if priority == PlanningPriority.guest_comfort:
        return any(term in name for term in ("guest", "comfort", "access"))
    if priority == PlanningPriority.logistics:
        return any(term in name for term in ("logistic", "transport", "access"))
    return name.startswith("other")


def _money(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _allocate(event: EventBrief) -> list[dict[str, object]]:
    decimal_total = Decimal(str(event.budget))
    guest_pressure = max(0.0, min(1.0, (event.guest_count - 80) / 270))
    base_rows = ALLOCATIONS[event.category.value]
    adjustments = GUEST_PRESSURE_ADJUSTMENTS[event.category.value]
    weighted_rows: list[tuple[str, float, str]] = []
    priority_ranks = {priority: index for index, priority in enumerate(event.priority_order)}
    must_haves = set(event.must_haves)
    for category, base_share, rationale in base_rows:
        share = base_share + adjustments.get(category, 0) * guest_pressure
        selected = next(
            (priority for priority in event.priority_order if _matches_priority(category, priority)),
            None,
        )
        if selected is not None:
            share *= (1.18, 1.10, 1.04)[priority_ranks[selected]]
            rationale += " Boosted for a stated priority."
        if any(_matches_priority(category, item) for item in must_haves):
            share *= 1.24
            rationale += " Protected as a must-have."
        weighted_rows.append((category, share, rationale))
    weight_total = sum(share for _, share, _ in weighted_rows)
    shares = [
        (category, share * 100 / weight_total, rationale) for category, share, rationale in weighted_rows
    ]
    rows: list[dict[str, object]] = []
    running = Decimal("0")
    for index, (category, share, rationale) in enumerate(shares):
        if index == len(shares) - 1:
            amount = decimal_total - running
        else:
            amount = (decimal_total * Decimal(str(share)) / Decimal(100)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            running += amount
        rows.append(
            {"category": category, "planned": _money(amount), "actual": 0, "rationale": rationale}
        )
    return rows


def _budget_tradeoff(event: EventBrief) -> dict[str, str]:
    per_guest = Decimal(str(event.budget)) / Decimal(event.guest_count)
    protected = ", ".join(item.value for item in (event.must_haves or event.priority_order[:1]))
    if not protected:
        protected = "guest comfort and access"
    flexible = next(
        (item.value for item in reversed(event.priority_order) if item not in event.must_haves),
        "optional styling or menu format",
    )
    age_note = ""
    if event.children_count or event.older_adult_count:
        age_note = (
            f"Plan for {event.children_count} children and {event.older_adult_count} older guests. "
        )
    return {
        "category": "Budget trade-off",
        "title": "Protect the essentials; flex the extras",
        "description": (
            f"For {event.guest_count:,} guests, {event.currency} {event.budget:,.0f} is about "
            f"{event.currency} {_money(per_guest):,.0f} per guest. Protect {protected}; if needed, "
            f"review {flexible} first. {age_note}Planning guide, not a local quote."
        )[:320],
    }


def _deterministic_creative(event: EventBrief) -> AIEnhancements:
    category = event.category.value
    theme = (
        event.theme_preference
        or {
            "Wedding": "Garden glow, gathered with intention",
            "Birthday": "A little more joy, a lot more you",
            "Community event": "Neighbourhood, in full bloom",
        }[category]
    )
    age_context = (
        f"Plan seating/activities for {event.children_count} children and {event.older_adult_count} older guests. "
        if event.children_count or event.older_adult_count
        else ""
    )
    venue_context = (
        f"Confirm these venue constraints directly: {event.venue_constraints[:70]}. "
        if event.venue_constraints
        else ""
    )
    ideas = [
        {
            "category": "Guest experience",
            "title": "A welcome with a local touch",
            "description": f"Set a welcome moment inspired by {event.location} for {event.guest_count:,} guests. {age_context}{venue_context}Check access and flow with the venue.",
        },
        _budget_tradeoff(event),
        {
            "category": "Food & drink",
            "title": "Make every plate feel considered",
            "description": "Ask caterers for clearly labelled dietary options and one shared menu tasting before confirming quantities.",
        },
        {
            "category": "Atmosphere",
            "title": "A light-touch colour story",
            "description": f"Build around {event.theme_preference or 'warm neutrals and seasonal colour'} with a few repeatable details instead of buying one-off decorations.",
        },
        {
            "category": "Personal touches",
            "title": "Carry one detail through the day",
            "description": (
                f"Let this preference guide one or two details: {event.preferences[:120]}. Keep the rest simple so the personal touch feels intentional."
                if event.preferences
                else "Choose one meaningful color, phrase or tradition and repeat it in a few thoughtful details."
            ),
        },
    ]
    focused_ideas = {
        PlannerFocus.budget: {
            "category": "Budget focus",
            "title": "Start with what matters most",
            "description": "Keep your first-ranked priority and must-haves visible. Compare written, like-for-like estimates before adjusting any category; this planner does not predict guaranteed savings.",
        },
        PlannerFocus.experience: {
            "category": "Theme & guest experience",
            "title": "Make the atmosphere feel personal",
            "description": f"Use {event.theme_preference or 'one meaningful theme detail'} as a repeatable thread, and plan comfort for the guest mix and access needs you shared.",
        },
        PlannerFocus.vendors: {
            "category": "Vendor quote focus",
            "title": "Ask every provider for the same scope",
            "description": f"Request itemized inclusions, extra charges and coverage for {event.guest_count:,} guests. Compare only details you receive and verify directly; no providers or prices are supplied here.",
        },
        PlannerFocus.timeline: {
            "category": "Timeline & logistics",
            "title": "Protect the critical path",
            "description": "Confirm venue access, setup windows and provider lead times early. If a prerequisite slips, preview dependent-date changes before applying them.",
        },
    }
    if event.planner_focus in focused_ideas:
        ideas.insert(0, focused_ideas[event.planner_focus])
    if event.accessibility_needs:
        ideas.append(
            {
                "category": "Accessibility",
                "title": "Comfort is part of the celebration",
                "description": f"Plan for the stated access needs: {event.accessibility_needs[:110]}. Confirm step-free routes, seating and clear signage directly with the venue.",
            }
        )
    if event.dietary_needs:
        ideas.append(
            {
                "category": "Menu",
                "title": "Dietary needs, handled early",
                "description": f"Share these requirements with the food team during the first menu conversation: {event.dietary_needs[:110]}. Confirm allergen handling directly.",
            }
        )
    risks = [
        {
            "title": "Weather or venue disruption",
            "mitigation": "If any part is outdoors, identify an indoor or covered alternative and the decision deadline before booking.",
        },
        {
            "title": "Small costs adding up",
            "mitigation": "Keep the contingency allocation untouched until a real quote is recorded; compare actuals with estimates weekly.",
        },
        {
            "title": "Guest comfort and access",
            "mitigation": "Confirm access routes, seating, dietary handling and transport details with the venue and relevant providers in writing.",
        },
    ]
    assumptions = [
        "All cost allocations are planning estimates, not quotes or verified local prices.",
        "No vendor names, availability or contact details have been supplied or verified.",
        "The event date, budget, guest count and location remain exactly as entered.",
    ]
    return AIEnhancements(theme=theme, recommendations=ideas[:8], risks=risks, assumptions=assumptions)


def _tasks(event: EventBrief) -> list[dict[str, object]]:
    templates = [
        (
            "priorities",
            "Set your planning priorities",
            "Confirm the three details that matter most to your guests.",
            90,
            "High",
            [],
        ),
        (
            "venue",
            "Shortlist a venue",
            "Check capacity, access, weather plan and booking terms.",
            60,
            "High",
            ["priorities"],
        ),
        (
            "menu",
            "Shape the menu",
            "Collect dietary needs and request comparable estimates.",
            35,
            "High",
            ["venue"],
        ),
        (
            "look",
            "Confirm event look & feel",
            "Choose a focused palette and reusable decor direction.",
            28,
            "Medium",
            ["venue"],
        ),
        (
            "run_of_show",
            "Review the run of show",
            "Share arrival, setup and key moments with helpers.",
            14,
            "Medium",
            ["menu", "look"],
        ),
        (
            "logistics",
            "Final guest and logistics check",
            "Reconfirm headcount, access and transport details.",
            7,
            "High",
            ["venue", "menu"],
        ),
        (
            "essentials",
            "Pack the day-of essentials",
            "Bring contacts, confirmations and a small backup kit.",
            1,
            "Low",
            ["run_of_show", "logistics"],
        ),
    ]
    ids = {key: str(uuid4()) for key, *_ in templates}
    today = date.today()
    result = []
    for key, title, description, offset, priority, dependencies in templates:
        due = max(today, event.event_date - timedelta(days=offset))
        result.append(
            {
                "id": ids[key],
                "title": title,
                "description": description,
                "due_date": due.isoformat(),
                "priority": priority,
                "status": "To do",
                "depends_on": [ids[dependency] for dependency in dependencies],
            }
        )
    return sorted(result, key=lambda item: str(item["due_date"]))


def _vendors(event: EventBrief) -> list[dict[str, object]]:
    services = {
        "Wedding": [
            ("Venue", "Ceremony & reception space"),
            ("Catering", "Food and beverage service"),
            ("Decoration", "Flowers and event styling"),
            ("Photography", "Photo and video coverage"),
            ("Music & entertainment", "Sound, music or host"),
            ("Transportation", "Guest mobility"),
        ],
        "Birthday": [
            ("Venue", "Party space"),
            ("Catering", "Food, drinks and cake"),
            ("Decoration", "Theme and table styling"),
            ("Photography", "Photo coverage"),
            ("Music & entertainment", "Music and activities"),
            ("Other", "Invitations and party supplies"),
        ],
        "Community event": [
            ("Venue", "Community space"),
            ("Catering", "Food and refreshments"),
            ("Decoration", "Wayfinding and shared spaces"),
            ("Music & entertainment", "Program and sound"),
            ("Transportation", "Access and transport"),
            ("Other", "Permits, volunteers or equipment"),
        ],
    }[event.category.value]
    return [
        {
            "id": str(uuid4()),
            "category": category,
            "service": service,
            "name": "",
            "contact": "",
            "estimate": None,
            "coverage_guests": None,
            "included_items": "",
            "extra_charges": "",
            "status": "To source",
            "notes": "Example checklist item — add your own provider details.",
        }
        for category, service in services
    ]


def build_plan(
    event: EventBrief,
    enhancements: AIEnhancements | None = None,
    *,
    mode: str = "demo",
    mode_note: str = "",
) -> Plan:
    creative = enhancements or _deterministic_creative(event)
    overview = f"A thoughtful {event.category.value.lower()} for {event.guest_count:,} guests in {event.location}, planned for {event.event_date.isoformat()}."
    recommendations = list(creative.recommendations)
    if not any("budget" in item.category.casefold() for item in recommendations):
        recommendations.insert(0, _budget_tradeoff(event))
    return Plan(
        overview=overview,
        theme=creative.theme,
        budget={"total": event.budget, "allocations": _allocate(event)},
        tasks=_tasks(event),
        vendors=_vendors(event),
        recommendations=recommendations[:20],
        risks=creative.risks,
        assumptions=creative.assumptions,
        mode=mode,
        mode_note=mode_note,
    )


def _brief_cache_key(event: EventBrief, provider_configured: bool) -> str:
    raw = f"{event.model_dump_json(exclude={'event_date'})}:{provider_configured}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generate_plan(event: EventBrief, provider: GeminiProvider | None = None) -> Plan:
    adapter = provider or GeminiProvider()
    cache_key = _brief_cache_key(event, adapter.configured())
    now = time.time()

    if cache_key in _PLAN_CACHE:
        cached_time, cached_plan = _PLAN_CACHE[cache_key]
        if now - cached_time < _CACHE_TTL:
            return cached_plan

    if not adapter.configured():
        plan = build_plan(event, mode="demo", mode_note="Demo plan · not live AI")
    else:
        try:
            creative = adapter.generate(event)
            plan = build_plan(
                event, creative, mode="ai", mode_note="AI-assisted · verify estimates and suggestions"
            )
        except (httpx.HTTPError, ValueError, KeyError, IndexError, ValidationError, RuntimeError):
            logger.warning("AI provider failed; returning labeled demo plan")
            plan = build_plan(
                event, mode="demo", mode_note="AI unavailable · showing deterministic demo plan"
            )

    if len(_PLAN_CACHE) >= _MAX_CACHE_SIZE:
        _PLAN_CACHE.pop(next(iter(_PLAN_CACHE)))
    _PLAN_CACHE[cache_key] = (now, plan)
    return plan
