from app import create_app
from app.extensions import db
from app.models import User, PrintShop, ShopService, PrintCategory

app = create_app()
with app.app_context():
    user = User.query.filter_by(email="nawod@gmail.com").first()
    if not user:
        print("No user found with that email.")
    else:
        shop = PrintShop.query.filter_by(user_id=user.id).first()
        print("Shop:", shop.business_name, "| approval:", shop.approval_status)
        print("Current categories:", [s.print_category_id for s in shop.services])

        wanted = ["banners", "business cards"]
        for name in wanted:
            category = PrintCategory.query.filter_by(name=name).first()
            if category and not any(s.print_category_id == category.id for s in shop.services):
                db.session.add(ShopService(print_shop_id=shop.id, print_category_id=category.id))
                print("Added category:", name)

        db.session.commit()
        print("Done. Shop now has categories:", [s.print_category_id for s in shop.services])