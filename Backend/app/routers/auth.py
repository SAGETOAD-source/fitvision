"""
auth.py

Three endpoints:
  POST /auth/signup - create an account, returns a token immediately
                       (no separate "verify email" step for now)
  POST /auth/login   - exchange email+password for a token
  GET  /auth/me       - protected route, proves a token actually works

Every other protected route in the app (onboarding, routines, workout
sessions - once they exist) will use the same
app.auth.dependencies.get_current_user dependency this router proves
out here.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.auth.dependencies import InvalidCredentialsError, get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.db.database import get_session
from app.db.models import User
from app.exceptions import EmailAlreadyRegisteredError
from app.models.schemas import LoginRequest, SignupRequest, TokenResponse, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing is not None:
        raise EmailAlreadyRegisteredError(f"An account with email '{body.email}' already exists")

    user = User(email=body.email, hashed_password=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if user is None or not verify_password(body.password, user.hashed_password):
        # Deliberately the same error for "no such user" and "wrong password" -
        # revealing which one it was lets an attacker enumerate valid emails.
        raise InvalidCredentialsError("Incorrect email or password")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserPublic)
def read_current_user(current_user: User = Depends(get_current_user)):
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at.isoformat(),
    )
