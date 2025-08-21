from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os

from .processing import Analyzer
from .store import Store

app = FastAPI(title="WadaTrip Community Analytics", version="0.1.0")

store = Store(project_id=os.getenv("FIRESTORE_PROJECT_ID"))
analyzer = Analyzer(lang=os.getenv("ANALYSIS_LANG", "en"))


class IngestPayload(BaseModel):
    uid: Optional[str] = None
    location: str
    text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    createdAt: Optional[datetime] = None


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

