from marshmallow import Schema, fields, validate


class BidCreateSchema(Schema):
    bid_price = fields.Float(required=True, validate=validate.Range(min=0.01))
    estimated_completion_days = fields.Integer(required=True, validate=validate.Range(min=1))
    message = fields.String(required=False, allow_none=True)
