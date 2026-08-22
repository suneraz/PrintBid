"""
An Order is created once a customer accepts a bid. Status values
match the proposal's simple status list exactly. OrderStatusHistory
keeps an audit trail every time the status changes, rather than only
storing the current status - useful for the order tracking page and
for resolving disputes later.
"""

from datetime import datetime, timezone

from app.extensions import db

ORDER_STATUSES = ("Confirmed", "In Production", "Ready", "Dispatched", "Delivered", "Completed", "Cancelled")


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    inquiry_id = db.Column(db.Integer, db.ForeignKey("inquiries.id"), nullable=False)
    bid_id = db.Column(db.Integer, db.ForeignKey("bids.id"), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer_profiles.id"), nullable=False)
    print_shop_id = db.Column(db.Integer, db.ForeignKey("print_shops.id"), nullable=False)
    status = db.Column(db.Enum(*ORDER_STATUSES, name="order_status"), default="Confirmed", nullable=False)
    delivery_method = db.Column(db.Enum("self-collection", "delivery", "island-wide courier", name="order_delivery_method"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    inquiry = db.relationship("Inquiry")
    bid = db.relationship("Bid", back_populates="order")
    customer = db.relationship("CustomerProfile")
    print_shop = db.relationship("PrintShop")
    status_history = db.relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.changed_at")
    review = db.relationship("Review", back_populates="order", uselist=False, cascade="all, delete-orphan")
    disputes = db.relationship("Dispute", back_populates="order", cascade="all, delete-orphan")
    simulated_payment = db.relationship("SimulatedPayment", back_populates="order", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.id} status={self.status}>"


class OrderStatusHistory(db.Model):
    __tablename__ = "order_status_history"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    status = db.Column(db.Enum(*ORDER_STATUSES, name="order_status_history_status"), nullable=False)
    changed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    note = db.Column(db.String(255))

    order = db.relationship("Order", back_populates="status_history")

    def __repr__(self):
        return f"<OrderStatusHistory order={self.order_id} status={self.status}>"
