// src/services/flightAlertsApi.js
const BASE_URL = process.env.EXPO_PUBLIC_COMMUNITY_API || 'http://localhost:8082';

async function api(path, opts) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function createAlert(payload) {
  return api('/alerts/create', { method: 'POST', body: JSON.stringify(payload) });
}

export async function checkAlert(params) {
  return api(`/alerts/check`, { method: 'POST', body: JSON.stringify(params) });
}

export default { createAlert, checkAlert };

