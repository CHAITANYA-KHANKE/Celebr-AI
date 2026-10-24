from __future__ import annotations

import csv
import io
import json
import logging
import os
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session

from . import models
from .ai_provider import GeminiProvider
from .database import Base, engine, get_session
from .planner import generate_plan
from .repository import create_event, get_event, list_events, update_event
from .schemas import EventBrief, EventRecord, EventSave, GenerateResponse, HealthResponse

logging.basicConfig(level=os.getenv("LOG_LEVEL", "WARNING"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Celebrai API", version="0.1.0", lifespan=lifespan)
origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


from fastapi.responses import JSONResponse


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 1_048_576:
        return JSONResponse(status_code=413, content={"detail": "Payload too large (max 1MB)."})

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


def _record(event: models.Event) -> EventRecord:
    payload = {
        "id": event.id,
        "name": event.name,
        "category": event.category,
        "event_date": event.event_date,
        "location": event.location,
        "guest_count": event.guest_count,
        "budget": event.budget,
        "currency": event.currency,
        "theme_preference": event.theme_preference,
        "preferences": event.preferences,
        "dietary_needs": event.dietary_needs,
        "accessibility_needs": event.accessibility_needs,
        "priority_order": event.priority_order,
        "must_haves": event.must_haves,
        "children_count": event.children_count,
        "older_adult_count": event.older_adult_count,
        "venue_constraints": event.venue_constraints,
        "planner_focus": event.planner_focus,
        "plan": event.aggregate,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
    }
    return EventRecord.model_validate(payload)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    configured = GeminiProvider().configured()
    return HealthResponse(
        status="ok", ai_configured=configured, mode="ai-ready" if configured else "demo"
    )


@app.post("/api/plans/generate", response_model=GenerateResponse)
def create_plan(event: EventBrief) -> GenerateResponse:
    return GenerateResponse(plan=generate_plan(event))


@app.get("/api/events", response_model=list[EventRecord])
def events(
    limit: int = Query(default=30, ge=1, le=100), session: Session = Depends(get_session)
) -> list[EventRecord]:
    return [_record(item) for item in list_events(session, limit)]


@app.post("/api/events", response_model=EventRecord, status_code=status.HTTP_201_CREATED)
def save_event(data: EventSave, session: Session = Depends(get_session)) -> EventRecord:
    return _record(create_event(session, data))


@app.get("/api/events/{event_id}", response_model=EventRecord)
def read_event(event_id: UUID, session: Session = Depends(get_session)) -> EventRecord:
    event = get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return _record(event)


@app.put("/api/events/{event_id}", response_model=EventRecord)
def replace_event(
    event_id: UUID, data: EventSave, session: Session = Depends(get_session)
) -> EventRecord:
    event = get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return _record(update_event(session, event, data))


@app.get("/api/events/{event_id}/export")
def export_event(
    event_id: UUID,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    session: Session = Depends(get_session),
) -> Response:
    event = get_event(session, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    record = _record(event).model_dump(mode="json")
    safe_name = (
        "".join(char.lower() if char.isalnum() else "-" for char in event.name).strip("-")[:40]
        or "celebrai-event"
    )
    if format == "json":
        return Response(
            json.dumps(record, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.json"'},
        )
    output = io.StringIO(newline="")
    writer = csv.writer(output)

    def safe_cell(value: object) -> object:
        if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
            return "'" + value
        return value

    def write_row(values: list[object]) -> None:
        writer.writerow([safe_cell(value) for value in values])

    write_row(
        ["section", "category", "title", "date_or_status", "planned_or_estimated", "actual", "notes"]
    )
    write_row(
        [
            "Event",
            event.category,
            event.name,
            event.event_date.isoformat(),
            f"{event.currency} {event.budget:.2f}",
            "",
            " · ".join(
                value
                for value in [
                    event.location,
                    f"Planner focus: {record['planner_focus'].replace('_', ' ')}",
                    f"Priorities: {', '.join(record['priority_order'])}" if event.priority_order else "",
                    f"Must-haves: {', '.join(record['must_haves'])}" if event.must_haves else "",
                    f"Children: {event.children_count}; older adults: {event.older_adult_count}",
                    f"Venue constraints: {event.venue_constraints}" if event.venue_constraints else "",
                ]
                if value
            ),
        ]
    )
    write_row(["Plan", "Theme", record["plan"]["theme"], "", "", "", record["plan"]["overview"]])
    for idea in record["plan"]["recommendations"]:
        write_row(["Idea", idea["category"], idea["title"], "", "", "", idea["description"]])
    for risk in record["plan"]["risks"]:
        write_row(["Contingency", "Risk", risk["title"], "", "", "", risk["mitigation"]])
    for row in record["plan"]["budget"]["allocations"]:
        write_row(["Budget", row["category"], "", "", row["planned"], row["actual"], row["rationale"]])
    task_titles = {str(task["id"]): task["title"] for task in record["plan"]["tasks"]}
    for task in record["plan"]["tasks"]:
        prerequisites = ", ".join(
            task_titles[dependency]
            for dependency in task.get("depends_on", [])
            if dependency in task_titles
        )
        notes = " · ".join(
            value
            for value in [task["description"], f"Depends on: {prerequisites}" if prerequisites else ""]
            if value
        )
        write_row(
            [
                "Timeline",
                "Task",
                task["title"],
                f"{task['due_date']} · {task['status']}",
                "",
                "",
                notes,
            ]
        )
    for vendor in record["plan"]["vendors"]:
        details = " · ".join(
            value
            for value in [
                vendor["contact"],
                f"Coverage: {vendor['coverage_guests']} guests" if vendor["coverage_guests"] else "",
                f"Includes: {vendor['included_items']}" if vendor["included_items"] else "",
                f"Extra charges: {vendor['extra_charges']}" if vendor["extra_charges"] else "",
                vendor["notes"],
            ]
            if value
        )
        write_row(
            [
                "Vendor",
                vendor["category"],
                vendor["name"] or vendor["service"],
                vendor["status"],
                vendor["estimate"] if vendor["estimate"] is not None else "",
                "",
                details,
            ]
        )
    return Response(
        "\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.csv"'},
    )
