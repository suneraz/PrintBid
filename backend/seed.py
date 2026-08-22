"""
Seeds the print_categories table with the same category names used to
train the NER and price models. Safe to run more than once - existing
categories are skipped rather than duplicated.

Run with:
    python3 seed.py
"""

from app import create_app
from app.extensions import db
from app.models import PrintCategory

CATEGORIES = [
    "business cards", "visiting cards", "flyers", "leaflets", "brochures",
    "banners", "booklets", "invitations", "certificates", "menus",
    "stickers", "labels", "packaging boxes",
]

app = create_app()

with app.app_context():
    added = 0
    for name in CATEGORIES:
        if not PrintCategory.query.filter_by(name=name).first():
            db.session.add(PrintCategory(name=name))
            added += 1

    db.session.commit()
    print(f"Added {added} new categories ({len(CATEGORIES) - added} already existed).")
    print("All categories now in database:")
    for category in PrintCategory.query.order_by(PrintCategory.name).all():
        print(f"  {category.id}: {category.name}")
