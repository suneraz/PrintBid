from marshmallow import Schema, fields, validate


class ReviewCreateSchema(Schema):
    rating = fields.Integer(required=True, validate=validate.Range(min=1, max=5))
    comment = fields.String(required=False, allow_none=True)


class DisputeCreateSchema(Schema):
    description = fields.String(required=True, validate=validate.Length(min=1))


class DisputeResolveSchema(Schema):
    status = fields.String(required=True, validate=validate.OneOf(["resolved", "rejected"]))
    admin_notes = fields.String(required=False, allow_none=True)


class ShopApprovalSchema(Schema):
    approval_status = fields.String(required=True, validate=validate.OneOf(["approved", "rejected"]))
