
export type CreateBookingInput = {
  listing_id: string;
  date: string; // ISO YYYY-MM-DD
  num_people: number;
  total_price?: number | string;
  user_email?: string;
  user_name?: string;
};
export async function createBooking(body: CreateBookingInput): Promise<any> {
  return doFetch<any>(`/bookings`, { method: 'POST', body: JSON.stringify(body) });
}
export async function startCheckout(bookingId: string): Promise<{ url: string }> {
  return doFetch<{ url: string }>(`/payments/bookings/${encodeURIComponent(bookingId)}/checkout`, { method: 'POST', body: JSON.stringify({}) });
}
import { Platform } from 'react-native';
import Constants from 'expo-constants';
// Local lightweight type aliases to avoid external path resolution during bundling
export type GenerateItineraryRequest = {
  title?: string;
  origin: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  adults?: number;
  budget_total?: number;
};
export type GenerateItineraryResponse = { scenarios?: any[] };
export type PricingPrediction = {
  route?: { origin?: string; destination?: string } | string;
  current_price?: number;
  predicted_low?: number;
  trend?: string;
  action?: string;
  confidence?: number;
};

let __loggedBaseOnce = false;
function getBaseUrl(): string {
  // Priority: env -> extra.API_BASE_URL -> global override -> platform default
  const extra = (Constants as any)?.expoConfig?.extra || {};
  const fromEnv = (typeof process !== 'undefined' ? (process as any).env?.EXPO_PUBLIC_API_BASE_URL : undefined) as string | undefined;
  const fromExtra = extra.API_BASE_URL as string | undefined;
  const fromGlobal = (global as any).API_BASE_URL as string | undefined;
  let base = fromEnv || fromExtra || fromGlobal;
  if (!base) {
    base = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }
  // Hardening: en Android, si alguien pasó localhost/127.0.0.1, reescribe a 10.0.2.2
  try {
    if (Platform.OS === 'android') {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(base)) {
        base = base.replace(/^https?:\/\/localhost/i, 'http://10.0.2.2').replace(/^https?:\/\/127\.0\.0\.1/i, 'http://10.0.2.2');
      }
    }
  } catch {}
  if (!__loggedBaseOnce) {
    __loggedBaseOnce = true;
    try { console.log('[API] Resolved base URL:', base, 'Platform:', Platform.OS); } catch {}
  }
  return base;
}

export function resolvedApiBase(): string { return getBaseUrl(); }

function getAuthToken(): string | undefined {
  const extra = (Constants as any)?.expoConfig?.extra || {};
  return (
    extra.AUTH_TOKEN ||
    (global as any).AUTH_TOKEN ||
    (typeof process !== 'undefined' ? (process as any).env?.AUTH_TOKEN : undefined)
  );
}
function getApiMode(): 'mock' | 'live' {
  try {
    const extra = (Constants as any)?.expoConfig?.extra || {};
    const mode = (extra.API_MODE as string) || (typeof process !== 'undefined' ? (process as any).env?.EXPO_PUBLIC_API_MODE : undefined);
    if (String(mode).toLowerCase() === 'mock') return 'mock';
  } catch {}
  return 'live';
}

async function doFetch<T>(path: string, init: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // Timeout configurable (ms) via extra.HTTP_TIMEOUT_MS or env EXPO_PUBLIC_HTTP_TIMEOUT_MS
  const extra = (Constants as any)?.expoConfig?.extra || {};
  const rawTimeout = extra.HTTP_TIMEOUT_MS ?? (typeof process !== 'undefined' ? (process as any).env?.EXPO_PUBLIC_HTTP_TIMEOUT_MS : undefined);
  const timeoutMs = Number(rawTimeout) > 0 ? Number(rawTimeout) : 10000;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined as any;
  const timer = controller ? setTimeout(() => {
    try { controller.abort(); } catch {}
  }, timeoutMs) : undefined;

  try {
    const url = `${base}${path}`;
    const res = await fetch(url, { ...init, headers, signal: controller?.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      err.status = res.status;
      err.statusText = res.statusText;
      err.body = text;
      throw err;
    }
    return (await res.json()) as T;
  } catch (e: any) {
    // Normalize abort/timeout
    if (e?.name === 'AbortError') {
      const err: any = new Error('Network timeout');
      err.status = 0;
      err.code = 'timeout';
      err.body = 'timeout';
      throw err;
    }
    const msg = String(e?.message || e || '');
    if (/Network request failed/i.test(msg) || /TypeError/i.test(e?.name)) {
      const err: any = new Error(`Network request failed: ${base}${path}`);
      err.status = 0;
      err.code = 'network';
      err.url = `${base}${path}`;
      err.body = `Could not reach ${base}${path}`;
      throw err;
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer as any);
  }
}

// In-memory mock stores (lives for app session)
const __mockStore: {
  alerts?: any[];
} = {};
function ensureMockStore() {
  if (!__mockStore.alerts) __mockStore.alerts = [];
  return __mockStore;
}

export async function generateItinerary(request: GenerateItineraryRequest): Promise<GenerateItineraryResponse> {
  return doFetch<GenerateItineraryResponse>('/itineraries/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export type PredictInput = { origin: string; destination: string; start_date?: string };

export async function predictPricing(request: PredictInput): Promise<PricingPrediction[]> {
  if (getApiMode() === 'mock') {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await delay(500);
    const nowPrice = 199 + Math.round(Math.random() * 200);
    const low = Math.max(79, nowPrice - (50 + Math.round(Math.random() * 80)));
    const conf = Math.min(0.95, 0.6 + Math.random() * 0.35);
    const trend = nowPrice > low ? 'down' : 'flat';
    const action = nowPrice > low ? 'wait' : 'buy';
    const mock: any[] = [
      {
        route: { origin: request.origin, destination: request.destination },
        current_price: nowPrice,
        predicted_low: low,
        trend,
        action,
        confidence: conf,
      },
    ];
    return mock as PricingPrediction[];
  }
  const body = { routes: [{ origin: request.origin, destination: request.destination, date: request.start_date }] };
  const res = await doFetch<{ predictions: PricingPrediction[] }>('/pricing/predict', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.predictions || [];
}

export async function listAlerts(): Promise<any[]> {
  if (getApiMode() === 'mock') {
    const store = ensureMockStore();
    const seed = [
      { id: 'a1', route: { origin: 'MAD', destination: 'CDG' }, price: 129, currency: 'EUR', status: 'active' },
      { id: 'a2', route: { origin: 'BCN', destination: 'LIS' }, price: 59, currency: 'EUR', status: 'paused' },
      { id: 'a3', route: { origin: 'MEX', destination: 'JFK' }, price: 210, currency: 'USD', status: 'active' },
    ];
    return [...seed, ...(store.alerts || [])];
  }
  try {
    const res = await doFetch<{ items: any[] }>(`/alerts`, { method: 'GET' });
    return res.items || [];
  } catch (e: any) {
    if (e?.status === 404) {
      const res = await doFetch<{ items: any[] }>(`/alerts/list`, { method: 'GET' });
      return res.items || [];
    }
    throw e;
  }
}

export async function subscribeAlert(body: any): Promise<any> {
  if (getApiMode() === 'mock') {
    const payload = body || {};
    const created = {
      id: 'mock-' + Math.random().toString(36).slice(2, 8),
      status: 'subscribed',
      ...payload,
      created_at: new Date().toISOString(),
    };
    const store = ensureMockStore();
    store.alerts!.push(created);
    return created;
  }
  // Normalize client payload into AlertsSubscribeRequest expected by backend
  const input = body || {};
  const routeStr = (() => {
    if (typeof input.route === 'string') return input.route;
    if (input.route && input.route.origin && input.route.destination) return `${input.route.origin}-${input.route.destination}`;
    if (input.origin && input.destination) return `${input.origin}-${input.destination}`;
    return undefined;
  })();
  const date = (input.dates && (input.dates.depart || input.dates.date)) || input.start_date || undefined;
  const hasBudget = (Number(input.budget_max) > 0) || (Number(input.budget_min) > 0);
  const rule = hasBudget
    ? { type: 'price_drop', route: routeStr, date, threshold: Number(input.budget_max) || Number(input.budget_min) || undefined }
    : { type: 'adred_recommendation', route: routeStr, date };
  const payload = {
    itinerary_id: input.itinerary_id,
    user_id: input.user_id,
    channel: input.channel || 'in_app',
    rules: [rule],
  };
  return doFetch<any>(`/alerts/subscribe`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getAlerts(): Promise<any[]> {
  // In mock mode, return current mock store + seeds
  if (getApiMode() === 'mock') {
    const store = ensureMockStore();
    const seed = [
      { id: 'a1', route: { origin: 'MAD', destination: 'CDG' }, price: 129, currency: 'EUR', status: 'active' },
      { id: 'a2', route: { origin: 'BCN', destination: 'LIS' }, price: 59, currency: 'EUR', status: 'paused' },
    ];
    return [...seed, ...(store.alerts || [])];
  }
  try {
    const res = await doFetch<{ items: any[] }>(`/alerts`, { method: 'GET' });
    return res.items || [];
  } catch (e: any) {
    if (e?.status === 404) {
      const res = await doFetch<{ items: any[] }>(`/alerts/list`, { method: 'GET' });
      return res.items || [];
    }
    throw e;
  }
}

export async function getItineraries(): Promise<any[]> {
  // In mock mode, bypass network and auth, return sample data
  if (getApiMode() === 'mock') {
    return [
      {
        id: 'i1',
        title: 'Weekend in Paris',
        days: 3,
        legs: [
          { day: 1, activity: 'Arrive and visit Eiffel Tower' },
          { day: 2, activity: 'Louvre and Seine cruise' },
          { day: 3, activity: 'Montmartre and return' },
        ],
      },
      {
        id: 'i2',
        title: 'Beach escape Lisbon',
        days: 2,
        legs: [
          { day: 1, activity: 'Alfama walk and Pastéis' },
          { day: 2, activity: 'Cascais day trip' },
        ],
      },
    ];
  }
  const res = await doFetch<{ items: any[] }>(`/itineraries`, { method: 'GET' });
  return res.items || [];
}

export async function getCommunityPosts(): Promise<any[]> {
  // In mock mode, bypass network and auth, return aligned sample data
  // Shape: { id, author, message, location: { city? string, lat?: number, lng?: number }, createdAt }
  if (getApiMode() === 'mock') {
    const now = new Date();
    return [
      {
        id: 'c1',
        author: 'Aisha',
        message: 'Tip: Buy tickets online to skip Eiffel lines!',
        location: { city: 'Paris', lat: 48.8584, lng: 2.2945 },
        createdAt: now.toISOString(),
      },
      {
        id: 'c2',
        author: 'Luis',
        message: 'Best paella near Barceloneta: go early.',
        location: { city: 'Barcelona', lat: 41.3874, lng: 2.1686 },
        createdAt: new Date(now.getTime() - 3600000).toISOString(),
      },
      {
        id: 'c3',
        author: 'Mei',
        message: 'Sunset viewpoint near Lisbon: Miradouro da Senhora do Monte.',
        location: { lat: 38.7238, lng: -9.1323 },
        createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      },
    ];
  }
  const res = await doFetch<{ items: any[] }>(`/community`, { method: 'GET' });
  return res.items || [];
}

export async function getDiagnostics(): Promise<any> {
  return doFetch<any>(`/health`, { method: 'GET' });
}

export async function searchListings(params: { city?: string; country?: string; q?: string; limit?: number }): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params?.city) qs.set('city', params.city);
  if (params?.country) qs.set('country', params.country);
  if (params?.q) qs.set('q', params.q);
  if (params?.limit) qs.set('limit', String(params.limit));
  const res = await doFetch<{ items: any[] }>(`/listings/search?${qs.toString()}`, { method: 'GET' });
  return res.items || [];
}

// Providers (guides/operators)
export type CreateProviderInput = {
  type: 'guide' | 'operator';
  name: string;
  email: string;
  phone?: string | null;
  languages?: string[] | string;
  base_city: string;
  country_code: string;
  documents?: { doc_type: string; url: string; notes?: string | null; status?: string }[];
};
export async function createProvider(body: CreateProviderInput): Promise<any> {
  return doFetch<any>(`/providers`, { method: 'POST', body: JSON.stringify(body) });
}
export async function getProvider(id: string): Promise<any> {
  return doFetch<any>(`/providers/${encodeURIComponent(id)}`, { method: 'GET' });
}

// Listings (tours/services)
export type CreateListingInput = {
  provider_id: string;
  title: string;
  description?: string | null;
  category: string; // 'tour' | 'transfer' | 'activity' | 'custom'
  city: string;
  country_code: string;
  duration_minutes?: number | null;
  price_from?: number | string | null;
  currency?: string;
  startDate?: string; // ISO
  endDate?: string;   // ISO
  tags?: string[] | string;
  status?: string;
};
export async function createListing(body: CreateListingInput): Promise<any> {
  return doFetch<any>(`/listings`, { method: 'POST', body: JSON.stringify(body) });
}

export default { generateItinerary, predictPricing, listAlerts, subscribeAlert, getAlerts, getItineraries, getCommunityPosts, getDiagnostics, searchListings, createProvider, getProvider, createListing, createBooking, startCheckout };


