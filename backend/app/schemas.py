from __future__ import annotations

from datetime import date, datetime
from enum import Enum
import re
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_DANGEROUS_PATTERNS = re.compile(
    r"(?i)(<script[\s\S]*?>[\s\S]*?<\/script>|<script[\s\S]*?>|javascript:|\bon\w+\s*=|<iframe[\s\S]*?>[\s\S]*?<\/iframe>)",
)
_PROMPT_INJECTION_PATTERNS = re.compile(
    r"(?i)\b(ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s+override|override\s+system\s+prompt)\b",
)


class EventCategory(str, Enum):
    wedding = "Wedding"
    birthday = "Birthday"
    community = "Community event"


class PlannerFocus(str, Enum):
    all_round = "all_round"
    budget = "budget"
    experience = "experience"
    vendors = "vendors"
    timeline = "timeline"


class PlanningPriority(str, Enum):
    food = "Food & catering"
    venue = "Venue"
    photography = "Photography"
    decor = "Decor & styling"
    attire = "Attire & ceremony"
    entertainment = "Entertainment"
    guest_comfort = "Guest comfort & access"
    logistics = "Logistics"
    other = "Other"


class Priority(str, Enum):
    high = "High"
    medium = "Medium"
    low = "Low"


class TaskStatus(str, Enum):
    todo = "To do"
    in_progress = "In progress"
    done = "Done"


class BookingStatus(str, Enum):
    to_source = "To source"
    contacted = "Contacted"
    quoted = "Quoted"
    booked = "Booked"
    confirmed = "Confirmed"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class EventBrief(StrictModel):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    category: EventCategory
    event_date: date
    location: Annotated[str, Field(min_length=2, max_length=120)]
    guest_count: Annotated[int, Field(ge=1, le=100_000)]
    budget: Annotated[float, Field(gt=0, le=1_000_000_000, allow_inf_nan=False)]
    currency: Annotated[str, Field(pattern=r"^(INR|USD|EUR|GBP|AED)$")]
    theme_preference: Annotated[str, Field(max_length=120)] = ""
    preferences: Annotated[str, Field(max_length=1200)] = ""
    dietary_needs: Annotated[str, Field(max_length=500)] = ""
    accessibility_needs: Annotated[str, Field(max_length=500)] = ""
    priority_order: Annotated[list[PlanningPriority], Field(max_length=3)] = Field(default_factory=list)
    must_haves: Annotated[list[PlanningPriority], Field(max_length=9)] = Field(default_factory=list)
    children_count: Annotated[int, Field(ge=0, le=100_000)] = 0
    older_adult_count: Annotated[int, Field(ge=0, le=100_000)] = 0
    venue_constraints: Annotated[str, Field(max_length=500)] = ""
    planner_focus: PlannerFocus = PlannerFocus.all_round

    @field_validator("priority_order", "must_haves")
    @classmethod
    def unique_priorities(cls, value: list[PlanningPriority]) -> list[PlanningPriority]:
        if len(value) != len(set(value)):
            raise ValueError("Priority choices must be unique.")
        return value

    @model_validator(mode="after")
    def guest_mix_within_count(self) -> "EventBrief":
        if self.children_count + self.older_adult_count > self.guest_count:
            raise ValueError("Children and older adult counts cannot exceed the guest count.")
        return self

    @field_validator(
        "name",
        "location",
        "theme_preference",
        "preferences",
        "dietary_needs",
        "accessibility_needs",
        "venue_constraints",
        mode="before",
    )
    @classmethod
    def sanitize_input_strings(cls, value: str) -> str:
        if isinstance(value, str):
            cleaned = value.replace("\x00", "")
            cleaned = _DANGEROUS_PATTERNS.sub("", cleaned)
            cleaned = _PROMPT_INJECTION_PATTERNS.sub("[sanitized]", cleaned)
            return cleaned.strip()
        return value

    @field_validator("name", "location")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("event_date")
    @classmethod
    def date_in_supported_range(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Event date cannot be in the past.")
        if value.year > date.today().year + 10:
            raise ValueError("Event date must be within the next 10 years.")
        return value


class Allocation(StrictModel):
    category: Annotated[str, Field(min_length=1, max_length=80)]
    planned: Annotated[float, Field(ge=0, le=1_000_000_000, allow_inf_nan=False)]
    actual: Annotated[float, Field(ge=0, le=1_000_000_000, allow_inf_nan=False)] = 0
    rationale: Annotated[str, Field(max_length=240)] = ""


class BudgetPlan(StrictModel):
    total: Annotated[float, Field(gt=0, le=1_000_000_000, allow_inf_nan=False)]
    allocations: Annotated[list[Allocation], Field(min_length=1, max_length=30)]


class PlanTask(StrictModel):
    id: UUID
    title: Annotated[str, Field(min_length=2, max_length=120)]
    description: Annotated[str, Field(max_length=300)] = ""
    due_date: date
    priority: Priority
    status: TaskStatus = TaskStatus.todo
    depends_on: Annotated[list[UUID], Field(max_length=12)] = Field(default_factory=list)


class VendorItem(StrictModel):
    id: UUID
    category: Annotated[str, Field(min_length=1, max_length=80)]
    service: Annotated[str, Field(min_length=1, max_length=100)]
    name: Annotated[str, Field(max_length=100)] = ""
    contact: Annotated[str, Field(max_length=180)] = ""
    estimate: Annotated[float | None, Field(ge=0, le=1_000_000_000, allow_inf_nan=False)] = None
    coverage_guests: Annotated[int | None, Field(ge=1, le=100_000)] = None
    included_items: Annotated[str, Field(max_length=500)] = ""
    extra_charges: Annotated[str, Field(max_length=300)] = ""
    status: BookingStatus = BookingStatus.to_source
    notes: Annotated[str, Field(max_length=500)] = ""


class Recommendation(StrictModel):
    category: Annotated[str, Field(min_length=1, max_length=60)]
    title: Annotated[str, Field(min_length=2, max_length=100)]
    description: Annotated[str, Field(min_length=2, max_length=320)]


class Risk(StrictModel):
    title: Annotated[str, Field(min_length=2, max_length=100)]
    mitigation: Annotated[str, Field(min_length=2, max_length=300)]


class Plan(StrictModel):
    overview: Annotated[str, Field(min_length=5, max_length=600)]
    theme: Annotated[str, Field(min_length=2, max_length=140)]
    budget: BudgetPlan
    tasks: Annotated[list[PlanTask], Field(max_length=40)]
    vendors: Annotated[list[VendorItem], Field(max_length=30)]
    recommendations: Annotated[list[Recommendation], Field(max_length=20)]
    risks: Annotated[list[Risk], Field(max_length=12)]
    assumptions: Annotated[list[Annotated[str, Field(max_length=180)]], Field(max_length=10)]
    mode: str = Field(pattern=r"^(ai|demo)$")
    mode_note: Annotated[str, Field(max_length=160)] = ""

    @model_validator(mode="after")
    def valid_task_dependencies(self) -> "Plan":
        tasks_by_id = {task.id: task for task in self.tasks}
        if len(tasks_by_id) != len(self.tasks):
            raise ValueError("Task IDs must be unique.")
        graph = {task.id: task.depends_on for task in self.tasks}
        for task in self.tasks:
            if task.id in task.depends_on or not set(task.depends_on).issubset(tasks_by_id):
                raise ValueError("Task dependencies must reference other tasks in this plan.")
            parents = [tasks_by_id[dependency] for dependency in task.depends_on]
            if any(parent.due_date > task.due_date for parent in parents):
                raise ValueError("A task cannot be due before its prerequisites.")
            if task.status == TaskStatus.done and any(
                parent.status != TaskStatus.done for parent in parents
            ):
                raise ValueError("Complete prerequisite tasks before marking a dependent task done.")

        visiting: set[UUID] = set()
        visited: set[UUID] = set()

        def visit(task_id: UUID) -> None:
            if task_id in visiting:
                raise ValueError("Task dependency cycles are not allowed.")
            if task_id in visited:
                return
            visiting.add(task_id)
            for dependency in graph[task_id]:
                visit(dependency)
            visiting.remove(task_id)
            visited.add(task_id)

        for task_id in graph:
            visit(task_id)
        return self


class EventSave(EventBrief):
    plan: Plan

    @model_validator(mode="after")
    def consistent_budget(self) -> "EventSave":
        if abs(self.plan.budget.total - self.budget) > 0.01:
            raise ValueError("Plan budget total must match the event budget.")
        if any(task.due_date > self.event_date for task in self.plan.tasks):
            raise ValueError("Task deadlines cannot fall after the event date.")
        return self


class EventRecord(EventSave):
    id: UUID
    created_at: datetime
    updated_at: datetime


class GenerateResponse(StrictModel):
    plan: Plan


class HealthResponse(StrictModel):
    status: str
    ai_configured: bool
    mode: str
