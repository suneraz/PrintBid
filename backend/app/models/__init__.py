# All model classes are imported here so Flask-Migrate can discover
# every table when generating a migration (flask db migrate scans
# whatever has been imported into app.models, not the files on disk).

from app.models.user import User
from app.models.customer_profile import CustomerProfile
from app.models.print_shop import PrintShop
from app.models.print_category import PrintCategory, ShopService
from app.models.portfolio import Portfolio
from app.models.inquiry import Inquiry, InquirySpecification
from app.models.bid import Bid
from app.models.order import Order, OrderStatusHistory
from app.models.review import Review
from app.models.dispute import Dispute
from app.models.simulated_payment import SimulatedPayment
