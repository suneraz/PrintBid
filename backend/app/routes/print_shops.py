"""
A print shop managing its own profile - which categories it offers,
and its portfolio of sample work. Kept in its own file since neither
of these fits naturally into bids.py, orders.py, or inquiries.py -
this is about the shop's own settings, not a specific job.
"""

import os

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models import PrintShop, ShopService, PrintCategory, Portfolio, Review
from app.services.file_upload_service import save_upload, resolve_upload_path, FileUploadError
from app.utils.decorators import role_required

print_shops_bp = Blueprint("print_shops", __name__)


def _get_current_print_shop():
    user_id = int(get_jwt_identity())
    return PrintShop.query.filter_by(user_id=user_id).first()


@print_shops_bp.route("/print-shops/me/services", methods=["GET"])
@role_required("print_shop")
def list_my_services():
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    return jsonify([{
        "category_id": s.print_category_id,
        "category_name": s.print_category.name,
    } for s in shop.services]), 200


@print_shops_bp.route("/print-shops/me/services", methods=["PUT"])
@role_required("print_shop")
def update_my_services():
    """
    Replaces the shop's whole set of offered categories with whatever
    list of IDs is sent - simpler for the frontend than separate
    add/remove endpoints, since a checkbox-list UI naturally produces
    "here's the complete set that should be checked" rather than a
    diff of what changed.
    """
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    data = request.get_json() or {}
    category_ids = data.get("category_ids")
    if not isinstance(category_ids, list):
        return jsonify({"error": "category_ids must be a list"}), 400

    valid_ids = {c.id for c in PrintCategory.query.filter(PrintCategory.id.in_(category_ids)).all()}
    if len(valid_ids) != len(set(category_ids)):
        return jsonify({"error": "One or more category IDs are invalid"}), 400

    ShopService.query.filter_by(print_shop_id=shop.id).delete()
    for category_id in valid_ids:
        db.session.add(ShopService(print_shop_id=shop.id, print_category_id=category_id))
    db.session.commit()

    return jsonify([{
        "category_id": s.print_category_id,
        "category_name": s.print_category.name,
    } for s in shop.services]), 200


@print_shops_bp.route("/print-shops/me/portfolio", methods=["GET"])
@role_required("print_shop")
def list_my_portfolio():
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    return jsonify([{
        "id": p.id,
        "caption": p.caption,
        "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
    } for p in shop.portfolio_items]), 200


@print_shops_bp.route("/print-shops/me/portfolio", methods=["POST"])
@role_required("print_shop")
def upload_portfolio_item():
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    if len(shop.portfolio_items) >= 8:
        return jsonify({"error": "Maximum of 8 portfolio images."}), 400

    try:
        saved = save_upload(
            request.files.get("file"),
            subfolder=f"portfolio/{shop.id}",
            allowed_extensions={"jpg", "jpeg", "png"},
        )
    except FileUploadError as err:
        return jsonify({"error": str(err)}), 400

    portfolio_item = Portfolio(
        print_shop_id=shop.id,
        image_url=saved["stored_filename"],
        caption=request.form.get("caption") or None,
    )
    db.session.add(portfolio_item)
    db.session.commit()

    return jsonify({
        "id": portfolio_item.id,
        "caption": portfolio_item.caption,
        "uploaded_at": portfolio_item.uploaded_at.isoformat() if portfolio_item.uploaded_at else None,
    }), 201


@print_shops_bp.route("/print-shops/me/portfolio/<int:portfolio_id>", methods=["DELETE"])
@role_required("print_shop")
def delete_portfolio_item(portfolio_id):
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    item = next((p for p in shop.portfolio_items if p.id == portfolio_id), None)
    if item is None:
        return jsonify({"error": "Portfolio item not found"}), 404

    file_path = resolve_upload_path(f"portfolio/{shop.id}", item.image_url)
    db.session.delete(item)
    db.session.commit()

    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({"message": "Portfolio item deleted"}), 200


@print_shops_bp.route("/print-shops/me/reviews", methods=["GET"])
@role_required("print_shop")
def list_my_reviews():
    shop = _get_current_print_shop()
    if shop is None:
        return jsonify({"error": "Print shop profile not found"}), 404

    reviews = Review.query.filter_by(print_shop_id=shop.id).order_by(Review.created_at.desc()).all()

    return jsonify([{
        "id": r.id,
        "rating": r.rating,
        "comment": r.comment,
        "customer_name": r.customer.user.full_name if r.customer and r.customer.user else "Anonymous",
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reviews]), 200


@print_shops_bp.route("/print-shops/me/portfolio/<int:portfolio_id>/image", methods=["GET"])
@role_required("print_shop", "customer", "admin")
def get_portfolio_image(portfolio_id):
    """
    Portfolio images are shown to customers browsing shops, so unlike
    inquiry attachments this doesn't need strict ownership checks -
    any logged-in user can view any shop's public portfolio, matching
    how the proposal describes portfolios as something customers see
    when comparing shops.
    """
    item = db.session.get(Portfolio, portfolio_id)
    if item is None:
        return jsonify({"error": "Portfolio item not found"}), 404

    file_path = resolve_upload_path(f"portfolio/{item.print_shop_id}", item.image_url)
    if not os.path.exists(file_path):
        return jsonify({"error": "Image is missing from storage"}), 404

    return send_file(file_path)
