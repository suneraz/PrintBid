"""
Standalone routes for the two AI models, used independently of an
actual inquiry - the frontend calls /ner/extract as the customer
types, and /price/predict to show a live estimate before submission.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.inquiry_schema import NerExtractSchema, PricePredictSchema
from app.services import ner_service, price_service, missing_field_service

ai_bp = Blueprint("ai", __name__)

ner_extract_schema = NerExtractSchema()
price_predict_schema = PricePredictSchema()


@ai_bp.route("/ner/extract", methods=["POST"])
@jwt_required()
def ner_extract():
    try:
        data = ner_extract_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    specification = ner_service.extract_specifications(data["message"])
    missing_fields = missing_field_service.find_missing_fields(specification)

    return jsonify({
        "specification": specification,
        "missing_fields": missing_fields,
    }), 200


@ai_bp.route("/price/predict", methods=["POST"])
@jwt_required()
def price_predict():
    try:
        data = price_predict_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    print_category = data.pop("print_category")
    result = price_service.predict_price(data, print_category)

    return jsonify(result), 200
