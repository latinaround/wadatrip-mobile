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

