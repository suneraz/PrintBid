from app import create_app
from app.extensions import db
from app.models import User, PrintShop

app = create_app()
with app.app_context():
    email = input("Enter the OTHER print shop's login email: ")
    user = User.query.filter_by(email=email).first()
    if not user:
        print("No user found with that email.")
    else:
        shop = PrintShop.query.filter_by(user_id=user.id).first()
        print("Shop:", shop.business_name)
        print("Approval status:", shop.approval_status)
        print("Categories assigned:", [s.print_category.name for s in shop.services])