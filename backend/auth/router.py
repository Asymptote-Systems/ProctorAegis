# backend/auth/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from backend import crud, schemas  # existing project schemas (AuditLog, etc.)
from backend import models
from backend.auth import jwt_utils, passwords
from backend.auth.dependencies import require_role
from backend.schemas_auth import LoginRequest, TokenResponse, RefreshResponse, ResetPasswordRequest
from backend.settings import settings
from backend.database import get_db


router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_options():
    return {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": "lax",
        "path": "/",
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")

    if not user:
        # audit
        crud.create_audit_log(db, obj_in=schemas.AuditLogCreate(
            user_id=None, action="LOGIN_FAILED", resource_type="auth", resource_id=None,
            ip_address=ip, user_agent=ua, old_values={}, new_values={"email": payload.email}
        ))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not passwords.verify_password(payload.password, user.password_hash):
        crud.create_audit_log(db, obj_in=schemas.AuditLogCreate(
            user_id=user.id, action="LOGIN_FAILED", resource_type="auth", resource_id=None,
            ip_address=ip, user_agent=ua, old_values={}, new_values={"reason": "bad_password"}
        ))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # create tokens
    access_token, _ = jwt_utils.create_access_token(subject=str(user.id), role=user.role.value)
    refresh_token, refresh_jti = jwt_utils.create_refresh_token(subject=str(user.id))

    # CSRF token generation
    import uuid
    csrf_token = str(uuid.uuid4())

    # store refresh_jti and csrf token inside user.extra_data (single-session)
    crud.set_user_refresh_jti(db, user, refresh_jti)
    crud.set_user_csrf_token(db, user, csrf_token)

    cookie_opts = _cookie_options()
    # set httpOnly refresh cookie
    response.set_cookie("refresh_token", refresh_token,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
                        **cookie_opts)
    # also set a non-httpOnly csrf cookie (frontend can read this)
    response.set_cookie("csrf_token", csrf_token,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
                        httponly=False, secure=settings.COOKIE_SECURE, samesite="lax", path="/")

    # audit success
    crud.create_audit_log(db, obj_in=schemas.AuditLogCreate(
        user_id=user.id, action="LOGIN_SUCCESS", resource_type="auth", resource_id=None,
        ip_address=ip, user_agent=ua, old_values={}, new_values={}
    ))

    return {"access_token": access_token, "token_type": "bearer", "csrf_token": csrf_token,
            "user": {"id": str(user.id), "email": user.email, "role": user.role.value}}


@router.post("/refresh", response_model=RefreshResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Refresh endpoint:
      - expects refresh_token cookie (httponly)
      - expects header X-CSRF-Token which must match user's stored csrf token
    """
    refresh_cookie = request.cookies.get("refresh_token")
    header_csrf = request.headers.get("X-CSRF-Token")

    if not refresh_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    try:
        payload = jwt_utils.decode_token(refresh_cookie)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = payload.get("sub")
    jti = payload.get("jti")
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # verify CSRF header against stored user csrf token
    stored_csrf = crud.get_user_csrf_token(user)
    if not header_csrf or header_csrf != stored_csrf:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token invalid")

    stored_jti = crud.get_user_refresh_jti(user)
    if stored_jti is None or stored_jti != jti:
        # possible reuse or session invalidated
        crud.clear_user_refresh_jti(db, user)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid or rotated")

    # rotate: issue new refresh token and update stored jti + new csrf
    access_token, _ = jwt_utils.create_access_token(subject=str(user.id), role=user.role.value)
    new_refresh_token, new_refresh_jti = jwt_utils.create_refresh_token(subject=str(user.id))
    import uuid
    new_csrf = str(uuid.uuid4())

    crud.set_user_refresh_jti(db, user, new_refresh_jti)
    crud.set_user_csrf_token(db, user, new_csrf)

    cookie_opts = _cookie_options()
    response.set_cookie("refresh_token", new_refresh_token,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
                        **cookie_opts)
    response.set_cookie("csrf_token", new_csrf,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
                        httponly=False, secure=settings.COOKIE_SECURE, samesite="lax", path="/")

    # audit
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")
    crud.create_audit_log(db, obj_in=schemas.AuditLogCreate(
        user_id=user.id, action="REFRESH", resource_type="auth", resource_id=None,
        ip_address=ip, user_agent=ua, old_values={}, new_values={}
    ))

    return {"access_token": access_token, "token_type": "bearer", "csrf_token": new_csrf,
            "user": {"id": str(user.id), "email": user.email, "role": user.role.value}}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Clears stored refresh_jti and csrf token and clears cookies.
    Requires refresh cookie to exist.
    """
    refresh_cookie = request.cookies.get("refresh_token")
    header_csrf = request.headers.get("X-CSRF-Token")
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")

    if not refresh_cookie:
        # still clear cookie values client-side
        response.delete_cookie("refresh_token", path="/")
        response.delete_cookie("csrf_token", path="/")
        return {"msg": "logged out"}

    try:
        payload = jwt_utils.decode_token(refresh_cookie)
    except Exception:
        response.delete_cookie("refresh_token", path="/")
        response.delete_cookie("csrf_token", path="/")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = crud.get_user_by_id(db, user_id)
    if not user:
        response.delete_cookie("refresh_token", path="/")
        response.delete_cookie("csrf_token", path="/")
        return {"msg": "logged out"}

    stored_csrf = crud.get_user_csrf_token(user)
    if header_csrf and stored_csrf and header_csrf != stored_csrf:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token invalid")

    # clear server-side refresh and csrf
    crud.clear_user_refresh_jti(db, user)

    # clear cookies client-side
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("csrf_token", path="/")

    crud.create_audit_log(db, obj_in=schemas.AuditLogCreate(
        user_id=user.id, action="LOGOUT", resource_type="auth", resource_id=None,
        ip_address=ip, user_agent=ua, old_values={}, new_values={}
    ))

    return {"msg": "logged out"}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db), current_user=Depends(require_role(models.UserRole.ADMIN, models.UserRole.TEACHER, models.UserRole.STUDENT))):
    """
    Authenticated user changes password (requires providing old password).
    """
    user = current_user
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")

    if not passwords.verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password does not match")

    new_hash = passwords.hash_password(payload.new_password)
    crud.update_user_password(db, user, new_hash)
    # clear refresh tokens -> force re-login
    crud.clear_user_refresh_jti(db, user)

    crud.create_audit_log(db, obj_in=schemas.AuditLogCreate(
        user_id=user.id, action="PASSWORD_RESET", resource_type="auth", resource_id=None,
        ip_address=ip, user_agent=ua, old_values={}, new_values={}
    ))

    return {"msg": "password updated"}
