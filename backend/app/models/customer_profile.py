"""
Extra details specific to customer users. Linked one-to-one with
users where role is "customer".
"""

from datetime import datetime, timezone

from app.extensions import db


class CustomerProfile(db.Model):
    __tablename__ = "customer_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    default_location = db.Column(db.String(150))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="customer_profile")
    inquiries = db.relationship("Inquiry", back_populates="customer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CustomerProfile {self.id} user_id={self.user_id}>"
