"""persist the chosen AI planner focus

Revision ID: 0003_planner_focus
Revises: 0002_event_context
"""

import sqlalchemy as sa

from alembic import op

revision = "0003_planner_focus"
down_revision = "0002_event_context"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("planner_focus", sa.String(length=40), nullable=False, server_default="all_round"),
    )


def downgrade() -> None:
    op.drop_column("events", "planner_focus")
