// src/services/communityAnalyticsApi.js
// Client for the Community Analytics FastAPI service

const BASE_URL = process.env.EXPO_PUBLIC_COMMUNITY_API || 'http://localhost:8082';

async function api(path, opts) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function getAnalysis(location, sinceDays = 7) {
  return api(`/analysis?location=${encodeURIComponent(location)}&sinceDays=${sinceDays}`);
}

export async function getTopics(location, sinceDays = 30) {
  return api(`/topics?location=${encodeURIComponent(location)}&sinceDays=${sinceDays}`);
}

export async function ingestComment({ uid, location, text, lat, lng, createdAt }) {
  return api('/ingest', {
    method: 'POST',
    body: JSON.stringify({ uid, location, text, lat, lng, createdAt }),
  });
}

export default { getAnalysis, getTopics, ingestComment };

