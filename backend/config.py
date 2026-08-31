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

    # Hosted MySQL providers (Aiven, PlanetScale, etc.) generally
    # require an SSL connection and won't accept a plain one at all.
    # Local development doesn't need this at all, so it's entirely
    # opt-in via DB_SSL_CA - if that variable isn't set (the normal
    # case on your own machine), the connection behaves exactly as it
    # always has, with zero change to local behaviour.
    DB_SSL_CA = os.environ.get("DB_SSL_CA")
    SQLALCHEMY_ENGINE_OPTIONS = (
        {"connect_args": {"ssl": {"ca": DB_SSL_CA}}} if DB_SSL_CA else {}
    )

    # Angular dev server origin, so the frontend can call this API
    # during development without CORS blocking it.
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:4200").split(",")

    # Where uploaded files (inquiry reference images/PDFs, print shop
    # portfolio samples) get saved on disk. Lives outside app/static
    # deliberately - these files need access control (only the
    # owning customer, a shop that can see the inquiry, or an admin),
    # so they're served through an authenticated route rather than
    # Flask's static file handler, which would make them world-readable
    # to anyone with the URL.
    UPLOAD_FOLDER = os.environ.get(
        "UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "app", "uploads")
    )
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB per request
