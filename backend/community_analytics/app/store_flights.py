from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from google.cloud import firestore


class FlightStore:
    def __init__(self, project_id: Optional[str] = None) -> None:
        self.db = firestore.Client(project=project_id) if project_id else firestore.Client()

    def create_alert(self, alert: Dict[str, Any]) -> str:
        ref = self.db.collection("flightAlertsBackend").document()
        ref.set({
            **alert,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "status": "active",
        })
        return ref.id

    def get_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        d = self.db.collection("flightAlertsBackend").document(alert_id).get()
        return d.to_dict() if d.exists else None

    def save_signal(self, signal: Dict[str, Any]) -> str:
        ref = self.db.collection("flightAlertSignals").document()
        ref.set({**signal, "createdAt": firestore.SERVER_TIMESTAMP})
        return ref.id

    def fetch_history_prices(self, origin: str, destination: str, departure: Optional[str], since_hours: int = 720) -> List[Dict[str, Any]]:
        # Use flightMonitorEvents as a source of observed/predicted prices
        since = datetime.utcnow() - timedelta(hours=since_hours)
        q = (
            self.db.collection("flightMonitorEvents")
            .where("origin", "==", origin)
            .where("destination", "==", destination)
            .where("createdAt", ">=", since)
        )
        rows: List[Dict[str, Any]] = []
        for d in q.stream():
            x = d.to_dict()
            price = x.get("observedPrice") or x.get("predictedPrice")
            if price:
                rows.append({"ts": x.get("createdAt"), "price": float(price)})
        rows.sort(key=lambda r: r["ts"].timestamp() if hasattr(r["ts"], "timestamp") else 0)
        return rows

