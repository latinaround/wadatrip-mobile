from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

router = APIRouter(prefix="/payments", tags=["payments"])

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
    secret = os.getenv("STRIPE_SECRET_KEY")
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
        return {"ok": True, "clientSecret": intent.client_secret}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

