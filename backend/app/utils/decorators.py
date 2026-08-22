"""
Reusable decorator for locking a route down to specific roles, e.g.

    @bids_bp.route("/bids", methods=["POST"])
    @role_required("print_shop")
    def submit_bid():
        ...

This checks the "role" claim stored in the JWT at login time, so it
doesn't need a database lookup just to check permissions.
"""

from functools import wraps

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "You do not have permission to access this resource"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
