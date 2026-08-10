import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from .auth import AuthUser, get_current_user
from .bookings_store import BookingsStore, normalize_text
from .marketplace_store import MarketplaceStore

router = APIRouter(tags=["bookings"])
bookings_store = BookingsStore(project_id=os.getenv("FIRESTORE_PROJECT_ID"))
marketplace_store = MarketplaceStore(project_id=os.getenv("FIRESTORE_PROJECT_ID"))


class BookingPayload(BaseModel):
    listing_id: str
    date: str
    num_people: int
    total_price: Optional[float] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None


def _booking_amounts(total_price: float) -> dict:
    gross = round(max(float(total_price or 0), 0.0), 2)
    fee_pct = float(os.getenv("WADATRIP_FEE_PCT", "15") or 15)
    commission = round(gross * (fee_pct / 100.0), 2)
    provider_amount = round(max(gross - commission, 0.0), 2)
    return {
        "total_price": gross,
        "amount_total": gross,
        "commission_amount": commission,
        "commission_cents": int(round(commission * 100)),
        "provider_amount": provider_amount,
        "provider_amount_cents": int(round(provider_amount * 100)),
    }


def _assert_booking_access(user: AuthUser, booking: dict) -> None:
    if user.is_admin:
        return
    is_traveler = str(booking.get("user_uid") or "") == user.uid
    is_provider_owner = str(booking.get("provider_owner_uid") or "") == user.uid
    if not (is_traveler or is_provider_owner):
        raise HTTPException(status_code=403, detail="You can only access your own bookings")


def _public_listing_snapshot(listing: dict, provider: dict) -> dict:
    return {
        "id": listing.get("id"),
        "title": listing.get("title"),
        "description": listing.get("description"),
        "city": listing.get("city"),
        "country_code": listing.get("country_code"),
        "category": listing.get("category"),
        "currency": listing.get("currency") or "USD",
        "price_from": listing.get("price_from"),
        "provider_id": provider.get("id"),
        "provider_name": provider.get("name"),
        "provider": provider.get("name"),
        "url": listing.get("url"),
    }


@router.post("/bookings")
def create_booking(payload: BookingPayload, user: AuthUser = Depends(get_current_user)):
    listing = marketplace_store.get_listing(str(payload.listing_id))
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    provider = marketplace_store.get_provider(str(listing.get("provider_id") or ""))
    if not provider or str(provider.get("status") or "").lower() != "approved":
        raise HTTPException(status_code=404, detail="Listing not found")
    if str(listing.get("status") or "").lower() != "published":
        raise HTTPException(status_code=404, detail="Listing not found")
    if payload.num_people <= 0:
        raise HTTPException(status_code=400, detail="num_people must be greater than zero")

    price_from = float(listing.get("price_from") or 0.0)
    total_price = float(payload.total_price) if payload.total_price is not None else price_from * payload.num_people
    amounts = _booking_amounts(total_price)
    reference = f"WADA-{str(payload.listing_id).strip()[:4].upper()}-{user.uid[:6].upper()}"
    booking = bookings_store.create_booking(
        {
            "listing_id": str(listing.get("id") or payload.listing_id),
            "provider_id": str(provider.get("id") or ""),
            "provider_owner_uid": provider.get("owner_uid"),
            "user_uid": user.uid,
            "user_email": normalize_text(payload.user_email) or user.email,
            "user_name": normalize_text(payload.user_name),
            "date": payload.date,
            "num_people": int(payload.num_people),
            "currency": str(listing.get("currency") or "USD").upper(),
            "price_per": round(price_from, 2) if price_from > 0 else 0,
            "reference": reference,
            "status": "pending",
            "payment_status": "unpaid",
            "listing": _public_listing_snapshot(listing, provider),
            **amounts,
        }
    )
    return booking


@router.get("/bookings")
def list_bookings(
    user_email: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    provider_id: Optional[str] = Query(default=None),
    listing_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    user: AuthUser = Depends(get_current_user),
):
    filters = {"status": status, "listing_id": listing_id}
    if user.is_admin:
        filters.update(
            {
                "user_uid": user_id,
                "user_email": user_email,
                "provider_id": provider_id,
            }
        )
        return {"items": bookings_store.list_bookings(filters, limit=limit)}

    if provider_id:
        provider = marketplace_store.get_provider(str(provider_id))
        if not provider or str(provider.get("owner_uid") or "") != user.uid:
            raise HTTPException(status_code=403, detail="You can only load bookings for your own provider account")
        filters["provider_id"] = provider_id
        return {"items": bookings_store.list_bookings(filters, limit=limit)}

    if user_id and str(user_id) != user.uid:
        raise HTTPException(status_code=403, detail="You can only load your own bookings")
    if user_email and user.email and str(user_email).strip().lower() != str(user.email).strip().lower():
        raise HTTPException(status_code=403, detail="You can only load your own bookings")

    filters["user_uid"] = user.uid
    return {"items": bookings_store.list_bookings(filters, limit=limit)}


@router.get("/bookings/{booking_id}")
def get_booking(booking_id: str, user: AuthUser = Depends(get_current_user)):
    booking = bookings_store.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    _assert_booking_access(user, booking)
    return booking
