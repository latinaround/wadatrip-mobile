import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import os

from .auth import AuthUser, get_current_user
from .bookings_store import BookingsStore

router = APIRouter(prefix="/payments", tags=["payments"])
webhooks_router = APIRouter(tags=["webhooks"])
bookings_store = BookingsStore(project_id=os.getenv("FIRESTORE_PROJECT_ID"))

try:
    import stripe
    STRIPE_AVAILABLE = True
except Exception:
    STRIPE_AVAILABLE = False

class CreateIntentPayload(BaseModel):
    amount: int  # in smallest currency unit, e.g., cents
    currency: str = "usd"
    description: str | None = None


@router.post("/create-intent")
def create_intent(p: CreateIntentPayload):
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=500, detail="Stripe SDK not available on server")
    secret = os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="Missing STRIPE_SECRET_KEY")
    stripe.api_key = secret
    try:
        intent = stripe.PaymentIntent.create(
            amount=p.amount,
            currency=p.currency,
            description=p.description,
            automatic_payment_methods={"enabled": True},
        )
        return {"ok": True, "clientSecret": intent.client_secret, "paymentIntentId": intent.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _stripe_secret_or_501() -> str:
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=501, detail="Stripe checkout is not available on the server")
    secret = os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_SECRET")
    if not secret:
        raise HTTPException(status_code=501, detail="Missing STRIPE_SECRET_KEY")
    stripe.api_key = secret
    return secret


def _booking_checkout_url(template: str, booking_id: str) -> str:
    return str(template).replace("{BOOKING_ID}", str(booking_id))


def _extract_receipt_url(payment_intent_id: str | None) -> str | None:
    if not payment_intent_id:
        return None
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id, expand=["latest_charge"])
        latest_charge = getattr(intent, "latest_charge", None)
        if latest_charge and getattr(latest_charge, "receipt_url", None):
            return str(latest_charge.receipt_url)
    except Exception:
        return None
    return None


@router.post("/bookings/{booking_id}/checkout")
def start_booking_checkout(booking_id: str, user: AuthUser = Depends(get_current_user)):
    _stripe_secret_or_501()
    booking = bookings_store.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not user.is_admin and str(booking.get("user_uid") or "") != user.uid:
        raise HTTPException(status_code=403, detail="You can only start checkout for your own booking")

    amount_cents = int(round(float(booking.get("amount_total") or booking.get("total_price") or 0) * 100))
    if amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Booking amount must be greater than zero")

    existing_paid = str(booking.get("payment_status") or "").lower() in {"paid", "succeeded", "completed"}
    if existing_paid and booking.get("receipt_url"):
        return {"url": booking.get("receipt_url")}

    success_url_template = os.getenv(
        "CHECKOUT_SUCCESS_URL",
        os.getenv(
            "STRIPE_CHECKOUT_SUCCESS_URL",
            f"{os.getenv('GATEWAY_URL') or 'http://localhost:3015'}/checkout/success",
        ),
    )
    cancel_url_template = os.getenv(
        "CHECKOUT_CANCEL_URL",
        os.getenv(
            "STRIPE_CHECKOUT_CANCEL_URL",
            f"{os.getenv('GATEWAY_URL') or 'http://localhost:3015'}/checkout/cancel",
        ),
    )
    listing = booking.get("listing") or {}

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=str(booking_id),
            customer_email=booking.get("user_email") or user.email,
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": str(booking.get("currency") or "usd").lower(),
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": str(listing.get("title") or "WadaTrip booking"),
                            "description": str(listing.get("city") or "Tour booking"),
                        },
                    },
                    "quantity": 1,
                }
            ],
            metadata={
                "booking_id": str(booking_id),
                "listing_id": str(booking.get("listing_id") or ""),
                "provider_id": str(booking.get("provider_id") or ""),
                "user_uid": str(booking.get("user_uid") or ""),
            },
            payment_intent_data={
                "metadata": {
                    "booking_id": str(booking_id),
                    "listing_id": str(booking.get("listing_id") or ""),
                    "provider_id": str(booking.get("provider_id") or ""),
                    "user_uid": str(booking.get("user_uid") or ""),
                }
            },
            success_url=_booking_checkout_url(success_url_template, booking_id),
            cancel_url=_booking_checkout_url(cancel_url_template, booking_id),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    updated = {
        "checkout_url": getattr(session, "url", None),
        "checkout_session_id": getattr(session, "id", None),
        "stripe_checkout_session_id": getattr(session, "id", None),
        "payment_intent_id": getattr(session, "payment_intent", None),
        "stripe_payment_intent_id": getattr(session, "payment_intent", None),
        "payment_status": "pending",
    }
    try:
        bookings_store.update_booking(booking_id, updated)
    except KeyError:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"url": getattr(session, "url", None)}


async def _handle_stripe_webhook(request: Request):
    _stripe_secret_or_501()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if webhook_secret and signature:
        try:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=webhook_secret)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    else:
        try:
            event = json.loads(payload.decode("utf-8"))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid webhook payload: {exc}")

    event_type = str(event.get("type") or "")
    obj = event.get("data", {}).get("object", {}) or {}

    def update_by_booking_id(target_booking_id: str | None, data: dict) -> None:
        if not target_booking_id:
            return
        try:
            bookings_store.update_booking(str(target_booking_id), data)
        except KeyError:
            return

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        booking_id = (obj.get("metadata") or {}).get("booking_id") or obj.get("client_reference_id")
        payment_intent_id = obj.get("payment_intent")
        update_by_booking_id(
            booking_id,
            {
                "payment_status": "paid",
                "status": "confirmed",
                "checkout_session_id": obj.get("id"),
                "stripe_checkout_session_id": obj.get("id"),
                "payment_intent_id": payment_intent_id,
                "stripe_payment_intent_id": payment_intent_id,
                "receipt_url": _extract_receipt_url(payment_intent_id),
            },
        )
    elif event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"}:
        booking_id = (obj.get("metadata") or {}).get("booking_id") or obj.get("client_reference_id")
        update_by_booking_id(
            booking_id,
            {
                "payment_status": "failed",
                "status": "pending",
                "checkout_session_id": obj.get("id"),
                "stripe_checkout_session_id": obj.get("id"),
            },
        )
    elif event_type == "payment_intent.payment_failed":
        payment_intent_id = obj.get("id")
        booking = bookings_store.find_by_payment_intent(str(payment_intent_id or ""))
        if booking:
            update_by_booking_id(booking.get("id"), {"payment_status": "requires_payment_method", "status": "pending"})

    return {"ok": True}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    return await _handle_stripe_webhook(request)


@webhooks_router.post("/webhooks/stripe")
async def stripe_webhook_platform_compatible(request: Request):
    return await _handle_stripe_webhook(request)
