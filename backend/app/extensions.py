"""
Extension instances, created once here and initialised later inside
create_app(). Keeping them in their own file (instead of directly in
app/__init__.py) means models.py and routes can import `db` without
ever importing create_app() itself, which would cause a circular import.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
