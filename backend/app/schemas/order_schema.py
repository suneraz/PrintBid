from marshmallow import Schema, fields, validate

from app.models.order import ORDER_STATUSES


class OrderStatusUpdateSchema(Schema):
    status = fields.String(required=True, validate=validate.OneOf(ORDER_STATUSES))
    note = fields.String(required=False, allow_none=True)
