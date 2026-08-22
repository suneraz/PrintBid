"""
Order lifecycle routes.

Accepting a bid and simulating payment are deliberately two separate
endpoints (see payment_service.py comment) - accepting a bid doesn't
create an Order by itself, only rejects the other bids and closes the
inquiry. The Order row only comes into existence once the payment
simulation step runs, matching the proposal's payment flow exactly.

Customers can view their own orders; print shops can view and update
status only on orders belonging to them. Same ownership-checking
pattern used everywhere else in this backend - every lookup by ID
also checks the row actually belongs to whoever is asking.
"""

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import Bid, Inquiry, Order, OrderStatusHistory, SimulatedPayment, CustomerProfile, PrintShop
from app.schemas.order_schema import OrderStatusUpdateSchema
from app.services.payment_service import suggested_advance_amount
from app.utils.decorators import role_required

orders_bp = Blueprint("orders", __name__)

order_status_update_schema = OrderStatusUpdateSchema()


def _get_current_customer_profile():
    user_id = int(get_jwt_identity())
    return CustomerProfile.query.filter_by(user_id=user_id).first()


def _get_current_print_shop():
    user_id = int(get_jwt_identity())
    return PrintShop.query.filter_by(user_id=user_id).first()


def _serialize_order(order):
    return {
        "id": order.id,
        "inquiry_id": order.inquiry_id,
        "print_category": order.inquiry.print_category.name if order.inquiry else None,
        "print_shop_name": order.print_shop.business_name,
        "customer_name": order.customer.user.full_name if order.customer and order.customer.user else None,
        "status": order.status,
        "delivery_method": order.delivery_method,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "status_history": [{
            "status": h.status,
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            "note": h.note,
        } for h in order.status_history],
    }


@orders_bp.route("/bids/<int:bid_id>/accept", methods=["POST"])
@role_required("customer")
def accept_bid(bid_id):
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    bid = db.session.get(Bid, bid_id)
    if bid is None or bid.inquiry.customer_id != customer.id:
        return jsonify({"error": "Bid not found"}), 404

    if bid.status != "pending":
        return jsonify({"error": "This bid has already been accepted or rejected"}), 409

    # Accept this bid, reject every other bid on the same inquiry, and
    # close the inquiry so no more bids can come in on it.
    for sibling_bid in bid.inquiry.bids:
        sibling_bid.status = "accepted" if sibling_bid.id == bid.id else "rejected"
    bid.inquiry.status = "closed"
    db.session.commit()

    return jsonify({
        "message": "Bid accepted. Simulate the advance payment to confirm the order.",
        "bid_id": bid.id,
        "suggested_advance_amount": suggested_advance_amount(bid.bid_price),
    }), 200


@orders_bp.route("/bids/<int:bid_id>/simulate-payment", methods=["POST"])
@role_required("customer")
def simulate_payment(bid_id):
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    bid = db.session.get(Bid, bid_id)
    if bid is None or bid.inquiry.customer_id != customer.id:
        return jsonify({"error": "Bid not found"}), 404

    if bid.status != "accepted":
        return jsonify({"error": "This bid has not been accepted yet"}), 409

    if bid.order is not None:
        return jsonify({"error": "An order already exists for this bid"}), 409

    delivery_method = bid.inquiry.specification.delivery_method or "self-collection"

    order = Order(
        inquiry_id=bid.inquiry_id,
        bid_id=bid.id,
        customer_id=customer.id,
        print_shop_id=bid.print_shop_id,
        status="Confirmed",
        delivery_method=delivery_method,
    )
    db.session.add(order)
    db.session.flush()  # assigns order.id before the child rows below

    db.session.add(OrderStatusHistory(
        order_id=order.id, status="Confirmed", note="Order confirmed after simulated advance payment",
    ))

    db.session.add(SimulatedPayment(
        order_id=order.id,
        suggested_advance_amount=suggested_advance_amount(bid.bid_price),
        status="simulated_paid",
        simulated_at=datetime.now(timezone.utc),
    ))

    db.session.commit()

    return jsonify({
        "message": "Demo Payment - No Real Money Processed",
        "order": _serialize_order(order),
    }), 201


@orders_bp.route("/orders", methods=["GET"])
@role_required("customer")
def list_my_orders_as_customer():
    customer = _get_current_customer_profile()
    if customer is None:
        return jsonify({"error": "Customer profile not found"}), 404

    orders = Order.query.filter_by(customer_id=customer.id).order_by(Order.created_at.desc()).all()
    return jsonify([_serialize_order(o) for o in orders]), 200


@orders_bp.route("/print-shops/me/orders", methods=["GET"])
@role_required("print_shop")
def list_my_orders_as_shop():
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    orders = Order.query.filter_by(print_shop_id=shop.id).order_by(Order.created_at.desc()).all()
    return jsonify([_serialize_order(o) for o in orders]), 200


@orders_bp.route("/orders/<int:order_id>/status", methods=["PATCH"])
@role_required("print_shop")
def update_order_status(order_id):
    try:
        data = order_status_update_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    order = db.session.get(Order, order_id)
    if order is None or order.print_shop_id != shop.id:
        return jsonify({"error": "Order not found"}), 404

    order.status = data["status"]
    db.session.add(OrderStatusHistory(
        order_id=order.id, status=data["status"], note=data.get("note"),
    ))

    if data["status"] == "Completed":
        shop.completed_orders_count = (shop.completed_orders_count or 0) + 1

    db.session.commit()

    return jsonify(_serialize_order(order)), 200
