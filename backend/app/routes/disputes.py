"""
Either the customer or the print shop on an order can raise a
dispute, so this checks both possible ownership paths rather than
being locked to one role like most other routes here.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from marshmallow import ValidationError

from app.extensions import db
from app.models import Order, Dispute, CustomerProfile, PrintShop
from app.schemas.admin_schema import DisputeCreateSchema

disputes_bp = Blueprint("disputes", __name__)

dispute_create_schema = DisputeCreateSchema()


def _order_belongs_to_current_user(order):
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

    if role == "customer":
        customer = CustomerProfile.query.filter_by(user_id=user_id).first()
        return customer is not None and order.customer_id == customer.id
    if role == "print_shop":
        shop = PrintShop.query.filter_by(user_id=user_id).first()
        return shop is not None and order.print_shop_id == shop.id
    return False


@disputes_bp.route("/orders/<int:order_id>/disputes", methods=["POST"])
@jwt_required()
def raise_dispute(order_id):
    try:
        data = dispute_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    order = db.session.get(Order, order_id)
    if order is None or not _order_belongs_to_current_user(order):
        return jsonify({"error": "Order not found"}), 404

    dispute = Dispute(
        order_id=order.id,
        raised_by_user_id=int(get_jwt_identity()),
        description=data["description"],
    )
    db.session.add(dispute)
    db.session.commit()

    return jsonify({
        "id": dispute.id,
        "order_id": dispute.order_id,
        "status": dispute.status,
        "description": dispute.description,
    }), 201


@disputes_bp.route("/orders/<int:order_id>/disputes", methods=["GET"])
@jwt_required()
def list_disputes_for_order(order_id):
    order = db.session.get(Order, order_id)
    if order is None or not _order_belongs_to_current_user(order):
        return jsonify({"error": "Order not found"}), 404

    return jsonify([{
        "id": d.id,
        "status": d.status,
        "description": d.description,
        "admin_notes": d.admin_notes,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
    } for d in order.disputes]), 200
