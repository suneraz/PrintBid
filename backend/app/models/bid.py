"""
A Bid is a print shop's offer on a customer's inquiry. rank_score is
filled in by the rule-based bid ranking logic (Price 40%, Rating 30%,
Completion time 20%, Previous completed orders 10%, per the proposal)
once all bids for an inquiry are in.
"""

from datetime import datetime, timezone

from app.extensions import db


class Bid(db.Model):
    __tablename__ = "bids"

    id = db.Column(db.Integer, primary_key=True)
    inquiry_id = db.Column(db.Integer, db.ForeignKey("inquiries.id"), nullable=False)
    print_shop_id = db.Column(db.Integer, db.ForeignKey("print_shops.id"), nullable=False)
    bid_price = db.Column(db.Float, nullable=False)
    estimated_completion_days = db.Column(db.Integer, nullable=False)
    message = db.Column(db.Text)
    rank_score = db.Column(db.Float)
    status = db.Column(db.Enum("pending", "accepted", "rejected", name="bid_status"), default="pending", nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    inquiry = db.relationship("Inquiry", back_populates="bids")
    print_shop = db.relationship("PrintShop", back_populates="bids")
    order = db.relationship("Order", back_populates="bid", uselist=False)

    __table_args__ = (
        db.UniqueConstraint("inquiry_id", "print_shop_id", name="uq_inquiry_shop_bid"),
    )

    def __repr__(self):
        return f"<Bid {self.id} inquiry={self.inquiry_id} shop={self.print_shop_id} price={self.bid_price}>"
