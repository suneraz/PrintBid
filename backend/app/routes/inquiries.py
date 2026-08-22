"""
Inquiry routes. Creating an inquiry ties together the specification
(from NER extraction, corrected by the customer) and the price model
in one step, then saves both to the database.

Every route here is locked to the "customer" role, and every lookup
of a specific inquiry checks it actually belongs to the logged-in
customer - a customer should never be able to see or act on another
customer's inquiry, even by guessing an ID.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import Inquiry, InquirySpecification, CustomerProfile, PrintCategory
from app.schemas.inquiry_schema import InquiryCreateSchema
from app.services import price_service
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
        "created_at": inq.created_at.isoformat() if inq.created_at else None,
    } for inq in inquiries]), 200


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
