"""
Application factory.

Using a factory function (instead of a single global Flask app
object) makes the app easier to test later, since a fresh app
instance with its own config can be created for tests without
interfering with the "real" app.
"""

from flask import Flask

from config import Config
from app.extensions import db, migrate, jwt, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    # Import models so Flask-Migrate can see every table when
    # generating migrations. Must happen after db.init_app().
    from app import models  # noqa: F401

    from app.routes.health import health_bp
    app.register_blueprint(health_bp, url_prefix="/api/v1")

    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/v1")

    from app.routes.ai import ai_bp
    app.register_blueprint(ai_bp, url_prefix="/api/v1")

    from app.routes.inquiries import inquiries_bp
    app.register_blueprint(inquiries_bp, url_prefix="/api/v1")

    from app.routes.bids import bids_bp
    app.register_blueprint(bids_bp, url_prefix="/api/v1")

    from app.routes.orders import orders_bp
    app.register_blueprint(orders_bp, url_prefix="/api/v1")

    from app.routes.reviews import reviews_bp
    app.register_blueprint(reviews_bp, url_prefix="/api/v1")

    from app.routes.disputes import disputes_bp
    app.register_blueprint(disputes_bp, url_prefix="/api/v1")

    from app.routes.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix="/api/v1")

    from app.routes.categories import categories_bp
    app.register_blueprint(categories_bp, url_prefix="/api/v1")

    return app
