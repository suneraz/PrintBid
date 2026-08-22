from marshmallow import Schema, fields, validate


class NerExtractSchema(Schema):
    message = fields.String(required=True, validate=validate.Length(min=1))


class SpecificationFieldsSchema(Schema):
    """Shared fields used by both price prediction and inquiry creation."""
    quantity = fields.Integer(required=False, allow_none=True)
    standard_size = fields.String(required=False, allow_none=True)
    width = fields.Float(required=False, allow_none=True)
    height = fields.Float(required=False, allow_none=True)
    paper_type = fields.String(required=False, allow_none=True)
    gsm = fields.Integer(required=False, allow_none=True)
    colour_mode = fields.String(required=False, allow_none=True)
    sides = fields.String(required=False, allow_none=True)
    page_count = fields.Integer(required=False, allow_none=True)
    finishing_type = fields.String(required=False, allow_none=True)
    urgency = fields.String(required=False, allow_none=True)
    deadline = fields.String(required=False, allow_none=True)
    location = fields.String(required=False, allow_none=True)
    delivery_method = fields.String(required=False, allow_none=True)


class PricePredictSchema(SpecificationFieldsSchema):
    print_category = fields.String(required=True)


class InquiryCreateSchema(SpecificationFieldsSchema):
    print_category_id = fields.Integer(required=True)
    raw_message = fields.String(required=True, validate=validate.Length(min=1))
