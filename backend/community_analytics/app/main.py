from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os

from .processing import Analyzer
from .store import Store
from .store_flights import FlightStore
from .price_predictor import predict_should_buy

app = FastAPI(title="WadaTrip Community Analytics", version="0.1.0")

store = Store(project_id=os.getenv("FIRESTORE_PROJECT_ID"))
analyzer = Analyzer(lang=os.getenv("ANALYSIS_LANG", "en"))
flight_store = FlightStore(project_id=os.getenv("FIRESTORE_PROJECT_ID"))


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


@app.post("/alerts/create")
def create_alert(p: CreateAlertPayload):
    alert = p.model_dump()
    alert_id = flight_store.create_alert(alert)
    return {"ok": True, "alertId": alert_id}


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

    history = flight_store.fetch_history_prices(origin, destination, alert.get("departureDate") if alertId else None)
    res = predict_should_buy(history, float(budget), float(maxWaitHours))
    triggered = res.get("withinBudget") or res.get("recommendation") == "buy_now"
    signal_id = None
    if triggered:
        signal_id = flight_store.save_signal({
            "alertId": alertId,
            "origin": origin,
            "destination": destination,
            "budget": float(budget),
            "result": res,
        })
    return {"ok": True, "result": res, "triggered": triggered, "signalId": signal_id}


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
