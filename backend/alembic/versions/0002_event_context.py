"""persist ranked event context

Revision ID: 0002_event_context
Revises: 0001_create_events
"""

import sqlalchemy as sa

from alembic import op

revision = "0002_event_context"
down_revision = "0001_create_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("priority_order", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "events",
        sa.Column("must_haves", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "events",
        sa.Column("children_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "events",
        sa.Column("older_adult_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "events",
        sa.Column("venue_constraints", sa.String(length=500), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("events", "venue_constraints")
    op.drop_column("events", "older_adult_count")
    op.drop_column("events", "children_count")
    op.drop_column("events", "must_haves")
    op.drop_column("events", "priority_order")
