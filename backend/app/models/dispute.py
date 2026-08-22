"""
A Dispute is raised by a customer (or occasionally a print shop) when
something goes wrong with an order. Admin resolves these through the
admin panel.
"""

from datetime import datetime, timezone

from app.extensions import db


class Dispute(db.Model):
    __tablename__ = "disputes"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    raised_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum("open", "resolved", "rejected", name="dispute_status"), default="open", nullable=False)
    admin_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = db.Column(db.DateTime)

    order = db.relationship("Order", back_populates="disputes")
    raised_by = db.relationship("User")

    def __repr__(self):
        return f"<Dispute {self.id} order={self.order_id} status={self.status}>"
