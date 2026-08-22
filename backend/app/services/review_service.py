"""
Recomputes a print shop's rating_average from scratch whenever a new
review comes in, rather than trying to incrementally update a running
average - recalculating from all reviews is simpler to get right and
this table will never be large enough for it to matter for performance.
"""

from app.extensions import db
from app.models import Review


def recalculate_shop_rating(print_shop):
    reviews = Review.query.filter_by(print_shop_id=print_shop.id).all()
    if not reviews:
        print_shop.rating_average = 0.0
    else:
        print_shop.rating_average = round(sum(r.rating for r in reviews) / len(reviews), 2)
    db.session.commit()
