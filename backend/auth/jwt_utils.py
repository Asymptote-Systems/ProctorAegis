# backend/auth/jwt_utils.py
import uuid
import datetime
from jose import jwt, JWTError
from typing import Tuple, Dict, Any

from backend.settings import settings

# lazily load keys once
with open(settings.PRIVATE_KEY_PATH, "rb") as f:
    _PRIVATE_KEY = f.read()

with open(settings.PUBLIC_KEY_PATH, "rb") as f:
    _PUBLIC_KEY = f.read()


def _now():
    return datetime.datetime.utcnow()


def create_access_token(subject: str, role: str) -> Tuple[str, str]:
    """
    Returns (token, jti)
    """
    now = _now()
    jti = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
        "jti": jti,
        "type": "access",
    }
    token = jwt.encode(payload, _PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def create_refresh_token(subject: str) -> Tuple[str, str]:
    now = _now()
    jti = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)).timestamp()),
        "jti": jti,
        "type": "refresh",
    }
    token = jwt.encode(payload, _PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def decode_token(token: str) -> Dict[str, Any]:
    """Verify signature and expiration. Raises JWTError on failure."""
    try:
        payload = jwt.decode(token, _PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise
