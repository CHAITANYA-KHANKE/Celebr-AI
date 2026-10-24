from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Event
from .schemas import EventSave


def create_event(session: Session, data: EventSave) -> Event:
    values = data.model_dump(exclude={"plan"})
    event = Event(**values, aggregate=data.plan.model_dump(mode="json"))
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def get_event(session: Session, event_id: UUID) -> Event | None:
    return session.get(Event, str(event_id))


def list_events(session: Session, limit: int = 50) -> list[Event]:
    statement = select(Event).order_by(Event.updated_at.desc()).limit(limit)
    return list(session.scalars(statement))


def update_event(session: Session, event: Event, data: EventSave) -> Event:
    values = data.model_dump(exclude={"plan"})
    for key, value in values.items():
        setattr(event, key, value)
    event.aggregate = data.plan.model_dump(mode="json")
    event.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(event)
    return event
