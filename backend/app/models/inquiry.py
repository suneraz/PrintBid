"""
An Inquiry is a customer's print job request - starts as the raw chat
message, then gets a predicted price range attached once the price
model runs.

InquirySpecification holds the structured fields extracted by the NER
model (or corrected manually by the customer afterwards). Field names
deliberately match the NER model's entity labels and the price
model's feature columns, so data flows between all three without
needing to be renamed or reshaped at each step.
"""

from datetime import datetime, timezone

from app.extensions import db


class Inquiry(db.Model):
    __tablename__ = "inquiries"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer_profiles.id"), nullable=False)
    print_category_id = db.Column(db.Integer, db.ForeignKey("print_categories.id"), nullable=False)
    raw_message = db.Column(db.Text, nullable=False)
    predicted_price_min = db.Column(db.Float)
    predicted_price_max = db.Column(db.Float)
    status = db.Column(db.Enum("draft", "submitted", "closed", name="inquiry_status"), default="draft", nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    customer = db.relationship("CustomerProfile", back_populates="inquiries")
    print_category = db.relationship("PrintCategory")
    specification = db.relationship("InquirySpecification", back_populates="inquiry", uselist=False, cascade="all, delete-orphan")
    bids = db.relationship("Bid", back_populates="inquiry", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Inquiry {self.id} customer={self.customer_id} status={self.status}>"


class InquirySpecification(db.Model):
    __tablename__ = "inquiry_specifications"

    id = db.Column(db.Integer, primary_key=True)
    inquiry_id = db.Column(db.Integer, db.ForeignKey("inquiries.id"), unique=True, nullable=False)

    quantity = db.Column(db.Integer)
    standard_size = db.Column(db.String(10))
    width = db.Column(db.Float)
    height = db.Column(db.Float)
    paper_type = db.Column(db.String(50))
    gsm = db.Column(db.Integer)
    colour_mode = db.Column(db.String(20))
    sides = db.Column(db.String(20))
    page_count = db.Column(db.Integer)
    finishing_type = db.Column(db.String(50))
    urgency = db.Column(db.Enum("standard", "urgent (1-2 days)", "rush (same/next day)", name="inquiry_urgency"), default="standard")
    deadline = db.Column(db.String(100))
    location = db.Column(db.String(100))
    delivery_method = db.Column(db.String(30))

    inquiry = db.relationship("Inquiry", back_populates="specification")

    def __repr__(self):
        return f"<InquirySpecification inquiry={self.inquiry_id}>"
