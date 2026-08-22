"""
Request validation for authentication endpoints. Marshmallow checks
the shape and basic constraints of incoming JSON before any of it
touches the database - e.g. rejects a missing email or a password
under 8 characters with a clear error, instead of that failing later
in a confusing way.
"""

from marshmallow import Schema, fields, validate


class RegisterCustomerSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    full_name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    phone = fields.String(required=False, allow_none=True)
    default_location = fields.String(required=False, allow_none=True)


class RegisterPrintShopSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    full_name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    phone = fields.String(required=False, allow_none=True)
    business_name = fields.String(required=True, validate=validate.Length(min=1, max=150))
    business_address = fields.String(required=False, allow_none=True)
    district = fields.String(required=False, allow_none=True)


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)
