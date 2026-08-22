"""
Password hashing helpers. Uses werkzeug's built-in hashing (already a
Flask dependency, no extra package needed) rather than storing or
comparing raw passwords anywhere.
"""

from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)
