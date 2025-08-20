# backend/schemas_auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    csrf_token: str
    user: dict  # { id, email, role }

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    csrf_token: str
    user: dict

class ResetPasswordRequest(BaseModel):
    old_password: str
    new_password: str
