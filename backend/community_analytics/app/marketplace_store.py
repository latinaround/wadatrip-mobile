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


def normalize_language_list(value: Any) -> List[str]:
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        items = [part.strip() for part in value.split(",")]
    else:
        items = []
    cleaned: List[str] = []
    seen = set()
    for item in items:
        code = str(item or "").strip().lower()
        if code and code not in seen:
            seen.add(code)
            cleaned.append(code)
    return cleaned


def normalize_documents(value: Any) -> List[Dict[str, Any]]:
    docs = value if isinstance(value, list) else []
    out: List[Dict[str, Any]] = []
    for item in docs:
        if not isinstance(item, dict):
            continue
        url = normalize_text(item.get("url"))
        doc_type = normalize_text(item.get("doc_type"))
        if not url or not doc_type:
            continue
        out.append(
            {
                "doc_type": doc_type,
                "url": url,
                "notes": normalize_text(item.get("notes")),
                "status": normalize_text(item.get("status")) or "submitted",
            }
        )
    return out


def public_provider(provider: Dict[str, Any], include_private: bool = False) -> Dict[str, Any]:
    data = dict(provider)
    if include_private:
        return data
    data.pop("owner_uid", None)
    data.pop("owner_email", None)
    data.pop("reviewed_by", None)
    return data


class MarketplaceStore:
    def __init__(self, project_id: Optional[str] = None) -> None:
        self.db = firestore.Client(project=project_id) if project_id else firestore.Client()

    def _provider_collection(self):
        return self.db.collection("providers")

    def _listing_collection(self):
        return self.db.collection("listings")

    def _snapshot_to_dict(self, snapshot) -> Optional[Dict[str, Any]]:
        if not snapshot or not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        return {"id": snapshot.id, **data}

    def get_provider(self, provider_id: str) -> Optional[Dict[str, Any]]:
        return self._snapshot_to_dict(self._provider_collection().document(provider_id).get())

    def get_provider_by_owner_uid(self, owner_uid: str) -> Optional[Dict[str, Any]]:
        query = self._provider_collection().where("owner_uid", "==", owner_uid).limit(1)
        for snapshot in query.stream():
            return self._snapshot_to_dict(snapshot)
        return None

    def list_providers(
        self,
        status: Optional[str] = None,
        q: Optional[str] = None,
        limit: int = 50,
        page: int = 1,
        include_non_approved: bool = False,
    ) -> List[Dict[str, Any]]:
        query = self._provider_collection()
        if status:
            query = query.where("status", "==", status)
        elif not include_non_approved:
            query = query.where("status", "==", "approved")

        items = [self._snapshot_to_dict(snapshot) for snapshot in query.stream()]
        rows = [item for item in items if item]

        if q:
            needle = q.strip().lower()
            rows = [
                row
                for row in rows
                if needle in str(row.get("name") or "").lower()
                or needle in str(row.get("email") or "").lower()
                or needle in str(row.get("base_city") or "").lower()
                or needle in str(row.get("country_code") or "").lower()
            ]

        rows.sort(key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""), reverse=True)
        safe_limit = max(1, min(limit, 200))
        safe_page = max(1, page)
        start = (safe_page - 1) * safe_limit
        end = start + safe_limit
        return rows[start:end]

    def create_or_update_provider(self, owner_uid: str, owner_email: Optional[str], payload: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.get_provider_by_owner_uid(owner_uid)
        now = utcnow_iso()
        verified_level = normalize_text(payload.get("verified_level")) or "community"
        if verified_level not in {"community", "licensed"}:
            verified_level = "community"

        body = {
            "type": normalize_text(payload.get("type")) or "guide",
            "name": normalize_text(payload.get("name")) or "",
            "email": normalize_text(payload.get("email")) or owner_email,
            "phone": normalize_text(payload.get("phone")),
            "languages": normalize_language_list(payload.get("languages")),
            "base_city": normalize_text(payload.get("base_city")) or "",
            "country_code": (normalize_text(payload.get("country_code")) or "").upper(),
            "documents": normalize_documents(payload.get("documents")),
            "license_url": normalize_text(payload.get("license_url")),
            "owner_uid": owner_uid,
            "owner_email": owner_email,
            "updated_at": now,
        }

        if existing:
            update = dict(body)
            current_status = str(existing.get("status") or "pending").lower()
            if current_status == "rejected":
                update["status"] = "pending"
                update["rejection_reason"] = None
                update["reviewed_at"] = None
                update["reviewed_by"] = None
            else:
                update["status"] = current_status if current_status in {"pending", "approved", "suspended"} else "pending"
                update["rejection_reason"] = existing.get("rejection_reason")
                update["reviewed_at"] = existing.get("reviewed_at")
                update["reviewed_by"] = existing.get("reviewed_by")
            update["verified_level"] = str(existing.get("verified_level") or verified_level).lower()
            ref = self._provider_collection().document(existing["id"])
            ref.set(update, merge=True)
            return self.get_provider(existing["id"]) or {"id": existing["id"], **update}

        created = {
            **body,
            "status": "pending",
            "verified_level": verified_level,
            "rejection_reason": None,
            "reviewed_at": None,
            "reviewed_by": None,
            "created_at": now,
        }
        ref = self._provider_collection().document()
        ref.set(created)
        return self.get_provider(ref.id) or {"id": ref.id, **created}

    def review_provider(
        self,
        provider_id: str,
        status: str,
        reviewer_uid: str,
        verified_level: Optional[str] = None,
        rejection_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        provider = self.get_provider(provider_id)
        if not provider:
            raise KeyError("provider_not_found")

        normalized_status = str(status or "").strip().lower()
        if normalized_status not in {"approved", "rejected"}:
            raise ValueError("invalid_status")

        level = normalize_text(verified_level) or provider.get("verified_level") or "community"
        if level not in {"community", "licensed"}:
            level = "community"

        update = {
            "status": normalized_status,
            "verified_level": level,
            "reviewed_at": utcnow_iso(),
            "reviewed_by": reviewer_uid,
            "updated_at": utcnow_iso(),
            "rejection_reason": normalize_text(rejection_reason) if normalized_status == "rejected" else None,
        }
        self._provider_collection().document(provider_id).set(update, merge=True)
        return self.get_provider(provider_id) or {"id": provider_id, **provider, **update}

    def get_listing(self, listing_id: str) -> Optional[Dict[str, Any]]:
        return self._snapshot_to_dict(self._listing_collection().document(listing_id).get())

    def _listing_payload(self, provider: Dict[str, Any], payload: Dict[str, Any], existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        now = utcnow_iso()
        existing = existing or {}
        body = {
            "provider_id": provider["id"],
            "provider_owner_uid": provider.get("owner_uid"),
            "provider_name": provider.get("name"),
            "title": normalize_text(payload.get("title")) or existing.get("title") or "",
            "description": normalize_text(payload.get("description")) if "description" in payload else existing.get("description"),
            "category": normalize_text(payload.get("category")) or existing.get("category") or "tour",
            "city": normalize_text(payload.get("city")) or existing.get("city") or "",
            "country_code": ((normalize_text(payload.get("country_code")) or existing.get("country_code") or "")).upper(),
            "duration_minutes": payload.get("duration_minutes") if "duration_minutes" in payload else existing.get("duration_minutes"),
            "price_from": payload.get("price_from") if "price_from" in payload else existing.get("price_from"),
            "currency": (normalize_text(payload.get("currency")) or existing.get("currency") or "USD").upper(),
            "startDate": normalize_text(payload.get("startDate")) if "startDate" in payload else existing.get("startDate"),
            "endDate": normalize_text(payload.get("endDate")) if "endDate" in payload else existing.get("endDate"),
            "tags": normalize_language_list(payload.get("tags")) if "tags" in payload else existing.get("tags") or [],
            "status": normalize_text(payload.get("status")) or existing.get("status") or "published",
            "updated_at": now,
        }
        body["created_at"] = existing.get("created_at") or now
        return body

    def create_listing(self, provider: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        data = self._listing_payload(provider, payload)
        ref = self._listing_collection().document()
        ref.set(data)
        return self.get_listing(ref.id) or {"id": ref.id, **data}

    def update_listing(self, listing_id: str, provider: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.get_listing(listing_id)
        if not existing:
            raise KeyError("listing_not_found")
        if str(existing.get("provider_id") or "") != str(provider.get("id") or ""):
            raise PermissionError("listing_provider_mismatch")
        data = self._listing_payload(provider, payload, existing=existing)
        self._listing_collection().document(listing_id).set(data, merge=True)
        return self.get_listing(listing_id) or {"id": listing_id, **existing, **data}

    def delete_listing(self, listing_id: str, provider: Dict[str, Any]) -> None:
        existing = self.get_listing(listing_id)
        if not existing:
            raise KeyError("listing_not_found")
        if str(existing.get("provider_id") or "") != str(provider.get("id") or ""):
            raise PermissionError("listing_provider_mismatch")
        self._listing_collection().document(listing_id).delete()

    def search_listings(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        query = self._listing_collection().where("status", "==", "published")
        items = [self._snapshot_to_dict(snapshot) for snapshot in query.stream()]
        rows = [item for item in items if item]
        provider_cache: Dict[str, Optional[Dict[str, Any]]] = {}
        out: List[Dict[str, Any]] = []
        for row in rows:
            provider_id = str(row.get("provider_id") or "")
            provider = provider_cache.get(provider_id)
            if provider_id and provider is None:
                provider = self.get_provider(provider_id)
                provider_cache[provider_id] = provider
            if not provider or str(provider.get("status") or "").lower() != "approved":
                continue

            city = str(row.get("city") or "").lower()
            country = str(row.get("country_code") or "").lower()
            title = str(row.get("title") or "").lower()
            description = str(row.get("description") or "").lower()
            provider_name = str(provider.get("name") or "").lower()
            q = str(filters.get("q") or "").strip().lower()
            provider_filter = str(filters.get("provider_id") or "").strip()
            status_filter = str(filters.get("status") or "").strip().lower()
            free_tour = bool(filters.get("free_tour"))
            min_price = filters.get("min_price")
            max_price = filters.get("max_price")
            price = row.get("price_from")

            if provider_filter and provider_id != provider_filter:
                continue
            if status_filter and str(row.get("status") or "").lower() != status_filter:
                continue
            if filters.get("city") and city != str(filters.get("city")).strip().lower():
                continue
            if filters.get("country") and country != str(filters.get("country")).strip().lower():
                continue
            if q and q not in title and q not in description and q not in provider_name and q not in city:
                continue
            if free_tour and float(price or 0) > 0:
                continue
            if min_price is not None:
                try:
                    if float(price or 0) < float(min_price):
                        continue
                except Exception:
                    continue
            if max_price is not None:
                try:
                    if float(price or 0) > float(max_price):
                        continue
                except Exception:
                    continue

            out.append(
                {
                    **row,
                    "provider_name": provider.get("name"),
                    "provider_status": provider.get("status"),
                    "provider_verified_level": provider.get("verified_level"),
                }
            )

        out.sort(key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""), reverse=True)
        safe_limit = max(1, min(int(filters.get("limit") or 50), 200))
        return out[:safe_limit]
