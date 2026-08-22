"""
Creates an admin account. Deliberately not a public API route - if
"register as admin" existed as a normal endpoint, anyone could sign
up as an admin, which defeats the purpose of having a role at all.

Run with:
    python3 create_admin.py
"""

import getpass

from app import create_app
from app.extensions import db
from app.models import User
from app.utils.security import hash_password

app = create_app()

with app.app_context():
    email = input("Admin email: ").strip()

    if User.query.filter_by(email=email).first():
        print("A user with this email already exists.")
        raise SystemExit(1)

    password = getpass.getpass("Admin password (min 8 characters): ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        raise SystemExit(1)

    full_name = input("Admin full name: ").strip()

    admin = User(
        email=email,
        password_hash=hash_password(password),
        role="admin",
        full_name=full_name,
    )
    db.session.add(admin)
    db.session.commit()

    print(f"Admin account created: {email}")
