"""
Authentication endpoints.

Registration is split into two routes (customer vs print shop) since
they create different linked profile rows and need different fields -
keeping them separate is simpler to read than one route branching
internally on a "role" field from the request body.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, CustomerProfile, PrintShop
from app.schemas.auth_schema import RegisterCustomerSchema, RegisterPrintShopSchema, LoginSchema
from app.utils.security import hash_password, verify_password

auth_bp = Blueprint("auth", __name__)

register_customer_schema = RegisterCustomerSchema()
register_print_shop_schema = RegisterPrintShopSchema()
login_schema = LoginSchema()


@auth_bp.route("/auth/register/customer", methods=["POST"])
def register_customer():
    try:
        data = register_customer_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role="customer",
        full_name=data["full_name"],
        phone=data.get("phone"),
    )
    db.session.add(user)
    db.session.flush()  # assigns user.id before the profile row is created

    profile = CustomerProfile(user_id=user.id, default_location=data.get("default_location"))
    db.session.add(profile)
    db.session.commit()

    return jsonify({"message": "Customer account created", "user_id": user.id}), 201


@auth_bp.route("/auth/register/print-shop", methods=["POST"])
def register_print_shop():
    try:
        data = register_print_shop_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role="print_shop",
        full_name=data["full_name"],
        phone=data.get("phone"),
    )
    db.session.add(user)
    db.session.flush()

    shop = PrintShop(
        user_id=user.id,
        business_name=data["business_name"],
        business_address=data.get("business_address"),
        district=data.get("district"),
        approval_status="pending",
    )
    db.session.add(shop)
    db.session.commit()

    return jsonify({
        "message": "Print shop account created, pending admin approval",
        "user_id": user.id,
    }), 201


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    try:
        data = login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    user = User.query.filter_by(email=data["email"]).first()
    if not user or not verify_password(data["password"], user.password_hash):
        # Deliberately the same error for "no such user" and "wrong
        # password" - confirming which one it was would let someone
        # probe for which emails are registered.
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        # Safe to be specific here, unlike the case above - the
        # person already proved they know the right email/password,
        # so saying "suspended" doesn't leak anything new to an
        # attacker the way confirming account existence would.
        return jsonify({"error": "This account has been suspended. Contact support for help."}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }), 200


@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    default_location = None
    if user.role == "customer" and user.customer_profile:
        default_location = user.customer_profile.default_location

    return jsonify({
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "default_location": default_location,
    }), 200


@auth_bp.route("/auth/me", methods=["PATCH"])
@jwt_required()
def update_me():
    """
    Profile self-edit, available to every role. Deliberately does not
    accept email or password here - changing either of those has
    security implications (re-verification, session invalidation)
    that are out of scope for this project, so they're left as
    fixed once an account is created.
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}

    if "full_name" in data:
        full_name = (data["full_name"] or "").strip()
        if not full_name:
            return jsonify({"error": "Full name cannot be empty"}), 400
        user.full_name = full_name

    if "phone" in data:
        user.phone = (data["phone"] or "").strip() or None

    if "default_location" in data and user.role == "customer":
        if user.customer_profile is None:
            # Shouldn't normally happen - every customer gets a
            # profile row at registration - but guards against it
            # rather than crashing if one is ever missing.
            user.customer_profile = CustomerProfile(user_id=user.id)
        user.customer_profile.default_location = (data["default_location"] or "").strip() or None

    db.session.commit()

    default_location = None
    if user.role == "customer" and user.customer_profile:
        default_location = user.customer_profile.default_location

    return jsonify({
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "default_location": default_location,
    }), 200
