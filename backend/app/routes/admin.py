"""
Every route here is locked to the "admin" role via role_required.
Kept intentionally simple - list/view endpoints plus the two actions
an admin actually needs to take (approve/reject a shop, resolve a
dispute) - matching the proposal's "keep the admin panel simple"
instruction rather than building a full back-office system.
"""

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, PrintShop, Inquiry, Order, Dispute, Review, Bid
from app.schemas.admin_schema import ShopApprovalSchema, DisputeResolveSchema
from app.utils.decorators import role_required

admin_bp = Blueprint("admin", __name__)

shop_approval_schema = ShopApprovalSchema()
dispute_resolve_schema = DisputeResolveSchema()


@admin_bp.route("/admin/users", methods=["GET"])
@role_required("admin")
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([{
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]), 200


@admin_bp.route("/admin/users/<int:user_id>/status", methods=["PATCH"])
@role_required("admin")
def update_user_status(user_id):
    """
    Suspends or reactivates any account, regardless of role. Only
    blocks future logins - an already-issued token keeps working
    until it expires naturally, since this project doesn't implement
    token revocation. Fine for the scope here, but worth knowing if
    this were ever a real production system.
    """
    data = request.get_json() or {}
    is_active = data.get("is_active")
    if not isinstance(is_active, bool):
        return jsonify({"error": "is_active must be true or false"}), 400

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    if user.id == int(get_jwt_identity()) and not is_active:
        return jsonify({"error": "You can't suspend your own account"}), 400

    user.is_active = is_active
    db.session.commit()

    return jsonify({
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active,
    }), 200


@admin_bp.route("/admin/print-shops", methods=["GET"])
@role_required("admin")
def list_print_shops():
    query = PrintShop.query
    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter_by(approval_status=status_filter)

    shops = query.order_by(PrintShop.created_at.desc()).all()
    return jsonify([{
        "id": s.id,
        "business_name": s.business_name,
        "district": s.district,
        "approval_status": s.approval_status,
        "rating_average": s.rating_average,
        "completed_orders_count": s.completed_orders_count,
        "email": s.user.email,
    } for s in shops]), 200


@admin_bp.route("/admin/print-shops/<int:shop_id>/approval", methods=["PATCH"])
@role_required("admin")
def update_shop_approval(shop_id):
    try:
        data = shop_approval_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    shop = db.session.get(PrintShop, shop_id)
    if shop is None:
        return jsonify({"error": "Print shop not found"}), 404

    shop.approval_status = data["approval_status"]
    db.session.commit()

    return jsonify({
        "id": shop.id,
        "business_name": shop.business_name,
        "approval_status": shop.approval_status,
    }), 200


@admin_bp.route("/admin/inquiries", methods=["GET"])
@role_required("admin")
def list_all_inquiries():
    inquiries = Inquiry.query.order_by(Inquiry.created_at.desc()).all()
    return jsonify([{
        "id": i.id,
        "customer_email": i.customer.user.email,
        "print_category": i.print_category.name,
        "status": i.status,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    } for i in inquiries]), 200


@admin_bp.route("/admin/orders", methods=["GET"])
@role_required("admin")
def list_all_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([{
        "id": o.id,
        "customer_email": o.customer.user.email,
        "print_shop_name": o.print_shop.business_name,
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    } for o in orders]), 200


@admin_bp.route("/admin/bids", methods=["GET"])
@role_required("admin")
def list_all_bids():
    bids = Bid.query.order_by(Bid.created_at.desc()).all()
    return jsonify([{
        "id": b.id,
        "print_shop_name": b.print_shop.business_name,
        "print_category": b.inquiry.print_category.name if b.inquiry else None,
        "bid_price": b.bid_price,
        "estimated_completion_days": b.estimated_completion_days,
        "status": b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    } for b in bids]), 200


@admin_bp.route("/admin/disputes", methods=["GET"])
@role_required("admin")
def list_all_disputes():
    query = Dispute.query
    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter_by(status=status_filter)

    disputes = query.order_by(Dispute.created_at.desc()).all()
    return jsonify([{
        "id": d.id,
        "order_id": d.order_id,
        "raised_by_email": d.raised_by.email,
        "description": d.description,
        "status": d.status,
        "admin_notes": d.admin_notes,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in disputes]), 200


@admin_bp.route("/admin/disputes/<int:dispute_id>", methods=["PATCH"])
@role_required("admin")
def resolve_dispute(dispute_id):
    try:
        data = dispute_resolve_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    dispute = db.session.get(Dispute, dispute_id)
    if dispute is None:
        return jsonify({"error": "Dispute not found"}), 404

    dispute.status = data["status"]
    dispute.admin_notes = data.get("admin_notes")
    dispute.resolved_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "id": dispute.id,
        "status": dispute.status,
        "admin_notes": dispute.admin_notes,
        "resolved_at": dispute.resolved_at.isoformat(),
    }), 200


@admin_bp.route("/admin/stats", methods=["GET"])
@role_required("admin")
def platform_stats():
    return jsonify({
        "total_users": User.query.count(),
        "total_customers": User.query.filter_by(role="customer").count(),
        "total_print_shops": User.query.filter_by(role="print_shop").count(),
        "pending_shop_approvals": PrintShop.query.filter_by(approval_status="pending").count(),
        "total_inquiries": Inquiry.query.count(),
        "total_bids": Bid.query.count(),
        "total_orders": Order.query.count(),
        "completed_orders": Order.query.filter_by(status="Completed").count(),
        "open_disputes": Dispute.query.filter_by(status="open").count(),
        "total_reviews": Review.query.count(),
    }), 200
