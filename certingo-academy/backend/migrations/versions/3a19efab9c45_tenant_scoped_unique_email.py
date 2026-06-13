"""tenant scoped unique email

Replace the global unique index on users.email with a composite unique
constraint on (tenant_id, email), keeping a plain (non-unique) index on email.

Revision ID: 3a19efab9c45
Revises: 86394ff7b8ba
Create Date: 2026-06-13 01:09:08.660030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a19efab9c45'
down_revision: Union[str, Sequence[str], None] = '86394ff7b8ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the global unique index on email (plain DROP INDEX works on SQLite)
    op.drop_index(op.f('ix_users_email'), table_name='users')

    # SQLite cannot ALTER TABLE ... ADD CONSTRAINT, so use batch mode (table rebuild)
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_users_tenant_email', ['tenant_id', 'email'])

    # Recreate the email index as non-unique
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_email'), table_name='users')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_tenant_email', type_='unique')

    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
