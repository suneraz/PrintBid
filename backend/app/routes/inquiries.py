"""
Inquiry routes. Creating an inquiry ties together the specification
(from NER extraction, corrected by the customer) and the price model
in one step, then saves both to the database.

Every route here is locked to the "customer" role, and every lookup
of a specific inquiry checks it actually belongs to the logged-in
customer - a customer should never be able to see or act on another
customer's inquiry, even by guessing an ID.
"""

import os

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from marshmallow import ValidationError

from app.extensions import db
from app.models import Inquiry, InquirySpecification, CustomerProfile, PrintCategory, InquiryAttachment, PrintShop
from app.schemas.inquiry_schema import InquiryCreateSchema
from app.services import price_service
from app.services.file_upload_service import save_upload, resolve_upload_path, FileUploadError
from app.utils.decorators import role_required

inquiries_bp = Blueprint("inquiries", __name__)

inquiry_create_schema = InquiryCreateSchema()


def _get_current_customer_profile():
    user_id = int(get_jwt_identity())
    return CustomerProfile.query.filter_by(user_id=user_id).first()


@inquiries_bp.route("/inquiries", methods=["POST"])
@role_required("customer")
def create_inquiry():
    try:
        data = inquiry_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    category = db.session.get(PrintCategory, data["print_category_id"])
    if category is None:
        return jsonify({"error": "Print category not found"}), 404

    spec_fields = {k: v for k, v in data.items() if k not in ("print_category_id", "raw_message")}
    price_result = price_service.predict_price(spec_fields, category.name)

    inquiry = Inquiry(
        customer_id=customer.id,
        print_category_id=category.id,
        raw_message=data["raw_message"],
        predicted_price_min=price_result["price_min"],
        predicted_price_max=price_result["price_max"],
        status="submitted",
    )
    db.session.add(inquiry)
    db.session.flush()

    specification = InquirySpecification(inquiry_id=inquiry.id, **spec_fields)
    db.session.add(specification)
    db.session.commit()

    return jsonify({
        "id": inquiry.id,
        "print_category": category.name,
        "raw_message": inquiry.raw_message,
        "status": inquiry.status,
        "predicted_price_min": inquiry.predicted_price_min,
        "predicted_price_max": inquiry.predicted_price_max,
        "specification": spec_fields,
        "attachments": [],
    }), 201


@inquiries_bp.route("/inquiries", methods=["GET"])
@role_required("customer")
def list_inquiries():
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    inquiries = Inquiry.query.filter_by(customer_id=customer.id).order_by(Inquiry.created_at.desc()).all()

    return jsonify([{
        "id": inq.id,
        "print_category": inq.print_category.name,
        "status": inq.status,
        "predicted_price_min": inq.predicted_price_min,
        "predicted_price_max": inq.predicted_price_max,
        "bid_count": len(inq.bids),
        "created_at": inq.created_at.isoformat() if inq.created_at else None,
    } for inq in inquiries]), 200


def _serialize_attachments(inquiry):
    return [{
        "id": a.id,
        "original_filename": a.original_filename,
        "size_bytes": a.size_bytes,
        "uploaded_at": a.uploaded_at.isoformat() if a.uploaded_at else None,
    } for a in inquiry.attachments]


@inquiries_bp.route("/inquiries/<int:inquiry_id>", methods=["GET"])
@role_required("customer")
def get_inquiry(inquiry_id):
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    inquiry = db.session.get(Inquiry, inquiry_id)

    # Deliberately 404 (not 403) when the inquiry belongs to someone
    # else - this avoids confirming to a customer that an ID exists
    # at all if it isn't theirs.
    if inquiry is None or inquiry.customer_id != customer.id:
        return jsonify({"error": "Inquiry not found"}), 404

    spec = inquiry.specification
    return jsonify({
        "id": inquiry.id,
        "print_category": inquiry.print_category.name,
        "raw_message": inquiry.raw_message,
        "status": inquiry.status,
        "predicted_price_min": inquiry.predicted_price_min,
        "predicted_price_max": inquiry.predicted_price_max,
        "attachments": _serialize_attachments(inquiry),
        "specification": {
            "quantity": spec.quantity,
            "standard_size": spec.standard_size,
            "width": spec.width,
            "height": spec.height,
            "paper_type": spec.paper_type,
            "gsm": spec.gsm,
            "colour_mode": spec.colour_mode,
            "sides": spec.sides,
            "page_count": spec.page_count,
            "finishing_type": spec.finishing_type,
            "urgency": spec.urgency,
            "deadline": spec.deadline,
            "location": spec.location,
            "delivery_method": spec.delivery_method,
        } if spec else None,
    }), 200


@inquiries_bp.route("/inquiries/<int:inquiry_id>/attachments", methods=["POST"])
@role_required("customer")
def upload_inquiry_attachment(inquiry_id):
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    inquiry = db.session.get(Inquiry, inquiry_id)
    if inquiry is None or inquiry.customer_id != customer.id:
        return jsonify({"error": "Inquiry not found"}), 404

    if len(inquiry.attachments) >= 5:
        return jsonify({"error": "Maximum of 5 files per inquiry."}), 400

    try:
        saved = save_upload(request.files.get("file"), subfolder=f"inquiries/{inquiry.id}")
    except FileUploadError as err:
        return jsonify({"error": str(err)}), 400

    attachment = InquiryAttachment(inquiry_id=inquiry.id, **saved)
    db.session.add(attachment)
    db.session.commit()

    return jsonify({
        "id": attachment.id,
        "original_filename": attachment.original_filename,
        "size_bytes": attachment.size_bytes,
        "uploaded_at": attachment.uploaded_at.isoformat() if attachment.uploaded_at else None,
    }), 201


@inquiries_bp.route("/inquiries/<int:inquiry_id>/attachments/<int:attachment_id>", methods=["DELETE"])
@role_required("customer")
def delete_inquiry_attachment(inquiry_id, attachment_id):
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    inquiry = db.session.get(Inquiry, inquiry_id)
    if inquiry is None or inquiry.customer_id != customer.id:
        return jsonify({"error": "Inquiry not found"}), 404

    attachment = next((a for a in inquiry.attachments if a.id == attachment_id), None)
    if attachment is None:
        return jsonify({"error": "Attachment not found"}), 404

    file_path = resolve_upload_path(f"inquiries/{inquiry.id}", attachment.stored_filename)
    db.session.delete(attachment)
    db.session.commit()

    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({"message": "Attachment deleted"}), 200


@inquiries_bp.route("/inquiry-attachments/<int:attachment_id>/download", methods=["GET"])
@role_required("customer", "print_shop", "admin")
def download_inquiry_attachment(attachment_id):
    """
    One download route, three different access rules depending on
    who's asking - re-checked here rather than trusted from wherever
    the link was shown, since a link can be shared or guessed.
    """
    attachment = db.session.get(InquiryAttachment, attachment_id)
    if attachment is None:
        return jsonify({"error": "Attachment not found"}), 404

    inquiry = attachment.inquiry
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())

    if role == "customer":
        customer = CustomerProfile.query.filter_by(user_id=user_id).first()
        allowed = customer is not None and inquiry.customer_id == customer.id
    elif role == "print_shop":
        shop = PrintShop.query.filter_by(user_id=user_id).first()
        already_bid = shop is not None and any(b.print_shop_id == shop.id for b in inquiry.bids)
        # Any approved shop can see any open inquiry's attachments now
        # that category-based filtering has been removed - a shop
        # decides for itself whether a job is relevant, so it needs
        # to see the reference files to make that call in the first
        # place, not just for inquiries it already declared itself
        # able to handle.
        allowed = shop is not None and (inquiry.status == "submitted" or already_bid)
    else:  # admin
        allowed = True

    if not allowed:
        # 404 rather than 403, matching the rest of this file - don't
        # confirm an attachment with this ID even exists to someone
        # who isn't allowed to see it.
        return jsonify({"error": "Attachment not found"}), 404

    file_path = resolve_upload_path(f"inquiries/{inquiry.id}", attachment.stored_filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File is missing from storage"}), 404

    return send_file(file_path, download_name=attachment.original_filename, as_attachment=True)


def _serialize_specification(spec):
    if spec is None:
        return None
    return {
        "quantity": spec.quantity,
        "standard_size": spec.standard_size,
        "width": spec.width,
        "height": spec.height,
        "paper_type": spec.paper_type,
        "gsm": spec.gsm,
        "colour_mode": spec.colour_mode,
        "sides": spec.sides,
        "page_count": spec.page_count,
        "finishing_type": spec.finishing_type,
        "urgency": spec.urgency,
        "deadline": spec.deadline,
        "location": spec.location,
        "delivery_method": spec.delivery_method,
    }


@inquiries_bp.route("/print-shops/me/open-inquiries/<int:inquiry_id>", methods=["GET"])
@role_required("print_shop")
def get_open_inquiry_for_shop(inquiry_id):
    """
    A shop's own view of a single inquiry - deliberately separate
    from the customer-facing get_inquiry above, since the access
    rule is different: not "do you own this", but "is this still
    open" - category no longer gates visibility, a shop judges for
    itself whether a job is relevant.
    """
    user_id = int(get_jwt_identity())
    shop = PrintShop.query.filter_by(user_id=user_id).first()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    inquiry = db.session.get(Inquiry, inquiry_id)
    if inquiry is None or inquiry.status != "submitted":
        return jsonify({"error": "Inquiry not found"}), 404

    already_bid = any(b.print_shop_id == shop.id for b in inquiry.bids)

    # Same reasoning as list_open_inquiries_for_shop above - shops
    # bid on their own cost, not anchored to the customer's estimate.
    return jsonify({
        "id": inquiry.id,
        "print_category": inquiry.print_category.name,
        "raw_message": inquiry.raw_message,
        "already_bid": already_bid,
        "attachments": _serialize_attachments(inquiry),
        "specification": _serialize_specification(inquiry.specification),
    }), 200
