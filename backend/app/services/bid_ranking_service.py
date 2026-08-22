"""
Rule-based bid ranking, exactly as specified in the proposal:
  Price: 40%, Rating: 30%, Completion time: 20%, Previous completed orders: 10%

Price and completion time are scored relative to the other bids on
the SAME inquiry (cheapest/fastest in that specific set scores
highest), since there's no fixed "good" price or turnaround in the
abstract - it depends what else was offered on that job.

Rating and completed-orders count are scored on an absolute scale
instead, since a shop's rating and track record don't depend on which
inquiry it happens to be bidding on.
"""

PRICE_WEIGHT = 0.40
RATING_WEIGHT = 0.30
COMPLETION_TIME_WEIGHT = 0.20
COMPLETED_ORDERS_WEIGHT = 0.10

COMPLETED_ORDERS_CEILING = 50  # completed orders count that maxes out this component


def _relative_score(value, values, lower_is_better=True):
    """Min-max normalises value against the full set of values, 0-1."""
    lo, hi = min(values), max(values)
    if hi == lo:
        return 1.0
    if lower_is_better:
        return (hi - value) / (hi - lo)
    return (value - lo) / (hi - lo)


def rank_bids(bids):
    """
    Takes a list of Bid model instances (all for the same inquiry),
    computes rank_score on each one in place, and returns them sorted
    best-first. Does not commit to the database - the caller decides
    when to save.
    """
    if not bids:
        return []

    prices = [b.bid_price for b in bids]
    completion_days = [b.estimated_completion_days for b in bids]

    for bid in bids:
        price_score = _relative_score(bid.bid_price, prices, lower_is_better=True)
        completion_score = _relative_score(bid.estimated_completion_days, completion_days, lower_is_better=True)
        rating_score = (bid.print_shop.rating_average or 0) / 5.0
        completed_orders_score = min((bid.print_shop.completed_orders_count or 0) / COMPLETED_ORDERS_CEILING, 1.0)

        bid.rank_score = round(
            price_score * PRICE_WEIGHT
            + rating_score * RATING_WEIGHT
            + completion_score * COMPLETION_TIME_WEIGHT
            + completed_orders_score * COMPLETED_ORDERS_WEIGHT,
            4,
        )

    return sorted(bids, key=lambda b: b.rank_score, reverse=True)
