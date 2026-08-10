from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from google.cloud import firestore


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


class BookingsStore:
    def __init__(self, project_id: Optional[str] = None) -> None:
        self.db = firestore.Client(project=project_id) if project_id else firestore.Client()

    def _collection(self):
        return self.db.collection("bookings")

    def _snapshot_to_dict(self, snapshot) -> Optional[Dict[str, Any]]:
        if not snapshot or not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        return {"id": snapshot.id, **data}

    def get_booking(self, booking_id: str) -> Optional[Dict[str, Any]]:
        return self._snapshot_to_dict(self._collection().document(booking_id).get())

    def create_booking(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        now = utcnow_iso()
        body = {
            **payload,
            "updated_at": now,
            "created_at": payload.get("created_at") or now,
        }
        ref = self._collection().document()
        ref.set(body)
        return self.get_booking(ref.id) or {"id": ref.id, **body}

    def update_booking(self, booking_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.get_booking(booking_id)
        if not existing:
            raise KeyError("booking_not_found")
        update = {**payload, "updated_at": utcnow_iso()}
        self._collection().document(booking_id).set(update, merge=True)
        return self.get_booking(booking_id) or {"id": booking_id, **existing, **update}

    def list_bookings(self, filters: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        items = [self._snapshot_to_dict(snapshot) for snapshot in self._collection().stream()]
        rows = [item for item in items if item]

        user_uid = normalize_text(filters.get("user_uid"))
        user_email = normalize_text(filters.get("user_email"))
        provider_id = normalize_text(filters.get("provider_id"))
        listing_id = normalize_text(filters.get("listing_id"))
        status = normalize_text(filters.get("status"))

        if user_uid:
            rows = [row for row in rows if str(row.get("user_uid") or "") == user_uid]
        if user_email:
            needle = user_email.lower()
            rows = [row for row in rows if str(row.get("user_email") or "").lower() == needle]
        if provider_id:
            rows = [row for row in rows if str(row.get("provider_id") or row.get("listing", {}).get("provider_id") or "") == provider_id]
        if listing_id:
            rows = [row for row in rows if str(row.get("listing_id") or row.get("listing", {}).get("id") or "") == listing_id]
        if status:
            needle = status.lower()
            rows = [
                row
                for row in rows
                if str(row.get("status") or "").lower() == needle
                or str(row.get("payment_status") or "").lower() == needle
            ]

        rows.sort(key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""), reverse=True)
        safe_limit = max(1, min(int(limit or 100), 200))
        return rows[:safe_limit]

    def find_by_checkout_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        needle = normalize_text(session_id)
        if not needle:
            return None
        for snapshot in self._collection().where("stripe_checkout_session_id", "==", needle).limit(1).stream():
            return self._snapshot_to_dict(snapshot)
        for snapshot in self._collection().where("checkout_session_id", "==", needle).limit(1).stream():
            return self._snapshot_to_dict(snapshot)
        return None

    def find_by_payment_intent(self, payment_intent_id: str) -> Optional[Dict[str, Any]]:
        needle = normalize_text(payment_intent_id)
        if not needle:
            return None
        for snapshot in self._collection().where("stripe_payment_intent_id", "==", needle).limit(1).stream():
            return self._snapshot_to_dict(snapshot)
        for snapshot in self._collection().where("payment_intent_id", "==", needle).limit(1).stream():
            return self._snapshot_to_dict(snapshot)
        return None
