"""
dependencies.py (auth)

get_current_user: the dependency every protected route uses. Reads
the JWT from the Authorization header, validates it, and loads the
matching User from the DB - or raises a clean 401 via our existing
FitVisionError handling if anything's wrong (expired token, tampered
token, deleted user, etc).
"""

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
from starlette.requests import Request

from app.auth.security import decode_access_token
from app.db.database import get_session
from app.db.models import User
from app.exceptions import FitVisionError
from starlette import status


class OAuth2PasswordBearerWithFitVisionError(OAuth2PasswordBearer):
    """
    FastAPI's OAuth2PasswordBearer raises its own bare HTTPException
    (shape: {"detail": "..."}) when no Authorization header is
    present at all - bypassing our consistent {error, detail,
    request_id} error format used everywhere else. This subclass
    catches that one case and re-raises as our own error type instead,
    so a missing token and an invalid token return the same shape.

    NOTE: the `request: Request` type annotation below is required,
    not decorative - FastAPI inspects it via reflection to know this
    parameter should be injected as the incoming request, rather than
    treated as a required client-supplied field. Dropping the
    annotation silently turns every call into a 422 validation error
    instead of running this method at all - caught by
    tests/test_auth.py during development.
    """

    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except HTTPException as exc:
            raise InvalidCredentialsError(exc.detail or "Not authenticated") from exc


oauth2_scheme = OAuth2PasswordBearerWithFitVisionError(tokenUrl="/auth/login")


class InvalidCredentialsError(FitVisionError):
    status_code = status.HTTP_401_UNAUTHORIZED


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise InvalidCredentialsError("Invalid or expired token")

    user = session.get(User, int(user_id))
    if user is None or not user.is_active:
        raise InvalidCredentialsError("User not found or inactive")

    return user
