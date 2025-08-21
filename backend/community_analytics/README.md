Community Analytics Service (FastAPI)

Mission
- Capture traveler comments, filter for travel topics, run sentiment analysis and topic modeling, persist results, and expose them via API for the mobile frontend.

Stack
- FastAPI + Uvicorn
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

