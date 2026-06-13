"""add review_schedules (spaced repetition)

Adds the ReviewSchedule table that backs the SM-2 (simplified) spaced
repetition scheduler. One row per (user, question), with the next due_at
indexed for efficient "due now" lookups.

Revision ID: b7c2d1e4f5a6
Revises: 3a19efab9c45
Create Date: 2026-06-13 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c2d1e4f5a6'
down_revision: Union[str, Sequence[str], None] = '3a19efab9c45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'review_schedules',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('tenant_id', sa.String(), nullable=True),
        sa.Column('question_id', sa.String(), nullable=True),
        sa.Column('skill_id', sa.String(), nullable=True),
        sa.Column('repetitions', sa.Integer(), nullable=True),
        sa.Column('ease_factor', sa.Float(), nullable=True),
        sa.Column('interval_days', sa.Float(), nullable=True),
        sa.Column('due_at', sa.DateTime(), nullable=True),
        sa.Column('last_reviewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'question_id', name='uq_review_user_question'),
    )
    op.create_index(op.f('ix_review_schedules_id'), 'review_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_review_schedules_due_at'), 'review_schedules', ['due_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_review_schedules_due_at'), table_name='review_schedules')
    op.drop_index(op.f('ix_review_schedules_id'), table_name='review_schedules')
    op.drop_table('review_schedules')
