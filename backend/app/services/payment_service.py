"""
Computes the suggested advance payment shown to the customer before
they simulate paying it. A flat 30% of the accepted bid price - kept
as a plain, explainable rule rather than anything more complicated,
matching the proposal's "trust-based payment model" description.
"""

ADVANCE_PERCENTAGE = 0.30


def suggested_advance_amount(bid_price: float) -> float:
    return round(bid_price * ADVANCE_PERCENTAGE, 2)
