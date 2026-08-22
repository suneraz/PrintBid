"""
A Review is left by the customer after an order is completed. One
review per order.
"""

from datetime import datetime, timezone

from app.extensions import db


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer_profiles.id"), nullable=False)
    print_shop_id = db.Column(db.Integer, db.ForeignKey("print_shops.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    order = db.relationship("Order", back_populates="review")
    customer = db.relationship("CustomerProfile")
    print_shop = db.relationship("PrintShop")

    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
    )

    def __repr__(self):
        return f"<Review {self.id} order={self.order_id} rating={self.rating}>"
