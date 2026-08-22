"""
Checks which required fields the NER model didn't find anything for,
and returns a plain-language follow-up question for each one. This is
deliberately simple conditional logic, not another model - the
proposal is explicit that this feature doesn't need one.
"""

_REQUIRED_FIELD_QUESTIONS = [
    ("print_category_text", "What would you like to print (e.g. business cards, flyers, banners)?"),
    ("quantity", "How many copies do you need?"),
    ("paper_type", "What type of paper would you like?"),
    ("gsm", "What paper thickness (GSM) do you require?"),
    ("deadline", "When do you need the order?"),
    ("delivery_method", "Do you need delivery or self-collection?"),
]


def find_missing_fields(specification: dict) -> list:
    questions = []
    for field, question in _REQUIRED_FIELD_QUESTIONS:
        if not specification.get(field):
            questions.append({"field": field, "question": question})
    return questions
