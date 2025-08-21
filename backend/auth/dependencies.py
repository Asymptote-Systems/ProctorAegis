# backend/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend import crud, models
from backend.auth import jwt_utils
from backend.settings import settings
from backend.database import get_db

http_bearer = HTTPBearer(auto_error=False)


def get_current_user(db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Depends(http_bearer)):
    """
    Validate Authorization: Bearer <access_token>
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt_utils.decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid or expired")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = crud.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_role(*allowed_roles):
    """
    Usage in route: current_user = Depends(require_role(UserRole.ADMIN))
    """
    # normalize to strings
    allowed = [r.value if hasattr(r, "value") else str(r) for r in allowed_roles]

    def _checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role is None or current_user.role.value not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return current_user

    return _checker
