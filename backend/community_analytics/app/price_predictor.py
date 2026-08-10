from typing import List, Dict, Any, Tuple
import numpy as np


def simple_downtrend_signal(history: List[Dict[str, Any]]) -> Tuple[float, float, float]:
    """
    Returns (last_price, slope, volatility) using linear fit and std dev.
    """
    if not history:
        return (0.0, 0.0, 0.0)
    y = np.array([h["price"] for h in history], dtype=float)
    x = np.arange(len(y), dtype=float)
    if len(y) >= 2:
        A = np.vstack([x, np.ones(len(x))]).T
        m, c = np.linalg.lstsq(A, y, rcond=None)[0]
        slope = m
    else:
        slope = 0.0
    vol = float(np.std(y)) if len(y) > 1 else 0.0
    return (float(y[-1]), float(slope), vol)


def predict_should_buy(history: List[Dict[str, Any]], budget: float, hours_left: float) -> Dict[str, Any]:
    last, slope, vol = simple_downtrend_signal(history)
    # Forecast naive: next 24h price change ~ slope*24 (normalized over series length)
    n = len(history)
    slope_per_step = slope
    forecast_48h = last + slope_per_step * min(48, max(1, n))
    # Heuristic decision
    within_budget = last <= budget
    trending_down = slope < 0 and abs(slope) > (vol * 0.02 if vol > 0 else 0.5)
    buy_now = within_budget or (hours_left <= 24 and not trending_down)
    recommendation = "buy_now" if buy_now else ("watch" if trending_down else "wait")
    return {
        "lastPrice": last,
        "slope": slope,
        "volatility": vol,
        "forecast48h": forecast_48h,
        "withinBudget": within_budget,
        "recommendation": recommendation,
    }


def build_flight_recommendation(
    history: List[Dict[str, Any]],
    budget: float,
    hours_left: float,
    offers: List[Dict[str, Any]] | None = None,
    flex_days: int = 0,
) -> Dict[str, Any]:
    offers = offers or []
    signal = predict_should_buy(history, budget, hours_left)

    offer_prices = [float(o["price"]) for o in offers if isinstance(o.get("price"), (int, float))]
    current_price = min(offer_prices) if offer_prices else float(signal.get("lastPrice") or budget or 0.0)
    if current_price <= 0:
        current_price = max(float(budget or 0.0), 120.0)

    volatility = float(signal.get("volatility") or 0.0)
    forecast_48h = float(signal.get("forecast48h") or current_price)
    flex_discount = min(max(int(flex_days or 0), 0), 7) * 0.015
    base_low = min(current_price, forecast_48h)
    predicted_low = max(50.0, round(base_low * (1 - flex_discount) - min(volatility, current_price * 0.06), 2))
    predicted_high = round(max(current_price, forecast_48h) + min(max(volatility, current_price * 0.04), current_price * 0.14), 2)
    fair_price = round((current_price + forecast_48h) / 2.0, 2)

    history_count = len(history)
    confidence = 0.42
    if history_count >= 3:
        confidence += 0.08
    if history_count >= 8:
        confidence += 0.08
    if len(offers) >= 2:
        confidence += 0.08
    if len(offers) >= 4:
        confidence += 0.04
    if signal.get("recommendation") in ("buy_now", "watch"):
        confidence += 0.05
    confidence = round(min(0.89, max(0.35, confidence)), 2)

    recommendation = str(signal.get("recommendation") or "wait")
    best_buy_window_hours = 24
    reason = "Prices are stable enough to keep monitoring."

    if recommendation == "buy_now":
        best_buy_window_hours = 6 if hours_left <= 24 else 12
        reason = "Current fare is already inside your target budget or the trend suggests little room to improve."
    elif recommendation == "watch":
        best_buy_window_hours = 12
        reason = "Trend is still moving down. Watch closely before buying."
    elif recommendation == "wait":
        best_buy_window_hours = 24 if hours_left > 72 else 12
        reason = "The route still has room to improve before your buy window closes."

    if budget > 0 and current_price > budget and predicted_low <= budget:
        recommendation = "watch"
        reason = "Current fare is above budget, but the lower bound suggests the route could dip into range."
        best_buy_window_hours = min(best_buy_window_hours, 12)

    cheapest_offer = offers[0] if offers else None
    price_change_48h = round(forecast_48h - current_price, 2)

    return {
        "current_price": round(current_price, 2),
        "predicted_low": predicted_low,
        "predicted_high": predicted_high,
        "fair_price": fair_price,
        "recommendation": recommendation,
        "confidence": confidence,
        "best_buy_window_hours": best_buy_window_hours,
        "within_budget": bool(signal.get("withinBudget")),
        "reason": reason,
        "history_points": history_count,
        "price_change_48h": price_change_48h,
        "cheapest_offer": cheapest_offer,
        "offers": offers,
        "signal": signal,
    }
