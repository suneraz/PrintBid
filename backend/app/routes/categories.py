"""
Lists print categories. Any logged-in user can read this - it's
reference data, not sensitive, and both customers (choosing a
category) and print shops (seeing what they can offer) need it.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models import PrintCategory

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/categories", methods=["GET"])
@jwt_required()
def list_categories():
    categories = PrintCategory.query.order_by(PrintCategory.name).all()
    return jsonify([{"id": c.id, "name": c.name} for c in categories]), 200
