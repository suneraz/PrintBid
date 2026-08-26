"""
A sample image a print shop attaches to one specific bid - "here's
an example of a similar job we've done" - as opposed to the shop's
general portfolio on their own profile page. Deliberately a separate
table from Portfolio/InquiryAttachment: this is scoped to a single
bid, so a shop can show a different, more relevant sample on each
bid they make rather than always displaying the same fixed set.
"""

from datetime import datetime, timezone

from app.extensions import db


class BidAttachment(db.Model):
    __tablename__ = "bid_attachments"

    id = db.Column(db.Integer, primary_key=True)
    bid_id = db.Column(db.Integer, db.ForeignKey("bids.id"), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    content_type = db.Column(db.String(100))
    size_bytes = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    bid = db.relationship("Bid", back_populates="attachments")

    def __repr__(self):
        return f"<BidAttachment {self.id} bid={self.bid_id} {self.original_filename}>"
