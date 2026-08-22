"""
Simple health check endpoint. Useful for confirming the server is up,
and for checking whether the MySQL connection is working, without
needing any database tables to exist yet.
"""

from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    db_status = "connected"
    try:
        db.session.execute(text("SELECT 1"))
    except Exception as error:
        db_status = f"not connected ({error.__class__.__name__})"

    return jsonify({
        "status": "ok",
        "service": "PrintBid API",
        "database": db_status,
    })
