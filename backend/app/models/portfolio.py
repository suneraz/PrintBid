"""
Sample work images a print shop uploads to show customers examples
of their previous jobs.
"""

from datetime import datetime, timezone

from app.extensions import db


class Portfolio(db.Model):
    __tablename__ = "portfolios"

    id = db.Column(db.Integer, primary_key=True)
    print_shop_id = db.Column(db.Integer, db.ForeignKey("print_shops.id"), nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.String(255))
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    print_shop = db.relationship("PrintShop", back_populates="portfolio_items")

    def __repr__(self):
        return f"<Portfolio {self.id} shop={self.print_shop_id}>"
