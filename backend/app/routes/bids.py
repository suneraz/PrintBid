"""
Bid routes.

Submitting a bid is locked to approved print shops that actually
offer the inquiry's category - an unapproved shop, or one that
doesn't do that kind of printing, shouldn't be able to bid at all.

Viewing the ranked bid list is locked to the customer who owns the
inquiry, same ownership pattern as the inquiries routes.
"""

import os

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import get_jwt_identity, get_jwt
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Inquiry, Bid, PrintShop, ShopService, CustomerProfile, BidAttachment
from app.schemas.bid_schema import BidCreateSchema
from app.services.bid_ranking_service import rank_bids
from app.services.file_upload_service import save_upload, resolve_upload_path, FileUploadError
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
        "attachments": [{
            "id": a.id,
            "original_filename": a.original_filename,
        } for a in bid.attachments],
        "bid_price": bid.bid_price,
        "estimated_completion_days": bid.estimated_completion_days,
        "message": bid.message,
        "rank_score": bid.rank_score,
        "status": bid.status,
        "created_at": bid.created_at.isoformat() if bid.created_at else None,
    }


@bids_bp.route("/print-shops/me/open-inquiries", methods=["GET"])
@role_required("print_shop")
def list_open_inquiries_for_shop():
    """
    Inquiries a shop can actually bid on: still open (status
    'submitted'), in a category the shop registered for, with a flag
    on each one showing whether this shop has already bid on it -
    the frontend uses that to grey out or hide the bid button rather
    than letting someone try to bid twice and hit a 409.
    """
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    if shop.approval_status != "approved":
        return jsonify({"error": "Your shop is not yet approved to view inquiries"}), 403

    category_ids = [s.print_category_id for s in shop.services]
    if not category_ids:
        return jsonify([]), 200

    inquiries = (
        Inquiry.query.filter(Inquiry.status == "submitted", Inquiry.print_category_id.in_(category_ids))
        .order_by(Inquiry.created_at.desc())
        .all()
    )

    already_bid_ids = {b.inquiry_id for b in Bid.query.filter_by(print_shop_id=shop.id).all()}

    # predicted_price_min/max deliberately excluded here - showing
    # the customer's AI-estimated range to shops would anchor their
    # bids toward it instead of their own real production cost,
    # undermining the point of a competitive reverse-bidding system.
    # The customer sees their own estimate; shops bid blind.
    return jsonify([{
        "id": inq.id,
        "print_category": inq.print_category.name,
        "raw_message": inq.raw_message,
        "created_at": inq.created_at.isoformat() if inq.created_at else None,
        "already_bid": inq.id in already_bid_ids,
    } for inq in inquiries]), 200


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


@bids_bp.route("/bids/<int:bid_id>/attachments", methods=["POST"])
@role_required("print_shop")
def upload_bid_attachment(bid_id):
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    bid = db.session.get(Bid, bid_id)
    if bid is None or bid.print_shop_id != shop.id:
        return jsonify({"error": "Bid not found"}), 404

    if len(bid.attachments) >= 3:
        return jsonify({"error": "Maximum of 3 sample images per bid."}), 400

    try:
        saved = save_upload(
            request.files.get("file"),
            subfolder=f"bids/{bid.id}",
            allowed_extensions={"jpg", "jpeg", "png"},
        )
    except FileUploadError as err:
        return jsonify({"error": str(err)}), 400

    attachment = BidAttachment(bid_id=bid.id, **saved)
    db.session.add(attachment)
    db.session.commit()

    return jsonify({"id": attachment.id, "original_filename": attachment.original_filename}), 201


@bids_bp.route("/bids/<int:bid_id>/attachments/<int:attachment_id>", methods=["DELETE"])
@role_required("print_shop")
def delete_bid_attachment(bid_id, attachment_id):
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    bid = db.session.get(Bid, bid_id)
    if bid is None or bid.print_shop_id != shop.id:
        return jsonify({"error": "Bid not found"}), 404

    attachment = next((a for a in bid.attachments if a.id == attachment_id), None)
    if attachment is None:
        return jsonify({"error": "Attachment not found"}), 404

    file_path = resolve_upload_path(f"bids/{bid.id}", attachment.stored_filename)
    db.session.delete(attachment)
    db.session.commit()

    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({"message": "Attachment deleted"}), 200


@bids_bp.route("/bid-attachments/<int:attachment_id>/image", methods=["GET"])
@role_required("print_shop", "customer", "admin")
def get_bid_attachment_image(attachment_id):
    """
    Same access pattern as inquiry attachments: the bidding shop
    (their own upload), the customer who owns the inquiry this bid
    is on (they need to see it to compare bids), or an admin. Not a
    free-for-all like the shop's general portfolio - this is scoped
    to one specific job, so only people involved in that job see it.
    """
    attachment = db.session.get(BidAttachment, attachment_id)
    if attachment is None:
        return jsonify({"error": "Attachment not found"}), 404

    bid = attachment.bid
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())

    if role == "print_shop":
        shop = PrintShop.query.filter_by(user_id=user_id).first()
        allowed = shop is not None and bid.print_shop_id == shop.id
    elif role == "customer":
        customer = CustomerProfile.query.filter_by(user_id=user_id).first()
        allowed = customer is not None and bid.inquiry.customer_id == customer.id
    else:  # admin
        allowed = True

    if not allowed:
        return jsonify({"error": "Attachment not found"}), 404

    file_path = resolve_upload_path(f"bids/{bid.id}", attachment.stored_filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "Image is missing from storage"}), 404

    return send_file(file_path)


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
        "print_category": bid.inquiry.print_category.name if bid.inquiry else None,
        "bid_price": bid.bid_price,
        "estimated_completion_days": bid.estimated_completion_days,
        "status": bid.status,
        "created_at": bid.created_at.isoformat() if bid.created_at else None,
    } for bid in bids]), 200
