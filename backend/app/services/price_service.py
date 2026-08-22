"""
Wraps the trained price prediction pipeline (preprocessing + Random
Forest, saved together as one sklearn Pipeline, so no separate
encoders need to be loaded or applied by hand here).

The price range shown to the customer isn't an arbitrary +/- percent
guess - it comes from how much the individual trees in the Random
Forest actually disagree with each other on a given job. A job the
model has seen similar examples of gets a tight range; an unusual
combination of features gets a wider one, which is a more honest
signal than a flat percentage would be.
"""

import os
import joblib
import numpy as np
import pandas as pd

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_models", "price_model.joblib")
_pipeline = None

_NUMERIC_FIELDS = ["quantity", "width", "height", "gsm", "page_count"]
_CATEGORICAL_FIELDS = [
    "print_category", "standard_size", "paper_type", "colour_mode",
    "sides", "finishing_type", "urgency", "delivery_requirement", "location",
]


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = joblib.load(_MODEL_PATH)
    return _pipeline


def infer_urgency(deadline_text: str) -> str:
    """
    Simple rule-based mapping from the free-text deadline the NER
    model extracted (e.g. "by tomorrow") to the urgency category the
    price model was trained on. Plain conditions, not another model -
    matches how the proposal treats missing-field handling.
    """
    if not deadline_text:
        return "standard"

    text = deadline_text.lower()
    if any(word in text for word in ["today", "tomorrow", "same day", "next day"]):
        return "rush (same/next day)"
    if any(word in text for word in ["within 1 day", "within 2 day", "within 3 day", "2 days", "3 days"]):
        return "urgent (1-2 days)"
    return "standard"


def predict_price(specification: dict, print_category: str) -> dict:
    """
    specification is expected to loosely match InquirySpecification's
    fields (delivery_method instead of delivery_requirement, etc - the
    renaming happens here so the database model and the price model's
    training-time column names can each stay named naturally for what
    they are).
    """
    pipeline = _get_pipeline()

    row = {
        "quantity": specification.get("quantity"),
        "width": specification.get("width"),
        "height": specification.get("height"),
        "gsm": specification.get("gsm"),
        "page_count": specification.get("page_count"),
        "print_category": print_category,
        "standard_size": specification.get("standard_size"),
        "paper_type": specification.get("paper_type"),
        "colour_mode": specification.get("colour_mode"),
        "sides": specification.get("sides"),
        "finishing_type": specification.get("finishing_type"),
        "urgency": specification.get("urgency") or infer_urgency(specification.get("deadline")),
        "delivery_requirement": specification.get("delivery_method"),
        "location": specification.get("location"),
    }

    df = pd.DataFrame([row])[_NUMERIC_FIELDS + _CATEGORICAL_FIELDS]

    point_prediction = float(pipeline.predict(df)[0])

    preprocessed = pipeline.named_steps["preprocessor"].transform(df)
    tree_predictions = np.array([
        tree.predict(preprocessed)[0] for tree in pipeline.named_steps["model"].estimators_
    ])

    return {
        "predicted_price": round(point_prediction, 2),
        "price_min": round(float(np.percentile(tree_predictions, 10)), 2),
        "price_max": round(float(np.percentile(tree_predictions, 90)), 2),
    }
