"""
A customer can review an order once it's Completed, and only once per
order - both checked before anything is written. Submitting a review
recalculates the print shop's overall rating immediately, so the next
bid that shop makes uses an up-to-date rating in the ranking formula.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import Order, Review, CustomerProfile
from app.schemas.admin_schema import ReviewCreateSchema
from app.services.review_service import recalculate_shop_rating
from app.utils.decorators import role_required

reviews_bp = Blueprint("reviews", __name__)

review_create_schema = ReviewCreateSchema()


@reviews_bp.route("/orders/<int:order_id>/review", methods=["POST"])
@role_required("customer")
def submit_review(order_id):
    try:
        data = review_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    user_id = int(get_jwt_identity())
    customer = CustomerProfile.query.filter_by(user_id=user_id).first()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    order = db.session.get(Order, order_id)
    if order is None or order.customer_id != customer.id:
        return jsonify({"error": "Order not found"}), 404

    if order.status != "Completed":
        return jsonify({"error": "Only completed orders can be reviewed"}), 409

    if order.review is not None:
        return jsonify({"error": "This order has already been reviewed"}), 409

    review = Review(
        order_id=order.id,
        customer_id=customer.id,
        print_shop_id=order.print_shop_id,
        rating=data["rating"],
        comment=data.get("comment"),
    )
    db.session.add(review)
    db.session.commit()

    recalculate_shop_rating(order.print_shop)

    return jsonify({
        "id": review.id,
        "order_id": review.order_id,
        "rating": review.rating,
        "comment": review.comment,
        "print_shop_new_rating": order.print_shop.rating_average,
    }), 201
