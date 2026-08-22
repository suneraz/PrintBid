"""
Bid routes.

Submitting a bid is locked to approved print shops that actually
offer the inquiry's category - an unapproved shop, or one that
doesn't do that kind of printing, shouldn't be able to bid at all.

Viewing the ranked bid list is locked to the customer who owns the
inquiry, same ownership pattern as the inquiries routes.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Inquiry, Bid, PrintShop, ShopService, CustomerProfile
from app.schemas.bid_schema import BidCreateSchema
from app.services.bid_ranking_service import rank_bids
from app.utils.decorators import role_required

bids_bp = Blueprint("bids", __name__)

bid_create_schema = BidCreateSchema()


def _get_current_print_shop():
    user_id = int(get_jwt_identity())
    return PrintShop.query.filter_by(user_id=user_id).first()


def _get_current_customer_profile():
    user_id = int(get_jwt_identity())
    return CustomerProfile.query.filter_by(user_id=user_id).first()


def _serialize_bid(bid):
    return {
        "id": bid.id,
        "print_shop_id": bid.print_shop_id,
        "print_shop_name": bid.print_shop.business_name,
        "print_shop_rating": bid.print_shop.rating_average,
        "bid_price": bid.bid_price,
        "estimated_completion_days": bid.estimated_completion_days,
        "message": bid.message,
        "rank_score": bid.rank_score,
        "status": bid.status,
        "created_at": bid.created_at.isoformat() if bid.created_at else None,
    }


@bids_bp.route("/inquiries/<int:inquiry_id>/bids", methods=["POST"])
@role_required("print_shop")
def submit_bid(inquiry_id):
    try:
        data = bid_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    if shop.approval_status != "approved":
        return jsonify({"error": "Your shop is not yet approved to bid on inquiries"}), 403

    inquiry = db.session.get(Inquiry, inquiry_id)
    if inquiry is None or inquiry.status != "submitted":
        return jsonify({"error": "Inquiry not found or not open for bidding"}), 404

    offers_category = ShopService.query.filter_by(
        print_shop_id=shop.id, print_category_id=inquiry.print_category_id
    ).first()
    if offers_category is None:
        return jsonify({"error": "Your shop does not offer this print category"}), 403

    bid = Bid(
        inquiry_id=inquiry.id,
        print_shop_id=shop.id,
        bid_price=data["bid_price"],
        estimated_completion_days=data["estimated_completion_days"],
        message=data.get("message"),
    )
    db.session.add(bid)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "You have already submitted a bid on this inquiry"}), 409

    return jsonify(_serialize_bid(bid)), 201


@bids_bp.route("/inquiries/<int:inquiry_id>/bids", methods=["GET"])
@role_required("customer")
def list_bids_for_inquiry(inquiry_id):
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    inquiry = db.session.get(Inquiry, inquiry_id)
    if inquiry is None or inquiry.customer_id != customer.id:
        return jsonify({"error": "Inquiry not found"}), 404

    ranked = rank_bids(list(inquiry.bids))
    db.session.commit()  # persist the freshly computed rank_score values

    return jsonify([_serialize_bid(bid) for bid in ranked]), 200


@bids_bp.route("/print-shops/me/bids", methods=["GET"])
@role_required("print_shop")
def list_my_bids():
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    bids = Bid.query.filter_by(print_shop_id=shop.id).order_by(Bid.created_at.desc()).all()

    return jsonify([{
        "id": bid.id,
        "inquiry_id": bid.inquiry_id,
        "bid_price": bid.bid_price,
        "estimated_completion_days": bid.estimated_completion_days,
        "status": bid.status,
        "created_at": bid.created_at.isoformat() if bid.created_at else None,
    } for bid in bids]), 200
