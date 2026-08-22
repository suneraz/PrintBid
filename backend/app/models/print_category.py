"""
Print categories are a lookup table (business cards, flyers, banners,
etc - matching the same category names used by the NER and price
models, so a category chosen here lines up with what those models
were trained on).

ShopService is the join table recording which categories each print
shop offers.
"""

from app.extensions import db


class PrintCategory(db.Model):
    __tablename__ = "print_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))

    shop_services = db.relationship("ShopService", back_populates="print_category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PrintCategory {self.id} {self.name}>"


class ShopService(db.Model):
    __tablename__ = "shop_services"

    id = db.Column(db.Integer, primary_key=True)
    print_shop_id = db.Column(db.Integer, db.ForeignKey("print_shops.id"), nullable=False)
    print_category_id = db.Column(db.Integer, db.ForeignKey("print_categories.id"), nullable=False)

    print_shop = db.relationship("PrintShop", back_populates="services")
    print_category = db.relationship("PrintCategory", back_populates="shop_services")

    __table_args__ = (
        db.UniqueConstraint("print_shop_id", "print_category_id", name="uq_shop_category"),
    )

    def __repr__(self):
        return f"<ShopService shop={self.print_shop_id} category={self.print_category_id}>"
