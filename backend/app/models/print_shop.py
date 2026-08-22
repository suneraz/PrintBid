"""
Print shop business details. Linked one-to-one with users where role
is "print_shop". New shops start as "pending" and need admin approval
before they can see or bid on inquiries.
"""

from datetime import datetime, timezone

from app.extensions import db


class PrintShop(db.Model):
    __tablename__ = "print_shops"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    business_name = db.Column(db.String(150), nullable=False)
    business_address = db.Column(db.String(255))
    district = db.Column(db.String(100))
    approval_status = db.Column(db.Enum("pending", "approved", "rejected", name="shop_approval_status"), default="pending", nullable=False)
    rating_average = db.Column(db.Float, default=0.0)
    completed_orders_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="print_shop")
    services = db.relationship("ShopService", back_populates="print_shop", cascade="all, delete-orphan")
    portfolio_items = db.relationship("Portfolio", back_populates="print_shop", cascade="all, delete-orphan")
    bids = db.relationship("Bid", back_populates="print_shop", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PrintShop {self.id} {self.business_name} ({self.approval_status})>"
