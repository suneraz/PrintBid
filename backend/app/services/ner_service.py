"""
Wraps the trained spaCy NER model. The model is loaded once when the
app starts (not on every request, since loading it from disk takes a
noticeable moment), then reused for every extraction call.

extract_specifications() maps the model's raw entity labels
(QUANTITY, GSM, PAPER_TYPE, etc.) onto the exact field names used by
InquirySpecification, so a route can take this dict and hand it
almost directly to the database model.
"""

import os
import spacy

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_models", "ner_model")
_nlp = None


def _get_model():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load(_MODEL_PATH)
    return _nlp


# Maps a spaCy entity label to the InquirySpecification field it fills.
# A few labels (PRINT_CATEGORY, SIDES) are handled separately since
# they need light extra processing before they fit the database field.
_LABEL_TO_FIELD = {
    "QUANTITY": "quantity",
    "SIZE": "standard_size",
    "WIDTH": "width",
    "HEIGHT": "height",
    "PAPER_TYPE": "paper_type",
    "GSM": "gsm",
    "COLOUR_MODE": "colour_mode",
    "FINISHING": "finishing_type",
    "PAGE_COUNT": "page_count",
    "DEADLINE": "deadline",
    "LOCATION": "location",
    "DELIVERY_METHOD": "delivery_method",
}

_NUMERIC_FIELDS = {"quantity", "width", "height", "gsm", "page_count"}


def extract_specifications(text: str) -> dict:
    """
    Runs the NER model on a customer's raw message and returns a dict
    shaped like InquirySpecification's fields. Fields the model didn't
    find anything for are left out of the dict entirely (not set to
    None), so the missing-field check can tell "not mentioned" apart
    from "mentioned but empty".
    """
    nlp = _get_model()
    doc = nlp(text)

    result = {}
    for ent in doc.ents:
        value = ent.text.strip()

        if ent.label_ == "PRINT_CATEGORY":
            result["print_category_text"] = value
            continue

        if ent.label_ == "SIDES":
            result["sides"] = "double-sided" if "double" in value.lower() else "single-sided"
            continue

        field = _LABEL_TO_FIELD.get(ent.label_)
        if field is None:
            continue

        if field in _NUMERIC_FIELDS:
            digits = "".join(c for c in value if c.isdigit())
            if digits:
                result[field] = int(digits)
        else:
            result[field] = value

    return result
