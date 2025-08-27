from __future__ import annotations

import os
import datetime as dt
from typing import List, Dict, Any, Optional

# Network calls are executed by the service runtime, not during codegen.
# We keep 'requests' import local inside functions to avoid import failures if missing.


def _normalize_offer(provider: str, origin: str, destination: str, date: Optional[str], price: float, currency: str, deep_link: str) -> Dict[str, Any]:
    return {
        "provider": provider,
        "origin": origin,
        "destination": destination,
        "date": date,
        "price": float(price),
        "currency": currency,
        "affiliate_link": deep_link,
    }


def _iso_date(d: Optional[str]) -> Optional[str]:
    if not d:
        return None
    try:
        return dt.datetime.fromisoformat(d).date().isoformat()
    except Exception:
        try:
            # Allow YYYY-MM-DD strings
            return dt.datetime.strptime(d, "%Y-%m-%d").date().isoformat()
        except Exception:
            return None


def _stub_offers(provider: str, origin: str, destination: str, date: Optional[str], currency: str = "USD") -> List[Dict[str, Any]]:
    """Return deterministic stub offers for simulation when API keys are missing."""
    date_iso = _iso_date(date) or dt.date.today().isoformat()
    if provider == "travelpayouts":
        aff = os.getenv("AFFILIATE_ID_TP", "MI_PARTNER_ID")
        base = 355.0
        links = [
            f"https://search.travelpayouts.com/flights?origin={origin}&destination={destination}&depart_date={date_iso}&marker={aff}",
            f"https://search.travelpayouts.com/flights?origin={origin}&destination={destination}&depart_date={date_iso}&marker={aff}",
        ]
    elif provider == "amadeus":
        aff = os.getenv("AFFILIATE_ID_AMA", "AFF_AMA_DEMO")
        base = 365.0
        links = [
            f"https://bookings.example.com/flight?origin={origin}&destination={destination}&date={date_iso}&affid={aff}",
            f"https://bookings.example.com/flight?origin={origin}&destination={destination}&date={date_iso}&affid={aff}&cabin=economy",
        ]
    else:
        # Generic fallback
        aff = os.getenv("AFFILIATE_ID", "AFF_DEMO")
        base = 360.0
        links = [
            f"https://example.com/book?o={origin}&d={destination}&dt={date_iso}&aff={aff}",
            f"https://example.com/book?o={origin}&d={destination}&dt={date_iso}&aff={aff}&opt=1",
        ]
    return [
        _normalize_offer(provider, origin, destination, date_iso, base, currency, links[0]),
        _normalize_offer(provider, origin, destination, date_iso, base + 12.0, currency, links[1]),
    ]


def _is_simulation() -> bool:
    val = (os.getenv("SIMULATE_FLIGHTS") or "").strip().lower()
    return val in ("1", "true", "yes", "y", "on")


def fetch_travelpayouts(origin: str, destination: str, date: Optional[str], currency: str = "USD") -> List[Dict[str, Any]]:
    """
    Travelpayouts API basic integration. Returns normalized offers with affiliate links.

    Env vars:
      - TRAVELPAYOUTS_TOKEN
      - AFFILIATE_ID_TP (used to build deeplink)
    """
    token = os.getenv("TRAVELPAYOUTS_TOKEN")
    marker = os.getenv("AFFILIATE_ID_TP", "MI_PARTNER_ID")
    if _is_simulation() or not token:
        return _stub_offers("travelpayouts", origin, destination, date, currency)

    import requests  # local import

    date_iso = _iso_date(date) or dt.date.today().isoformat()
    # Use prices_for_dates as a simple example
    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
    params = {
        "origin": origin,
        "destination": destination,
        "departure_at": date_iso,
        "currency": currency.lower(),
        "direct": "false",
        "limit": 5,
        "sorting": "price",
        "token": token,
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        j = r.json() or {}
        data = (j.get("data") or [])[:5]
    except Exception:
        return _stub_offers("travelpayouts", origin, destination, date, currency)

    offers: List[Dict[str, Any]] = []
    for it in data:
        price = it.get("price") or it.get("value")
        cur = currency.upper()
        deeplink = f"https://search.travelpayouts.com/flights?origin={origin}&destination={destination}&depart_date={date_iso}&marker={marker}"
        if price:
            offers.append(_normalize_offer("travelpayouts", origin, destination, date_iso, float(price), cur, deeplink))
    return offers


def fetch_amadeus(origin: str, destination: str, date: Optional[str], currency: str = "USD") -> List[Dict[str, Any]]:
    """
    Amadeus Flight Offers Search (test env) minimal integration.

    Env vars:
      - AMADEUS_CLIENT_ID
      - AMADEUS_CLIENT_SECRET
      - AFFILIATE_ID_AMA (for deeplink placeholder)
    """
    client_id = os.getenv("AMADEUS_CLIENT_ID")
    client_secret = os.getenv("AMADEUS_CLIENT_SECRET")
    aff = os.getenv("AFFILIATE_ID_AMA", "")
    if _is_simulation() or not (client_id and client_secret):
        return _stub_offers("amadeus", origin, destination, date, currency)

    import requests  # local import

    date_iso = _iso_date(date) or dt.date.today().isoformat()
    token_url = "https://test.api.amadeus.com/v1/security/oauth2/token"
    try:
        t = requests.post(
            token_url,
            data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
            timeout=15,
        )
        t.raise_for_status()
        access_token = (t.json() or {}).get("access_token")
        if not access_token:
            return _stub_offers("amadeus", origin, destination, date, currency)
    except Exception:
        return _stub_offers("amadeus", origin, destination, date, currency)

    url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {
        "currencyCode": currency,
        "originDestinations": [
            {
                "id": 1,
                "originLocationCode": origin,
                "destinationLocationCode": destination,
                "departureDateTimeRange": {"date": date_iso},
            }
        ],
        "travelers": [{"id": 1, "travelerType": "ADULT"}],
        "sources": ["GDS"],
        "max": 5,
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=20)
        r.raise_for_status()
        j = r.json() or {}
        data = (j.get("data") or [])[:5]
    except Exception:
        return _stub_offers("amadeus", origin, destination, date, currency)

    offers: List[Dict[str, Any]] = []
    for it in data:
        price_obj = (it.get("price") or {})
        amount = price_obj.get("grandTotal") or price_obj.get("total")
        cur = price_obj.get("currency") or currency
        deeplink = f"https://bookings.example.com/flight?origin={origin}&destination={destination}&date={date_iso}" + (f"&affid={aff}" if aff else "")
        if amount:
            offers.append(_normalize_offer("amadeus", origin, destination, date_iso, float(amount), cur, deeplink))
    return offers


def fetch_from_providers(origin: str, destination: str, date: Optional[str], currency: str = "USD") -> List[Dict[str, Any]]:
    """Combine providers and return a normalized list sorted by price asc."""
    offers: List[Dict[str, Any]] = []
    try:
        offers.extend(fetch_travelpayouts(origin, destination, date, currency))
    except Exception:
        pass
    try:
        offers.extend(fetch_amadeus(origin, destination, date, currency))
    except Exception:
        pass
    offers = [o for o in offers if isinstance(o.get("price"), (int, float))]
    offers.sort(key=lambda x: x["price"])  # cheapest first
    return offers


def fetch_test_offers(origin: str, destination: str, date: Optional[str], currency: str = "USD") -> List[Dict[str, Any]]:
    """Always return combined stub offers from both providers for debugging/QA."""
    offers: List[Dict[str, Any]] = []
    offers.extend(_stub_offers("travelpayouts", origin, destination, date, currency))
    offers.extend(_stub_offers("amadeus", origin, destination, date, currency))
    offers = [o for o in offers if isinstance(o.get("price"), (int, float))]
    offers.sort(key=lambda x: x["price"])  # cheapest first
    return offers
