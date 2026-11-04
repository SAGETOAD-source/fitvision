"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-04 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)

    op.create_table(
        'userprofile',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('body_goal', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('focus_area', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('onboarding_completed', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_userprofile_user_id'), 'userprofile', ['user_id'], unique=True)

    op.create_table(
        'workoutsession',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('session_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('exercise', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('rep_count', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workoutsession_session_id'), 'workoutsession', ['session_id'], unique=False)
    op.create_index(op.f('ix_workoutsession_user_id'), 'workoutsession', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_workoutsession_user_id'), table_name='workoutsession')
    op.drop_index(op.f('ix_workoutsession_session_id'), table_name='workoutsession')
    op.drop_table('workoutsession')
    op.drop_index(op.f('ix_userprofile_user_id'), table_name='userprofile')
    op.drop_table('userprofile')
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_table('user')
