"""
A file a customer attaches to their inquiry - a logo, a reference
image, a PDF layout, that kind of thing. The print shop needs to be
able to see these when deciding whether to bid, so access control on
the download route mirrors the same rule used for viewing the
inquiry itself: the owning customer, a shop that can see this
inquiry (open + matching category), or an admin.
"""

from datetime import datetime, timezone

from app.extensions import db


class InquiryAttachment(db.Model):
    __tablename__ = "inquiry_attachments"

    id = db.Column(db.Integer, primary_key=True)
    inquiry_id = db.Column(db.Integer, db.ForeignKey("inquiries.id"), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    content_type = db.Column(db.String(100))
    size_bytes = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    inquiry = db.relationship("Inquiry", back_populates="attachments")

    def __repr__(self):
        return f"<InquiryAttachment {self.id} inquiry={self.inquiry_id} {self.original_filename}>"
