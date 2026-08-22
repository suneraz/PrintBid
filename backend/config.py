"""
Flask configuration.

Nothing sensitive is hard-coded here. Every value is read from
environment variables (loaded from a local .env file that is never
committed to git - see .env.example for the template).
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Used to sign session cookies and other security-related tokens.
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

    # Used to sign JWT access/refresh tokens for login sessions.
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")

    # MySQL connection, built from individual pieces so no full
    # connection string (with a password inside it) needs to be typed
    # or committed anywhere.
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "3306")
    DB_NAME = os.environ.get("DB_NAME", "printbid")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Angular dev server origin, so the frontend can call this API
    # during development without CORS blocking it.
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:4200").split(",")
