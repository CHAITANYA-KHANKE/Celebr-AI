"""create events table

Revision ID: 0001_create_events
Revises:
"""

import sqlalchemy as sa

from alembic import op

revision = "0001_create_events"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("guest_count", sa.Integer(), nullable=False),
        sa.Column("budget", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("theme_preference", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("preferences", sa.String(length=1200), nullable=False, server_default=""),
        sa.Column("dietary_needs", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("accessibility_needs", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("aggregate", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("guest_count >= 1", name="ck_events_guest_count_positive"),
        sa.CheckConstraint("budget > 0", name="ck_events_budget_positive"),
    )
    op.create_index("ix_events_name", "events", ["name"])
    op.create_index("ix_events_category", "events", ["category"])
    op.create_index("ix_events_event_date", "events", ["event_date"])


def downgrade() -> None:
    op.drop_index("ix_events_event_date", table_name="events")
    op.drop_index("ix_events_category", table_name="events")
    op.drop_index("ix_events_name", table_name="events")
    op.drop_table("events")
