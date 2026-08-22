"""
Base user table. Every person who can log in - customers, print shop
owners, and admins - has one row here. Role-specific details live in
separate tables (CustomerProfile, PrintShop) linked back to this one,
so this table only holds what's common to every user type.
"""

from datetime import datetime, timezone

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("customer", "print_shop", "admin", name="user_role"), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    customer_profile = db.relationship("CustomerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    print_shop = db.relationship("PrintShop", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.id} {self.email} ({self.role})>"
