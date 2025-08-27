Community Analytics Service (FastAPI)

Mission
- Capture traveler comments, filter for travel topics, run sentiment analysis and topic modeling, persist results, and expose them via API for the mobile frontend.

Stack
- FastAPI + Uvicorn
- Flight providers: Travelpayouts + Amadeus (normalized offers with affiliate links)
- HuggingFace Transformers (sentiment)
- BERTopic (topic modeling, sentence-transformers, UMAP, HDBSCAN)
- Firestore (existing project database)

Setup
1) Python 3.10+
2) Create a virtualenv and install deps:
   pip install -r requirements.txt
3) Configure Firestore credentials (service account) via GOOGLE_APPLICATION_CREDENTIALS env var or workload identity.
4) Run locally:
   uvicorn app.main:app --reload --port 8082

Environment
- FIRESTORE_PROJECT_ID: optional override for Firestore
- ANALYSIS_LANG: default "en" (supported: "en", "es"), multi-language models can be used.

Endpoints
- POST /ingest: { uid, location, text, lat?, lng?, createdAt? } → sentiment + topics, persists per-message analysis
- GET /analysis?location=&sinceDays= → aggregates by sentiment/topic per location
- GET /topics?location=&sinceDays= → BERTopic summary (topic labels + counts)

Data Collections (Firestore)
- communityMessages (existing): raw messages
- communityAnalysis: per-message { messageId?, uid, location, sentiment, score, topics[] }
- communityAggregates: { location, window, sentiments, topics, updatedAt }
- communityTopics: latest BERTopic model artifacts metadata (optional) and topic summaries

Notes
- For first integration, BERTopic runs on-demand per window (e.g., last 7–30 days). For production, schedule it or trigger on new data batches.
Environment variables (set in your runtime or .env)

Required for flight providers:

- TRAVELPAYOUTS_TOKEN: Travelpayouts API token
- AFFILIATE_ID_TP: Travelpayouts marker/affiliate id for deeplinks
- AMADEUS_CLIENT_ID: Amadeus API client id (test or live)
- AMADEUS_CLIENT_SECRET: Amadeus API client secret
- AFFILIATE_ID_AMA: Affiliate id used to build Amadeus deeplink placeholder
- SIMULATE_FLIGHTS: When set to 1/true/yes, return stub offers even if API keys exist

Notes:
- Providers are optional; if a given API key is missing, that provider returns simulated stub data instead of failing.
- Alerts will include the cheapest offer's `affiliate_link` when available (real or stub).

Endpoints overview additions:

- POST /alerts/check: Now fetches live offers from providers and attaches to `result.offers[]` and `result.affiliate_link`.
- POST /alerts/run_checks: Same as above per active alert; notification body includes a book-now link when available.

Simulation mode:

- When TRAVELPAYOUTS_TOKEN or AMADEUS_CLIENT_{ID,SECRET} is not present, the service returns deterministic example offers:
  `{ provider, origin, destination, date, price, currency, affiliate_link }`.
- Uses `AFFILIATE_ID_TP` / `AFFILIATE_ID_AMA` if provided, otherwise falls back to placeholders `AFF_TP_DEMO` / `AFF_AMA_DEMO`.

Implementation:

- app/flight_providers.py: Travelpayouts + Amadeus integrations returning normalized offers:
  `{ provider, origin, destination, date, price, currency, affiliate_link }`
- app/main.py: Wires providers into alerts flow.

Install deps:

```
pip install -r backend/community_analytics/requirements.txt
```
