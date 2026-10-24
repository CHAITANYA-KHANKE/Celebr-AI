from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, CheckConstraint, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("guest_count >= 1", name="ck_events_guest_count_positive"),
        CheckConstraint("budget > 0", name="ck_events_budget_positive"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    event_date: Mapped[date] = mapped_column(Date, index=True)
    location: Mapped[str] = mapped_column(String(120))
    guest_count: Mapped[int] = mapped_column(Integer)
    budget: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3))
    theme_preference: Mapped[str] = mapped_column(String(120), default="")
    preferences: Mapped[str] = mapped_column(String(1200), default="")
    dietary_needs: Mapped[str] = mapped_column(String(500), default="")
    accessibility_needs: Mapped[str] = mapped_column(String(500), default="")
    priority_order: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    must_haves: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    older_adult_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    venue_constraints: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    planner_focus: Mapped[str] = mapped_column(String(40), default="all_round", nullable=False)
    aggregate: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
