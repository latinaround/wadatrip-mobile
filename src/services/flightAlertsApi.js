// src/services/flightAlertsApi.js
import { Platform } from 'react-native';

function resolveBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_COMMUNITY_API;
  if (raw && raw !== 'auto') return raw;
  const port = process.env.EXPO_PUBLIC_COMMUNITY_PORT || '8082';
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${port}`;
}

const BASE_URL = resolveBaseUrl();

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
