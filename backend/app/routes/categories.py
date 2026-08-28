"""
Lists print categories. Any logged-in user can read this - it's
reference data, not sensitive, and both customers (choosing a
category) and print shops (seeing what they can offer) need it.

Adding/editing/deleting categories is admin-only, added here rather
than in admin.py since it's still fundamentally about categories -
admin.py stays focused on user/shop/dispute management.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import PrintCategory, Inquiry
from app.utils.decorators import role_required

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/categories", methods=["GET"])
@jwt_required()
def list_categories():
    categories = PrintCategory.query.order_by(PrintCategory.name).all()
    return jsonify([{"id": c.id, "name": c.name} for c in categories]), 200


@categories_bp.route("/admin/categories", methods=["GET"])
@role_required("admin")
def admin_list_categories():
    """
    Same data as the public list, plus usage counts so an admin can
    see at a glance whether a category is actually in use before
    deciding to remove it.
    """
    categories = PrintCategory.query.order_by(PrintCategory.name).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "shop_count": len(c.shop_services),
        "inquiry_count": Inquiry.query.filter_by(print_category_id=c.id).count(),
    } for c in categories]), 200


@categories_bp.route("/admin/categories", methods=["POST"])
@role_required("admin")
def create_category():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Category name is required"}), 400

    if PrintCategory.query.filter_by(name=name).first():
        return jsonify({"error": "A category with that name already exists"}), 409

    category = PrintCategory(name=name, description=(data.get("description") or "").strip() or None)
    db.session.add(category)
    db.session.commit()

    return jsonify({"id": category.id, "name": category.name, "description": category.description}), 201


@categories_bp.route("/admin/categories/<int:category_id>", methods=["PUT"])
@role_required("admin")
def update_category(category_id):
    category = db.session.get(PrintCategory, category_id)
    if category is None:
        return jsonify({"error": "Category not found"}), 404

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Category name is required"}), 400

    existing = PrintCategory.query.filter(PrintCategory.name == name, PrintCategory.id != category_id).first()
    if existing:
        return jsonify({"error": "A category with that name already exists"}), 409

    category.name = name
    if "description" in data:
        category.description = (data.get("description") or "").strip() or None
    db.session.commit()

    return jsonify({"id": category.id, "name": category.name, "description": category.description}), 200


@categories_bp.route("/admin/categories/<int:category_id>", methods=["DELETE"])
@role_required("admin")
def delete_category(category_id):
    """
    Deleting a category that's currently referenced by real inquiries
    is blocked at the database level (no cascade defined there on
    purpose - historical job data shouldn't silently lose its
    category). Shops offering this category will simply lose that
    one service option, which is safe to cascade automatically.
    """
    category = db.session.get(PrintCategory, category_id)
    if category is None:
        return jsonify({"error": "Category not found"}), 404

    db.session.delete(category)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "This category can't be deleted - it's used by existing inquiries."}), 409

    return jsonify({"message": "Category deleted"}), 200
