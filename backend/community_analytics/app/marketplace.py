import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from .auth import AuthUser, get_current_user, get_optional_user
from .marketplace_store import MarketplaceStore, normalize_text, public_provider

router = APIRouter(tags=["marketplace"])
marketplace_store = MarketplaceStore(project_id=os.getenv("FIRESTORE_PROJECT_ID"))


class ProviderPayload(BaseModel):
    type: str = "guide"
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    languages: Optional[List[str] | str] = None
    base_city: str
    country_code: str
    documents: Optional[List[Dict[str, Any]]] = None
    verified_level: Optional[str] = None
    license_url: Optional[str] = None
    access_code: Optional[str] = None


class ProviderReviewPayload(BaseModel):
    status: str
    verified_level: Optional[str] = None
    rejection_reason: Optional[str] = None


class ListingPayload(BaseModel):
    provider_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: str = "tour"
    city: str
    country_code: str
    duration_minutes: Optional[int] = None
    price_from: Optional[float] = None
    currency: Optional[str] = "USD"
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    tags: Optional[List[str] | str] = None
    status: Optional[str] = "published"
    access_code: Optional[str] = None


class ListingPatchPayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    duration_minutes: Optional[int] = None
    price_from: Optional[float] = None
    currency: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    tags: Optional[List[str] | str] = None
    status: Optional[str] = None
    access_code: Optional[str] = None


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _owner_provider_or_403(user: AuthUser) -> Dict[str, Any]:
    provider = marketplace_store.get_provider_by_owner_uid(user.uid)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider account not found")
    return provider


def _approved_provider_or_403(user: AuthUser) -> Dict[str, Any]:
    provider = _owner_provider_or_403(user)
    if str(provider.get("status") or "").lower() != "approved":
        raise HTTPException(status_code=403, detail="Provider account must be approved before managing listings")
    return provider


@router.post("/providers")
def create_provider(payload: ProviderPayload, user: AuthUser = Depends(get_current_user)):
    body = payload.model_dump(exclude_none=True)
    provider = marketplace_store.create_or_update_provider(user.uid, user.email, body)
    return public_provider(provider, include_private=True)


@router.get("/providers/me")
def get_my_provider(user: AuthUser = Depends(get_current_user)):
    provider = marketplace_store.get_provider_by_owner_uid(user.uid)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider account not found")
    return public_provider(provider, include_private=True)


@router.get("/providers")
def list_providers(
    status: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    page: int = Query(default=1, ge=1),
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    include_non_approved = bool(user and user.is_admin)
    rows = marketplace_store.list_providers(status=status, q=q, limit=limit, page=page, include_non_approved=include_non_approved)
    return {"items": [public_provider(row, include_private=include_non_approved) for row in rows]}


@router.get("/providers/{provider_id}")
def get_provider(provider_id: str, user: Optional[AuthUser] = Depends(get_optional_user)):
    provider = marketplace_store.get_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    is_owner = bool(user and str(provider.get("owner_uid") or "") == user.uid)
    is_admin = bool(user and user.is_admin)
    if str(provider.get("status") or "").lower() != "approved" and not (is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Provider not found")
    return public_provider(provider, include_private=(is_owner or is_admin))


@router.get("/admin/providers")
def list_pending_providers(
    status: Optional[str] = Query(default="pending"),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    page: int = Query(default=1, ge=1),
    admin: AuthUser = Depends(require_admin),
):
    rows = marketplace_store.list_providers(status=status, q=q, limit=limit, page=page, include_non_approved=True)
    return {"items": [public_provider(row, include_private=True) for row in rows], "admin_uid": admin.uid}


@router.patch("/admin/providers/{provider_id}/status")
def review_provider(provider_id: str, payload: ProviderReviewPayload, admin: AuthUser = Depends(require_admin)):
    try:
        provider = marketplace_store.review_provider(
            provider_id=provider_id,
            status=payload.status,
            reviewer_uid=admin.uid,
            verified_level=payload.verified_level,
            rejection_reason=payload.rejection_reason,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Provider not found")
    except ValueError:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")
    return public_provider(provider, include_private=True)


@router.post("/listings")
def create_listing(payload: ListingPayload, user: AuthUser = Depends(get_current_user)):
    provider = _approved_provider_or_403(user)
    body = payload.model_dump(exclude_none=True)
    listing = marketplace_store.create_listing(provider, body)
    return listing


@router.get("/listings/search")
def search_listings(
    city: Optional[str] = Query(default=None),
    country: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    provider_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default="published"),
    min_price: Optional[float] = Query(default=None),
    max_price: Optional[float] = Query(default=None),
    free_tour: bool = Query(default=False),
):
    filters = {
        "city": normalize_text(city),
        "country": normalize_text(country),
        "q": normalize_text(q),
        "provider_id": normalize_text(provider_id),
        "limit": limit,
        "status": normalize_text(status) or "published",
        "min_price": min_price,
        "max_price": max_price,
        "free_tour": free_tour,
    }
    return {"items": marketplace_store.search_listings(filters)}


@router.get("/listings/{listing_id}")
def get_listing(listing_id: str, user: Optional[AuthUser] = Depends(get_optional_user)):
    listing = marketplace_store.get_listing(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    provider = marketplace_store.get_provider(str(listing.get("provider_id") or ""))
    if not provider:
        raise HTTPException(status_code=404, detail="Listing not found")
    is_owner = bool(user and str(provider.get("owner_uid") or "") == user.uid)
    is_admin = bool(user and user.is_admin)
    is_public = str(listing.get("status") or "").lower() == "published" and str(provider.get("status") or "").lower() == "approved"
    if not is_public and not (is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Listing not found")
    return {
        **listing,
        "provider_name": provider.get("name"),
        "provider_status": provider.get("status"),
        "provider_verified_level": provider.get("verified_level"),
    }


@router.patch("/listings/{listing_id}")
def update_listing(listing_id: str, payload: ListingPatchPayload, user: AuthUser = Depends(get_current_user)):
    provider = _approved_provider_or_403(user)
    body = {key: value for key, value in payload.model_dump(exclude_none=True).items() if value is not None}
    if not body:
        raise HTTPException(status_code=400, detail="No listing fields provided")
    try:
        return marketplace_store.update_listing(listing_id, provider, body)
    except KeyError:
        raise HTTPException(status_code=404, detail="Listing not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You can only update your own listings")


@router.delete("/listings/{listing_id}")
def delete_listing(listing_id: str, user: AuthUser = Depends(get_current_user)):
    provider = _approved_provider_or_403(user)
    try:
        marketplace_store.delete_listing(listing_id, provider)
    except KeyError:
        raise HTTPException(status_code=404, detail="Listing not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="You can only delete your own listings")
    return {"ok": True}
