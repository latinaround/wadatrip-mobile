from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os

def _load_local_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except Exception:
        pass


_load_local_env()

from .processing import Analyzer
from .store import Store
from .store_flights import FlightStore
from .price_predictor import predict_should_buy, build_flight_recommendation
from .flight_providers import fetch_from_providers, fetch_test_offers
from .bookings import router as bookings_router
from .payments import router as payments_router, webhooks_router
from .marketplace import router as marketplace_router

app = FastAPI(title="WadaTrip Community Analytics", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = Store(project_id=os.getenv("FIRESTORE_PROJECT_ID"))
analyzer = Analyzer(lang=os.getenv("ANALYSIS_LANG", "en"))
flight_store = FlightStore(project_id=os.getenv("FIRESTORE_PROJECT_ID"))
app.include_router(bookings_router)
app.include_router(payments_router)
app.include_router(webhooks_router)


class IngestPayload(BaseModel):
    uid: Optional[str] = None
    location: str
    text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    createdAt: Optional[datetime] = None


class CreateAlertPayload(BaseModel):
    uid: Optional[str] = None
    origin: str
    destination: str
    budget: float
    departureDate: Optional[str] = None
    maxWaitHours: int = 168


class AlertsSubscribePayload(BaseModel):
    itinerary_id: Optional[str] = None
    user_id: Optional[str] = None
    channel: Optional[str] = "in_app"
    rules: Optional[List[Dict[str, Any]]] = None
    route: Optional[Dict[str, Any] | str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    adults: Optional[int] = 1
    dates: Optional[Dict[str, Any]] = None


class FlightRecommendationPayload(BaseModel):
    origin: str
    destination: str
    departureDate: Optional[str] = None
    returnDate: Optional[str] = None
    budget: Optional[float] = None
    budgetMin: Optional[float] = None
    budgetMax: Optional[float] = None
    maxWaitHours: int = 168
    flexDays: int = 0
    adults: int = 1


def _split_route(value: Any) -> tuple[Optional[str], Optional[str]]:
    if isinstance(value, dict):
        return value.get("origin") or value.get("from"), value.get("destination") or value.get("to")
    if isinstance(value, str) and "-" in value:
        left, right = value.split("-", 1)
        return left.strip() or None, right.strip() or None
    return None, None


def _alert_response(alert: Dict[str, Any]) -> Dict[str, Any]:
    return {
        **alert,
        "id": alert.get("_id") or alert.get("id") or alert.get("alertId"),
        "alert_id": alert.get("_id") or alert.get("id") or alert.get("alertId"),
        "status": alert.get("status") or "active",
    }


def _alert_rule(alert: Dict[str, Any]) -> Dict[str, Any]:
    rules = alert.get("rules") or []
    return rules[0] if rules else {}


def _alert_key(alert: Dict[str, Any]) -> tuple[str, str, str, str, str]:
    rule = _alert_rule(alert)
    origin = str(alert.get("origin") or "").strip().upper()
    destination = str(alert.get("destination") or "").strip().upper()
    departure = str(alert.get("departureDate") or rule.get("date") or "").strip()[:10]
    action = str(rule.get("type") or alert.get("action") or "").strip().lower()
    threshold = rule.get("threshold") or alert.get("budget") or ""
    return origin, destination, departure, action, str(threshold)


def _dedupe_alerts(alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    deduped: Dict[tuple[str, str, str, str, str], Dict[str, Any]] = {}
    for alert in alerts:
        key = _alert_key(alert)
        if key not in deduped:
            deduped[key] = alert
    return list(deduped.values())


@app.get("/alerts")
def list_alerts():
    alerts = [_alert_response(alert) for alert in _dedupe_alerts(flight_store.get_active_alerts())]
    return {"items": alerts, "alerts": alerts}


@app.post("/alerts/create")
def create_alert(p: CreateAlertPayload):
    alert = p.model_dump()
    alert_id = flight_store.create_alert(alert)
    return {"ok": True, "alertId": alert_id}


@app.post("/alerts/subscribe")
def subscribe_alert(p: AlertsSubscribePayload):
    body = p.model_dump(exclude_none=True)
    rules = body.get("rules") or []
    first_rule = rules[0] if rules else {}
    origin, destination = _split_route(body.get("route"))
    rule_origin, rule_destination = _split_route(first_rule.get("route"))
    dates = body.get("dates") or {}
    threshold = first_rule.get("threshold")
    budget_max = body.get("budget_max")
    budget_min = body.get("budget_min")

    alert = {
        **body,
        "origin": body.get("origin") or origin or rule_origin,
        "destination": body.get("destination") or destination or rule_destination,
        "departureDate": dates.get("depart") or dates.get("date") or first_rule.get("date"),
        "budget": budget_max or threshold or budget_min or 0,
        "maxWaitHours": body.get("maxWaitHours") or 168,
        "channel": body.get("channel") or "in_app",
    }
    if not alert.get("origin") or not alert.get("destination"):
        raise HTTPException(status_code=400, detail="origin and destination are required")

    existing = next((row for row in flight_store.get_active_alerts() if _alert_key(row) == _alert_key(alert)), None)
    if existing:
        existing_alert = _alert_response(existing)
        return {"ok": True, "alertId": existing_alert.get("id"), "item": existing_alert, "deduped": True}

    alert_id = flight_store.create_alert(alert)
    created = {**alert, "id": alert_id, "alertId": alert_id, "status": "active"}
    return {"ok": True, "alertId": alert_id, "item": created}


@app.post("/alerts/check")
def check_alert(alertId: Optional[str] = None, origin: Optional[str] = None, destination: Optional[str] = None, budget: Optional[float] = None, maxWaitHours: int = 168):
    """Checks one alert by ID or an ad-hoc alert by params. If buy_now/within_budget, writes a signal doc."""
    if alertId:
        alert = flight_store.get_alert(alertId)
        if not alert:
            raise HTTPException(status_code=404, detail="alert not found")
        origin = alert.get("origin")
        destination = alert.get("destination")
        budget = float(alert.get("budget"))
        maxWaitHours = int(alert.get("maxWaitHours", maxWaitHours))
    if not (origin and destination and budget is not None):
        raise HTTPException(status_code=400, detail="missing parameters")

    departure = (alert.get("departureDate") if alertId else None) if 'alert' in locals() and alert else None
    history = flight_store.fetch_history_prices(origin, destination, departure)
    # Fetch live offers from providers (Kiwi/Skyscanner)
    offers = fetch_from_providers(origin, destination, departure)
    res = predict_should_buy(history, float(budget), float(maxWaitHours))
    # Attach providers and choose affiliate link from cheapest if available
    res["offers"] = offers
    if offers:
        # Prefer Travelpayouts link if available; otherwise use cheapest offer
        pref = next((o for o in offers if o.get("provider") == "travelpayouts" and o.get("affiliate_link")), None)
        res["affiliate_link"] = (pref or offers[0]).get("affiliate_link")
    triggered = res.get("withinBudget") or res.get("recommendation") == "buy_now"
    signal_id = None
    if triggered:
        payload = {
            "alertId": alertId,
            "origin": origin,
            "destination": destination,
            "budget": float(budget),
            "result": res,
        }
        if alertId and alert:
            payload["uid"] = alert.get("uid")
        signal_id = flight_store.save_signal(payload)
        # Save notification stub (frontend can pick and send push/email)
        try:
            flight_store.save_notification({
                "uid": (alert.get("uid") if alertId and alert else None),
                "type": "flight_alert",
                "title": "Flight Deal Found",
                "body": f"{origin} → {destination} appears favorable. Book here: {res.get('affiliate_link', '')}",
                "meta": {"origin": origin, "destination": destination, "budget": float(budget), "result": res, "signalId": signal_id},
            })
        except Exception:
            pass
    return {"ok": True, "result": res, "triggered": triggered, "signalId": signal_id}


@app.post("/alerts/run_checks")
def run_checks():
    alerts = flight_store.get_active_alerts()
    results = []
    for a in alerts:
        try:
            history = flight_store.fetch_history_prices(a.get("origin"), a.get("destination"), a.get("departureDate"))
            offers = fetch_from_providers(a.get("origin"), a.get("destination"), a.get("departureDate"))
            res = predict_should_buy(history, float(a.get("budget")), float(a.get("maxWaitHours", 168)))
            res["offers"] = offers
            if offers:
                pref = next((o for o in offers if o.get("provider") == "travelpayouts" and o.get("affiliate_link")), None)
                res["affiliate_link"] = (pref or offers[0]).get("affiliate_link")
            triggered = res.get("withinBudget") or res.get("recommendation") == "buy_now"
            signal_id = None
            if triggered:
                payload = {"alertId": a.get("_id"), "uid": a.get("uid"), "origin": a.get("origin"), "destination": a.get("destination"), "budget": float(a.get("budget")), "result": res}
                signal_id = flight_store.save_signal(payload)
                flight_store.save_notification({
                    "uid": a.get("uid"),
                    "type": "flight_alert",
                    "title": "Flight Deal Found",
                    "body": f"{a.get('origin')} → {a.get('destination')} appears favorable. Book here: {res.get('affiliate_link', '')}",
                    "meta": {"origin": a.get("origin"), "destination": a.get("destination"), "budget": float(a.get("budget")), "result": res, "signalId": signal_id},
                })
            results.append({"alertId": a.get("_id"), "triggered": triggered, "result": res, "signalId": signal_id})
        except Exception as e:
            results.append({"alertId": a.get("_id"), "error": str(e)})
    return {"ok": True, "count": len(results), "results": results}


@app.post("/flights/recommendation")
def get_flight_recommendation(payload: FlightRecommendationPayload):
    budget_candidates = [payload.budgetMax, payload.budget, payload.budgetMin]
    budget = next((float(value) for value in budget_candidates if value is not None and float(value) > 0), 0.0)
    try:
        history = flight_store.fetch_history_prices(payload.origin, payload.destination, payload.departureDate)
    except Exception:
        history = []

    offers = fetch_from_providers(payload.origin, payload.destination, payload.departureDate)
    result = build_flight_recommendation(
        history=history,
        budget=budget,
        hours_left=float(payload.maxWaitHours),
        offers=offers,
        flex_days=payload.flexDays,
    )
    return {
        "ok": True,
        "origin": payload.origin,
        "destination": payload.destination,
        "departureDate": payload.departureDate,
        "returnDate": payload.returnDate,
        "adults": payload.adults,
        "budget": budget or None,
        "recommendation": result,
    }


@app.post("/pricing/predict")
def pricing_predict(payload: Dict[str, Any]):
    routes = payload.get("routes") or []
    predictions = []
    for route in routes:
        origin = route.get("origin")
        destination = route.get("destination")
        date = route.get("date")
        if not (origin and destination):
            continue
        try:
            history = flight_store.fetch_history_prices(origin, destination, date)
        except Exception:
            history = []
        offers = fetch_from_providers(origin, destination, date)
        result = build_flight_recommendation(history=history, budget=0.0, hours_left=168.0, offers=offers)
        predictions.append({
            "route": {"origin": origin, "destination": destination},
            "current_price": result["current_price"],
            "predicted_low": result["predicted_low"],
            "trend": "down" if result["price_change_48h"] < 0 else "flat",
            "action": result["recommendation"],
            "confidence": result["confidence"],
        })
    return {"predictions": predictions}


@app.get("/providers/test")
def providers_test(origin: str, destination: str, date: str | None = None, currency: str = "USD"):
    """Returns simulated offers from providers for quick testing/QA.

    Example: GET /providers/test?origin=LIM&destination=SFO&date=2025-12-15
    """
    offers = fetch_test_offers(origin, destination, date, currency)
    return {"ok": True, "origin": origin, "destination": destination, "date": date, "currency": currency, "offers": offers}


app.include_router(marketplace_router)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ingest")
def ingest(payload: IngestPayload):
    if not payload.text or not payload.location:
        raise HTTPException(status_code=400, detail="Missing text or location")
    created = payload.createdAt or datetime.utcnow()

    sent = analyzer.sentiment(payload.text)
    topics = analyzer.topics_batch([payload.text])
    analysis_doc = {
        "uid": payload.uid,
        "location": payload.location,
        "text": payload.text,
        "lat": payload.lat,
        "lng": payload.lng,
        "createdAt": created,
        "sentiment": sent["label"],
        "sentimentScore": sent["score"],
        "topics": topics[0].get("labels", []),
    }
    store.save_analysis(analysis_doc)
    return {"ok": True, "analysis": analysis_doc}


@app.get("/analysis")
def get_analysis(location: str = Query(...), sinceDays: int = Query(7)):
    since = datetime.utcnow() - timedelta(days=sinceDays)
    rows = store.fetch_analysis(location=location, since=since)
    # Aggregate sentiments and topics
    sentiments: Dict[str, int] = {}
    topics: Dict[str, int] = {}
    for r in rows:
        s = (r.get("sentiment") or "unknown").lower()
        sentiments[s] = sentiments.get(s, 0) + 1
        for t in r.get("topics", []) or []:
            topics[t] = topics.get(t, 0) + 1
    return {"ok": True, "location": location, "sinceDays": sinceDays, "sentiments": sentiments, "topics": topics, "count": len(rows)}


@app.get("/topics")
def get_topics(location: str = Query(...), sinceDays: int = Query(30)):
    since = datetime.utcnow() - timedelta(days=sinceDays)
    texts = store.fetch_texts(location=location, since=since)
    if not texts:
        return {"ok": True, "topics": [], "count": 0}
    res = analyzer.topics_batch(texts)
    # Summarize labels
    label_counts: Dict[str, int] = {}
    for r in res:
        for l in r.get("labels", []):
            label_counts[l] = label_counts.get(l, 0) + 1
    topics = sorted([{ "label": k, "count": v } for k, v in label_counts.items()], key=lambda x: -x["count"])
    return {"ok": True, "topics": topics, "count": len(texts)}


@app.get("/analysis/locations")
def get_locations_overview(sinceDays: int = Query(7)):
    since = datetime.utcnow() - timedelta(days=sinceDays)
    rows = store.fetch_analysis_since(since)
    by_loc: Dict[str, Dict[str, int]] = {}
    accum_coords: Dict[str, Dict[str, float]] = {}
    counts: Dict[str, int] = {}
    for r in rows:
        loc = r.get("location") or "unknown"
        s = (r.get("sentiment") or "unknown").lower()
        if loc not in by_loc:
            by_loc[loc] = {}
        by_loc[loc][s] = by_loc[loc].get(s, 0) + 1
        # accumulate coordinates if present
        lat = r.get("lat")
        lng = r.get("lng")
        if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
            if loc not in accum_coords:
                accum_coords[loc] = {"lat": 0.0, "lng": 0.0}
                counts[loc] = 0
            accum_coords[loc]["lat"] += float(lat)
            accum_coords[loc]["lng"] += float(lng)
            counts[loc] += 1
    points = []
    for loc, senti in by_loc.items():
        lat = lng = None
        if loc in accum_coords and counts.get(loc):
            lat = accum_coords[loc]["lat"] / counts[loc]
            lng = accum_coords[loc]["lng"] / counts[loc]
        points.append({"location": loc, "sentiments": senti, "count": sum(senti.values()), "lat": lat, "lng": lng})
    return {"ok": True, "sinceDays": sinceDays, "locations": by_loc, "points": points}
