# backend/settings.py
from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Online Exam System"
    VERSION: str = "1.0.0"
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    # JWT / Key files
    PRIVATE_KEY_PATH: str = "secrets/private.pem"
    PUBLIC_KEY_PATH: str = "secrets/public.pem"
    JWT_ALGORITHM: str = "RS256"

    # Token lifetimes
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 200

    # Cookie / CORS
    COOKIE_SECURE: bool = False  # set to True in production (HTTPS)
    CORS_ORIGINS: List[str] = ["*"]  # adjust to your Vite origin

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
