# PrintBid - AI-Powered Print Job Bidding Marketplace for Sri Lanka

PrintBid connects customers who need something printed with local print shops
through a reverse-bidding marketplace - a customer describes their job in
plain language, an AI extracts the structured requirements, a machine
learning model estimates a price, and registered print shops compete for the
job by submitting bids.

Repository: https://github.com/suneraz/PrintBid

---

## Table of Contents

1. [Getting the Code](#getting-the-code)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Setup](#setup)
6. [Running the Application](#running-the-application)
7. [Creating an Admin Account](#creating-an-admin-account)
8. [Features by Role](#features-by-role)
9. [AI/ML Components](#aiml-components)
10. [Environment Variables](#environment-variables)
11. [Database Migrations](#database-migrations)
12. [Design Decisions & Known Limitations](#design-decisions--known-limitations)
13. [Troubleshooting](#troubleshooting)

---

## Getting the Code

```
git clone https://github.com/suneraz/PrintBid.git
cd PrintBid
```

The default branch is main.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18 (standalone components, signals) |
| Backend | Flask (Python), SQLAlchemy, Flask-Migrate (Alembic), Flask-JWT-Extended |
| Database | MySQL |
| AI - requirement extraction | Custom-trained spaCy NER model |
| AI - price estimation | scikit-learn Random Forest regression |
| File storage | Local disk (backend/app/uploads/) |

---

## Project Structure

```
PrintBid/
backend/
  app/
    models/         - SQLAlchemy models (one file per table)
    routes/         - Flask blueprints (one file per resource)
    schemas/        - Marshmallow validation schemas
    services/       - NER, price prediction, file upload, bid ranking
    ml_models/      - Trained NER model + price_model.joblib
    uploads/        - Customer/shop-uploaded files (gitignored)
  migrations/versions/  - Alembic migration history
  config.py
  run.py
  seed.py              - Seeds the print categories
  create_admin.py      - Creates an admin account
  requirements.txt
frontend/
  src/app/
    customer/        - Customer portal pages
    print-shop/      - Print shop portal pages
    admin/           - Admin panel pages
    shared/          - Shared components (nav shell, icons, profile page)
    core/            - Services, models, guards, interceptors
ml/                      - ML training notebooks/scripts (not needed to run the app)
```

---

## Prerequisites

Install these before doing anything else:

1. **Python 3.13** specifically - https://www.python.org/downloads/
   (A newer version like 3.14 does not yet have compatible wheels for the NLP
   libraries this project depends on.)
2. **Node.js** (any recent LTS) - https://nodejs.org/
3. **MySQL Server**, installed and running - https://dev.mysql.com/downloads/mysql/
   (MySQL Workbench, XAMPP, or any other way you manage MySQL is fine.)

---

## Setup

```
cd backend
py -3.13 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a file named .env inside backend/ (see Environment Variables below for
the exact contents needed).

Then create the database and apply migrations:

```
flask db upgrade
python3 seed.py
```

Finally, set up the frontend:

```
cd ..\frontend
npm install
```

---

## Running the Application

Two terminals, both left running:

```
# Terminal 1
cd backend
venv\Scripts\activate
python3 run.py
```

```
# Terminal 2
cd frontend
ng serve
```

Then open **http://localhost:4200** in a browser.

---

## Creating an Admin Account

```
cd backend
venv\Scripts\activate
python3 create_admin.py
```

This will prompt for an email, name, and password for the admin account
interactively.

---

## Features by Role

### Customer
- Register, log in, manage profile
- Describe a print job via an AI chat interface; the NER model extracts
  structured details and asks follow-up questions for anything missing
- Attach reference files (logos, design samples - jpg/png/pdf, up to 5)
- Choose delivery or self-collection via a direct choice, not free text
- Predict a price on demand (button-triggered, not automatic)
- Submit the inquiry, then compare ranked bids from print shops (each bid
  shows the shop's rating and sample images specific to that job)
- Accept a bid and simulate the advance payment
- Track the order through its full status lifecycle
- Confirm completion once delivered (a distinct step from the shop's own
  status updates)
- Leave a rating and review
- Report a problem on any order

### Print Shop
- Register with business details, wait for admin approval
- View every open inquiry on the platform (not filtered by category - a shop
  decides for itself what it can do)
- View the customer's attached reference files before bidding
- Submit a bid with price, turnaround time, a message, and required sample
  images specific to that job
- Manage active orders, updating status up through "Delivered"
  (only the customer can mark an order "Completed")
- View reviews left by customers

### Admin
- View and suspend/reactivate any user account
- Approve or reject print shop applications
- Manage print categories (add/edit/delete - protected against deleting a
  category still in use by real inquiries)
- Monitor all platform activity (inquiries, bids, orders, reviews) in one view
- Resolve or reject disputes
- View platform-wide statistics

---

## AI/ML Components

- **NER model** (backend/app/ml_models/ner_model/) - a custom-trained spaCy
  pipeline that extracts structured fields (quantity, paper type, size, etc.)
  from a customer's free-text description.
- **Price prediction model** (backend/app/ml_models/price_model.joblib) - a
  scikit-learn Random Forest regressor trained on print job specifications,
  producing a price estimate with a min/max range.

Both model files must be present under backend/app/ml_models/ for the
/ner/extract and /price/predict endpoints to work - if the chat interface
responds with "Sorry, I couldn't process that" to every message, this is
almost always a missing/misplaced model file, not a code issue.

---

## Environment Variables

backend/.env (never committed - create it yourself):

```
SECRET_KEY=<any random string>
JWT_SECRET_KEY=<any random string>
DB_USER=root
DB_PASSWORD=<your MySQL password>
DB_HOST=localhost
DB_PORT=3306
DB_NAME=printbid
CORS_ORIGINS=http://localhost:4200
```

---

## Database Migrations

Migrations live in backend/migrations/versions/ and run in order via:
```
flask db upgrade
```
This must be run after every fresh clone, and again any time a new migration
file is added.

---

## Design Decisions & Known Limitations

- **Print shop category selection is informational only.** A shop can declare
  what categories it handles (shown on its own profile), but this does not
  restrict which open inquiries it can see or bid on - every approved shop
  sees every open inquiry and decides for itself what's relevant.
- **Price estimates are hidden from print shops.** Shops bid based on their
  own costs, not anchored to the customer's AI-predicted range - this
  preserves genuine price competition, which is the point of a bidding
  marketplace.
- **Payment is fully simulated.** No real payment gateway is integrated; the
  "advance payment" step is a deliberate demonstration of the workflow only.
- **Order completion requires the customer's confirmation.** A print shop can
  advance an order up to "Delivered," but only the customer can mark it
  "Completed" - this is a genuine handoff, not the shop unilaterally closing
  its own order.
- **Account suspension blocks future logins only.** An already-issued login
  token remains valid until it naturally expires; suspension does not
  retroactively invalidate an active session.

---

## Troubleshooting

**"flask: command not found" / commands not recognized**
Your virtual environment isn't activated. Your terminal prompt should show
(venv) at the start. Run venv\Scripts\activate first, every new terminal
window.

**Chat says "Sorry, I couldn't process that" for every message**
The NER model files are likely missing from
backend/app/ml_models/ner_model/. Check that folder exists and isn't empty.

**Everything suddenly returns 401 Unauthorized after restarting the backend**
If backend/.env changed (a new JWT_SECRET_KEY), every previously-issued
login token becomes invalid. Just log out and log back in - this is expected
behaviour, not a bug.

**"Can't connect to MySQL server"**
MySQL Server isn't running. Start it via your normal method (Services app,
XAMPP control panel, etc.) before starting the backend.

**A print shop can't see any inquiries**
This used to depend on category selection, but that restriction has been
removed - every approved shop now sees every open inquiry. If a shop still
sees nothing, check its approval status in the admin panel instead.

**Frontend shows a build error about a missing file that clearly exists**
Angular's dev server cache can go stale after many file replacements. Stop
ng serve, delete the .angular folder inside frontend/, and restart.
