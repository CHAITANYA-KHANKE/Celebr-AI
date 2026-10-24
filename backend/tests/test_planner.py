from datetime import date, timedelta

import httpx
import pytest
from pydantic import ValidationError

from app.ai_provider import AIEnhancements, GeminiProvider
from app.planner import build_plan, generate_plan
from app.schemas import EventBrief, EventSave


def brief(**overrides):
    base = {
        "name": "Garden celebration",
        "category": "Wedding",
        "event_date": (date.today() + timedelta(days=90)).isoformat(),
        "location": "Nagpur, Maharashtra",
        "guest_count": 120,
        "budget": 240000,
        "currency": "INR",
        "theme_preference": "Sunset garden",
        "preferences": "Warm and local",
        "dietary_needs": "Vegetarian options",
        "accessibility_needs": "Step-free route",
        "priority_order": ["Food & catering", "Photography", "Guest comfort & access"],
        "must_haves": ["Food & catering"],
        "children_count": 12,
        "older_adult_count": 20,
        "venue_constraints": "Outdoor garden; step-free route; 10 pm noise curfew.",
    }
    return EventBrief.model_validate({**base, **overrides})


def test_plan_allocations_sum_to_total_and_preserve_event_facts():
    event = brief()
    plan = build_plan(event)
    assert sum(item.planned for item in plan.budget.allocations) == pytest.approx(event.budget)
    assert plan.budget.total == event.budget
    assert "Nagpur" in plan.overview
    assert "120" in plan.overview
    assert plan.mode == "demo"
    assert plan.vendors and all(not item.name for item in plan.vendors)
    assert all(item.estimate is None for item in plan.vendors)
    assert all(item.due_date <= event.event_date for item in plan.tasks)
    personal = next(item for item in plan.recommendations if item.category == "Personal touches")
    assert "Warm and local" in personal.description
    tradeoff = next(item for item in plan.recommendations if "budget" in item.category.casefold())
    assert "per guest" in tradeoff.description
    task_ids = {task.id for task in plan.tasks}
    assert all(set(task.depends_on).issubset(task_ids) for task in plan.tasks)
    venue = next(task for task in plan.tasks if task.title == "Shortlist a venue")
    priorities = next(task for task in plan.tasks if task.title == "Set your planning priorities")
    assert priorities.id in venue.depends_on


def test_selected_specialist_shapes_demo_recommendations():
    plan = build_plan(brief(planner_focus="vendors"))
    assert plan.recommendations[0].category == "Vendor quote focus"
    assert "itemized inclusions" in plan.recommendations[0].description


def test_guest_pressure_shifts_wedding_estimates_toward_per_guest_needs():
    intimate = build_plan(brief(guest_count=80))
    large = build_plan(brief(guest_count=350))
    intimate_food = next(row for row in intimate.budget.allocations if row.category == "Food & drink")
    large_food = next(row for row in large.budget.allocations if row.category == "Food & drink")
    intimate_decor = next(
        row for row in intimate.budget.allocations if row.category == "Decor & atmosphere"
    )
    large_decor = next(row for row in large.budget.allocations if row.category == "Decor & atmosphere")
    assert large_food.planned / large.budget.total > intimate_food.planned / intimate.budget.total
    assert large_decor.planned / large.budget.total < intimate_decor.planned / intimate.budget.total
    assert sum(row.planned for row in large.budget.allocations) == pytest.approx(large.budget.total)


def test_priorities_must_haves_and_guest_context_shape_the_plan():
    baseline = build_plan(brief(priority_order=[], must_haves=[]))
    personalized = build_plan(
        brief(
            priority_order=["Food & catering", "Photography", "Guest comfort & access"],
            must_haves=["Food & catering"],
        )
    )
    base_food = next(row for row in baseline.budget.allocations if row.category == "Food & drink")
    chosen_food = next(row for row in personalized.budget.allocations if row.category == "Food & drink")
    assert chosen_food.planned > base_food.planned
    assert "must-have" in chosen_food.rationale
    assert "priority" in chosen_food.rationale
    welcome = next(item for item in personalized.recommendations if item.category == "Guest experience")
    assert "12 children" in welcome.description
    assert "20 older guests" in welcome.description
    assert "10 pm noise curfew" in welcome.description
    with pytest.raises(ValidationError, match="cannot exceed"):
        brief(children_count=101, older_adult_count=20)


def test_plan_rejects_invalid_task_dependency_and_out_of_order_completion():
    plan = build_plan(brief())
    payload = plan.model_dump(mode="json")
    payload["tasks"][0]["depends_on"] = [payload["tasks"][0]["id"]]
    with pytest.raises(ValidationError, match="Task dependencies"):
        type(plan).model_validate(payload)

    payload = plan.model_dump(mode="json")
    venue_task = next(task for task in payload["tasks"] if task["title"] == "Shortlist a venue")
    venue_task["status"] = "Done"
    with pytest.raises(ValidationError, match="prerequisite"):
        type(plan).model_validate(payload)


def test_all_event_categories_have_reusable_category_specific_vendor_checklists():
    expected = {
        "Wedding": "Ceremony & reception space",
        "Birthday": "Party space",
        "Community event": "Community space",
    }
    for category, first_service in expected.items():
        plan = build_plan(brief(category=category))
        assert plan.vendors[0].service == first_service
        assert len(plan.tasks) >= 5
        assert plan.recommendations


def test_ai_output_rejects_unexpected_or_oversized_fields():
    with pytest.raises(ValidationError):
        AIEnhancements.model_validate(
            {
                "theme": "A theme",
                "recommendations": [],
                "risks": [],
                "assumptions": [],
                "untrusted_extra": "ignored?",
            }
        )


def test_provider_timeout_returns_explicit_demo_not_fake_ai():
    class BrokenProvider:
        def configured(self):
            return True

        def generate(self, event):
            raise httpx.ReadTimeout("private low-level details")

    plan = generate_plan(brief(), BrokenProvider())
    assert plan.mode == "demo"
    assert "demo" in plan.mode_note.lower()


def test_gemini_prompt_receives_ranked_event_context_without_exposing_key_in_prompt(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": (
                                        '{"theme":"Garden glow","recommendations":'
                                        '[{"category":"Budget","title":"Protect food","description":"Keep the chosen menu priority."},'
                                        '{"category":"Access","title":"Keep routes clear","description":"Confirm access details."},'
                                        '{"category":"Local","title":"Use seasonal details","description":"Choose reusable elements."}],'
                                        '"risks":[{"title":"Weather change","mitigation":"Confirm a covered option."},'
                                        '{"title":"Late costs","mitigation":"Review estimates before confirming."}],"assumptions":[]}'
                                    )
                                }
                            ]
                        }
                    }
                ]
            }

    class FakeClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, url, *, headers, json):
            captured.update({"url": url, "headers": headers, "body": json})
            return FakeResponse()

    monkeypatch.setattr("app.ai_provider.httpx.Client", FakeClient)
    provider = GeminiProvider(api_key="unit-test-secret")
    provider.generate(brief(planner_focus="budget"))
    prompt = captured["body"]["contents"][0]["parts"][0]["text"]
    assert '"priority_order": ["Food & catering", "Photography", "Guest comfort & access"]' in prompt
    assert '"children_count": 12' in prompt
    assert '"venue_constraints": "Outdoor garden; step-free route; 10 pm noise curfew."' in prompt
    assert '"planner_focus": "Budget coach"' in prompt
    assert "selected planning specialist" in prompt.lower()
    assert "unit-test-secret" not in prompt
    assert captured["headers"]["x-goog-api-key"] == "unit-test-secret"


def test_saved_plan_cannot_change_critical_budget_or_put_task_after_event():
    event = brief()
    plan = build_plan(event)
    payload = {**event.model_dump(mode="json"), "plan": plan.model_dump(mode="json")}
    payload["plan"]["budget"]["total"] = event.budget + 1
    with pytest.raises(ValidationError, match="match the event budget"):
        EventSave.model_validate(payload)

    payload["plan"]["budget"]["total"] = event.budget
    for task in payload["plan"]["tasks"]:
        task["depends_on"] = []
    payload["plan"]["tasks"][0]["due_date"] = (event.event_date + timedelta(days=1)).isoformat()
    with pytest.raises(ValidationError, match="after the event date"):
        EventSave.model_validate(payload)
