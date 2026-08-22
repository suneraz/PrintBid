"""
Records the simulated advance payment demo described in the
proposal's Payment Scope section. This is explicitly NOT a real
payment gateway - status only ever moves from "pending" to
"simulated_paid", and the frontend must display
"Demo Payment - No Real Money Processed" whenever this is shown.
"""

from datetime import datetime, timezone

from app.extensions import db


class SimulatedPayment(db.Model):
    __tablename__ = "simulated_payments"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), unique=True, nullable=False)
    suggested_advance_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.Enum("pending", "simulated_paid", name="simulated_payment_status"), default="pending", nullable=False)
    simulated_at = db.Column(db.DateTime)

    order = db.relationship("Order", back_populates="simulated_payment")

    def __repr__(self):
        return f"<SimulatedPayment order={self.order_id} status={self.status}>"
