
export type CreateBookingInput = {
  listing_id: string;
  date: string; // ISO YYYY-MM-DD
  num_people: number;
  total_price?: number | string;
  user_email?: string;
  user_name?: string;
  trip_id?: string;
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

function sanitizeBaseUrl(input: string): string {
  let base = input.trim();
  if (Platform.OS === 'android') {
    base = base.replace(/^https?:\/\/localhost/i, 'http://10.0.2.2');
    base = base.replace(/^https?:\/\/127\.0\.0\.1/i, 'http://10.0.2.2');
  }
  return base.replace(/\/+$/, '');
}

function isLoopbackBaseUrl(input: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.0\.3\.2)(?::\d+)?(?:\/|$)/i.test(input.trim());
}

function resolveApiBases(): string[] {
  const extra = (Constants as any)?.expoConfig?.extra || {};
  const env = (typeof process !== 'undefined' ? (process as any).env : undefined) as Record<string, any> | undefined;
  const bases: string[] = [];
  const fallbackQueue: string[] = [];
  let hasPrimary = false;
  const allowLoopback = typeof __DEV__ !== 'undefined' && __DEV__;

  const pushUnique = (value: string | undefined | null, target: 'primary' | 'fallback' | 'default') => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const sanitized = sanitizeBaseUrl(trimmed);
    if (!allowLoopback && isLoopbackBaseUrl(sanitized)) {
      return;
    }
    if (target === 'fallback') {
      if (!fallbackQueue.includes(sanitized) && !bases.includes(sanitized)) {
        fallbackQueue.push(sanitized);
      }
      return;
    }
    if (!bases.includes(sanitized)) {
      bases.push(sanitized);
      if (target === 'primary') {
        hasPrimary = true;
      }
    }
  };

  pushUnique(extra.API_BASE_URL as string | undefined, 'primary');
  pushUnique(env?.EXPO_PUBLIC_API_BASE_URL as string | undefined, 'primary');
  pushUnique((global as any).API_BASE_URL as string | undefined, 'primary');

  if (!hasPrimary) {
    pushUnique('https://wadatrip.onrender.com', 'default');
  }

  pushUnique(env?.EXPO_PUBLIC_API_FALLBACK_URL as string | undefined, 'fallback');
  pushUnique(extra.API_FALLBACK_URL as string | undefined, 'fallback');

  for (const fallback of fallbackQueue) {
    if (!bases.includes(fallback)) {
      bases.push(fallback);
    }
  }

  const mode = String(extra.API_MODE || env?.EXPO_PUBLIC_API_MODE || '').toLowerCase();
  const liveFallback = sanitizeBaseUrl('https://wadatrip.onrender.com');
  if (mode !== 'mock' && !bases.includes(liveFallback)) {
    bases.push(liveFallback);
  }

  if (!__loggedBaseOnce) {
    __loggedBaseOnce = true;
    try { console.log('[API] Candidate base URLs:', bases, 'Platform:', Platform.OS); } catch {}
  }

  return bases;
}

function getBaseUrl(): string {
  const bases = resolveApiBases();
  return bases[0];
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

export type RequestAuthCodeInput = {
  email: string;
  role?: string;
  name?: string;
};

export type VerifyAuthCodeInput = {
  email: string;
  code: string;
  role?: string;
  name?: string;
};

export async function requestAuthCode(body: RequestAuthCodeInput): Promise<any> {
  return doFetch<any>(`/auth/request-code`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function verifyAuthCode(body: VerifyAuthCodeInput): Promise<any> {
  return doFetch<any>(`/auth/verify-code`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function exchangeFirebaseToken(idToken: string): Promise<any> {
  return doFetch<any>('/auth/firebase', { method: 'POST', body: JSON.stringify({ id_token: idToken }) });
}

export async function registerExpoPushToken(token: string, platform?: string): Promise<any> {
  return doFetch<any>('/devices/push-token', { method: 'POST', body: JSON.stringify({ token, platform }) });
}
async function doFetch<T>(path: string, init: RequestInit): Promise<T> {
  const bases = resolveApiBases();
  const extra = (Constants as any)?.expoConfig?.extra || {};
  const rawTimeout = extra.HTTP_TIMEOUT_MS ?? (typeof process !== 'undefined' ? (process as any).env?.EXPO_PUBLIC_HTTP_TIMEOUT_MS : undefined);
  const timeoutMs = Number(rawTimeout) > 0 ? Number(rawTimeout) : 10000;

  const attempt = async (base: string): Promise<T> => {
    const token = getAuthToken();
    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined as any;
    const timer = controller ? setTimeout(() => {
      try { controller.abort(); } catch {}
    }, timeoutMs) : undefined;

    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${normalizedBase}${normalizedPath}`;

    try {
      const res = await fetch(url, { ...init, headers, signal: controller?.signal });
      if (!res.ok) {
        const textBody = await res.text().catch(() => '');
        const err: any = new Error(`HTTP ${res.status} ${res.statusText}: ${textBody}`);
        err.status = res.status;
        err.statusText = res.statusText;
        err.body = textBody;
        err.url = url;
        throw err;
      }
      if (res.status === 204) {
        return undefined as T;
      }
      return (await res.json()) as T;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        const err: any = new Error('Network timeout');
        err.status = 0;
        err.code = 'timeout';
        err.body = 'timeout';
        err.url = url;
        throw err;
      }
      const msg = String(e?.message || e || '');
      if (/Network request failed/i.test(msg) || /TypeError/i.test(e?.name)) {
        const err: any = new Error(`Network request failed: ${url}`);
        err.status = 0;
        err.code = 'network';
        err.url = url;
        err.body = `Could not reach ${url}`;
        throw err;
      }
      if (typeof e === 'object' && e !== null && !(e as any).url) {
        (e as any).url = url;
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const errors: { base: string; error: any }[] = [];
  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i];
    try {
      return await attempt(base);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNetworkish = err?.code === 'network' || err?.code === 'timeout' || err?.status === 0 || /Could not reach/i.test(msg) || /Network request failed/i.test(msg);
      if (!isNetworkish) {
        throw err;
      }
      errors.push({ base, error: err });
      if (i === bases.length - 1) {
        (err as any).attemptedBases = bases;
        throw err;
      }
    }
  }
  const aggregated: any = new Error(`Network error contacting API. Tried: ${bases.join(', ')}`);
  aggregated.attemptedBases = bases;
  aggregated.causes = errors;
  throw aggregated;
}

// In-memory mock stores (lives for app session)
const __mockStore: {
  alerts?: any[];
} = {};
function ensureMockStore() {
  if (!__mockStore.alerts) __mockStore.alerts = [];
  return __mockStore;
}

function toAlertRouteLabel(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const origin = String(value.origin || value.from || '').trim();
  const destination = String(value.destination || value.to || '').trim();
  return [origin, destination].filter(Boolean).join('-');
}

function normalizeAlertItem(item: any, idx = 0): any {
  const rule = Array.isArray(item?.rules) ? item.rules.find(Boolean) || item.rules[0] : undefined;
  const route =
    toAlertRouteLabel(item?.route) ||
    toAlertRouteLabel(item?.route_info) ||
    toAlertRouteLabel(rule?.route) ||
    toAlertRouteLabel(item?.flight_route) ||
    [item?.origin, item?.destination].filter(Boolean).join('-');
  const currentPrice = item?.current_price ?? item?.price ?? item?.latest_price ?? item?.pricing?.current_price;
  const predictedLow = item?.predicted_low ?? item?.target_price ?? item?.pricing?.predicted_low ?? rule?.threshold;
  const action =
    item?.action ||
    item?.recommended_action ||
    item?.adred_action ||
    rule?.action ||
    (rule?.type === 'price_drop' ? 'watch' : rule?.type);
  const date =
    item?.date ||
    item?.travel_date ||
    item?.start_date ||
    item?.departure_date ||
    rule?.date ||
    item?.dates?.depart;

  return {
    ...item,
    id: String(item?.id || item?.alert_id || rule?.id || `${route || 'alert'}-${idx}`),
    route: route || 'Route',
    current_price: currentPrice != null ? Number(currentPrice) : null,
    predicted_low: predictedLow != null ? Number(predictedLow) : null,
    action: action ? String(action).toLowerCase() : '',
    status: String(item?.status || item?.state || item?.subscription_status || 'active').toLowerCase(),
    currency: String(item?.currency || item?.pricing?.currency || 'USD').toUpperCase(),
    threshold: rule?.threshold ?? item?.threshold ?? item?.budget_max ?? item?.target_price ?? null,
    date: date ? String(date) : '',
    channel: String(item?.channel || 'in_app'),
    rule_type: String(rule?.type || ''),
    raw: item,
  };
}

function alertDedupeKey(item: any): string {
  const route = String(item?.route || '').trim().toUpperCase();
  const date = String(item?.date || '').slice(0, 10);
  const action = String(item?.action || item?.rule_type || '').trim().toLowerCase();
  const threshold = item?.threshold != null ? String(Number(item.threshold)) : '';
  return [route, date, action, threshold].join('|');
}

function dedupeAlertItems(items: any[]): any[] {
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const item of items) {
    const key = alertDedupeKey(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function extractAlertItems(input: any): any[] {
  if (Array.isArray(input)) {
    return dedupeAlertItems(input.map((item, idx) => normalizeAlertItem(item, idx)));
  }
  const items = Array.isArray(input?.items)
    ? input.items
    : Array.isArray(input?.alerts)
      ? input.alerts
      : [];
  return dedupeAlertItems(items.map((item, idx) => normalizeAlertItem(item, idx)));
}

export async function generateItinerary(request: GenerateItineraryRequest): Promise<GenerateItineraryResponse> {
  return doFetch<GenerateItineraryResponse>('/itineraries/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export type PredictInput = { origin: string; destination: string; start_date?: string };
export type FlightRecommendationInput = {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  budget?: number;
  budgetMin?: number;
  budgetMax?: number;
  maxWaitHours?: number;
  flexDays?: number;
  adults?: number;
};

export type FlightRecommendation = {
  current_price: number;
  predicted_low: number;
  predicted_high: number;
  fair_price: number;
  recommendation: string;
  confidence: number;
  best_buy_window_hours: number;
  within_budget: boolean;
  reason: string;
  history_points: number;
  price_change_48h: number;
  cheapest_offer?: any | null;
  offers?: any[];
};

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

export async function getFlightRecommendation(input: FlightRecommendationInput): Promise<FlightRecommendation> {
  const payload = {
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    budget: input.budget,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    maxWaitHours: input.maxWaitHours ?? 168,
    flexDays: input.flexDays ?? 0,
    adults: input.adults ?? 1,
  };

  try {
    const res = await doFetch<{ recommendation: FlightRecommendation }>(`/flights/recommendation`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.recommendation;
  } catch (e: any) {
    if (e?.status && ![400, 404, 405, 500, 501].includes(Number(e.status))) {
      throw e;
    }

    try {
      const predictions = await predictPricing({
        origin: input.origin,
        destination: input.destination,
        start_date: input.departureDate,
      });
      const first = predictions?.[0];
      if (first) {
        const currentPrice = Number(first.current_price || first.predicted_low || 0);
        const predictedLow = Number(first.predicted_low || currentPrice || 0);
        return {
          current_price: currentPrice,
          predicted_low: predictedLow,
          predicted_high: Math.max(currentPrice, predictedLow),
          fair_price: currentPrice || predictedLow,
          recommendation: String(first.action || 'watch'),
          confidence: Number(first.confidence || 0.55),
          best_buy_window_hours: 24,
          within_budget: false,
          reason: 'Fallback prediction from the pricing endpoint.',
          history_points: 0,
          price_change_48h: Number(predictedLow - currentPrice),
          cheapest_offer: null,
          offers: [],
        };
      }
    } catch {}

    const { getFlightAdvice } = await import('../services/mlFlightPredictor');
    const advice = await getFlightAdvice({
      origin: input.origin,
      destination: input.destination,
      departureDate: input.departureDate,
      budget: input.budgetMax || input.budget || input.budgetMin,
    });
    return {
      current_price: Number(advice.predictedPrice || 0),
      predicted_low: Number(advice.lowerBound || advice.predictedPrice || 0),
      predicted_high: Number(advice.upperBound || advice.predictedPrice || 0),
      fair_price: Number(advice.predictedPrice || 0),
      recommendation: String(advice.recommendation || 'watch'),
      confidence: Number(advice.confidence || 0.5),
      best_buy_window_hours: Number(advice.nextCheckHours || 24),
      within_budget: false,
      reason: String(advice.reason || 'Fallback prediction from the local heuristic model.'),
      history_points: 0,
      price_change_48h: 0,
      cheapest_offer: null,
      offers: [],
    };
  }
}

export async function listAlerts(): Promise<any[]> {
  if (getApiMode() === 'mock') {
    const store = ensureMockStore();
    const seed = [
      { id: 'a1', route: { origin: 'MAD', destination: 'CDG' }, current_price: 129, predicted_low: 102, currency: 'EUR', status: 'active', action: 'wait' },
      { id: 'a2', route: { origin: 'BCN', destination: 'LIS' }, current_price: 59, predicted_low: 54, currency: 'EUR', status: 'paused', action: 'buy' },
      { id: 'a3', route: { origin: 'MEX', destination: 'JFK' }, current_price: 210, predicted_low: 187, currency: 'USD', status: 'active', action: 'watch' },
    ];
    return extractAlertItems([...seed, ...(store.alerts || [])]);
  }
  try {
    const res = await doFetch<any>(`/alerts`, { method: 'GET' });
    return extractAlertItems(res);
  } catch (e: any) {
    if (e?.status === 404) {
      const res = await doFetch<any>(`/alerts/list`, { method: 'GET' });
      return extractAlertItems(res);
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
    return normalizeAlertItem(created);
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
  const res = await doFetch<any>(`/alerts/subscribe`, { method: 'POST', body: JSON.stringify(payload) });
  return normalizeAlertItem({ ...input, ...res, route: input.route || routeStr, budget_max: input.budget_max, budget_min: input.budget_min, dates: input.dates });
}

export async function getAlerts(): Promise<any[]> {
  return listAlerts();
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

export async function listBookings(params: { user_email?: string; user_id?: string; provider_id?: string; listing_id?: string; status?: string; limit?: number } = {}): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params.user_email) qs.set('user_email', String(params.user_email));
  if (params.user_id) qs.set('user_id', String(params.user_id));
  if (params.provider_id) qs.set('provider_id', String(params.provider_id));
  if (params.listing_id) qs.set('listing_id', String(params.listing_id));
  if (params.status) qs.set('status', String(params.status));
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await doFetch<{ items: any[] }>(`/bookings?${qs.toString()}`, { method: 'GET' });
  return res.items || [];
}

export async function getBooking(id: string): Promise<any> {
  return doFetch<any>(`/bookings/${encodeURIComponent(id)}`, { method: 'GET' });
}

export type WadaAgentChatInput = {
  message: string;
  context?: {
    origin?: string;
    destination?: string;
    dates?: string;
    start_date?: string;
    budget?: string;
    interests?: string[];
    user_email?: string;
    user_id?: string;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type WadaAgentChatResponse = {
  reply: string;
  recommendations?: Array<{
    type?: string;
    title?: string;
    price?: number;
    currency?: string;
    recommended_action?: string;
    adred_action?: string;
  }>;
  table?: { columns?: string[]; rows?: string[][] };
  meta?: { confidence?: number; notes?: string };
};

export async function chatWadaAgent(body: WadaAgentChatInput): Promise<WadaAgentChatResponse> {
  try {
    return await doFetch<WadaAgentChatResponse>(`/wadagent/chat`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    if (e?.status && ![400, 404, 405, 500, 501, 502].includes(Number(e.status))) {
      throw e;
    }
    return {
      reply: 'I can help with tours, flight timing, and your bookings. The live assistant is not available right now, so try again in a moment.',
      recommendations: [],
      table: { columns: [], rows: [] },
      meta: { confidence: 0.2, notes: 'agent_fallback' },
    };
  }
}

export async function searchListings(params: {
  city?: string;
  country?: string;
  q?: string;
  provider_id?: string;
  limit?: number;
  status?: string;
  min_price?: number | string;
  max_price?: number | string;
  free_tour?: boolean;
}): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params?.city) qs.set('city', params.city);
  if (params?.country) qs.set('country', params.country);
  if (params?.q) qs.set('q', params.q);
  if (params?.provider_id) qs.set('provider_id', params.provider_id);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  if (params?.min_price != null) qs.set('min_price', String(params.min_price));
  if (params?.max_price != null) qs.set('max_price', String(params.max_price));
  if (params?.free_tour) qs.set('free_tour', 'true');
  const res = await doFetch<{ items: any[] }>(`/listings/search?${qs.toString()}`, { method: 'GET' });
  return res.items || [];
}

export type DestinationCover = {
  id?: string;
  slug?: string;
  city?: string;
  country_code?: string | null;
  title?: string | null;
  image_url?: string | null;
  eyebrow?: string | null;
  active?: boolean;
};

export async function listDestinationCovers(params: {
  city?: string;
  country_code?: string;
  slug?: string;
  active?: boolean;
  limit?: number;
} = {}): Promise<DestinationCover[]> {
  const qs = new URLSearchParams();
  if (params.city) qs.set('city', String(params.city));
  if (params.country_code) qs.set('country_code', String(params.country_code));
  if (params.slug) qs.set('slug', String(params.slug));
  if (params.active != null) qs.set('active', params.active ? 'true' : 'false');
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await doFetch<{ items: DestinationCover[] }>(`/destination-covers${suffix}`, { method: 'GET' });
  return res.items || [];
}

export async function resolveDestinationCover(params: {
  city?: string;
  country_code?: string;
  slug?: string;
}): Promise<DestinationCover | null> {
  const qs = new URLSearchParams();
  if (params.city) qs.set('city', String(params.city));
  if (params.country_code) qs.set('country_code', String(params.country_code));
  if (params.slug) qs.set('slug', String(params.slug));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  try {
    return await doFetch<DestinationCover | null>(`/destination-covers/resolve${suffix}`, { method: 'GET' });
  } catch (e: any) {
    if ([400, 404].includes(Number(e?.status || 0))) return null;
    throw e;
  }
}

function lowerText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function normalizeProviderStatus(provider: any): '' | 'pending' | 'approved' | 'rejected' {
  const status = lowerText(provider?.status);
  const verification = lowerText(provider?.verification_status);

  if (!status && !verification) return '';
  if (status === 'rejected' || verification === 'rejected') return 'rejected';
  if (status === 'approved' || status === 'verified' || verification === 'approved' || verification === 'verified') {
    return 'approved';
  }
  if (status === 'review_required') return 'pending';
  return 'pending';
}

export function isProviderApproved(provider: any): boolean {
  return normalizeProviderStatus(provider) === 'approved';
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
  verified_level?: 'licensed' | 'community';
  license_url?: string | null;
  access_code?: string;
};
export async function createProvider(body: CreateProviderInput): Promise<any> {
  const headers: Record<string, string> = {};
  if (body?.access_code) headers['x-operator-access-code'] = String(body.access_code);
  return doFetch<any>(`/providers`, { method: 'POST', headers, body: JSON.stringify(body) });
}
export async function getProvider(id: string): Promise<any> {
  return doFetch<any>(`/providers/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function getMyProvider(): Promise<any> {
  return doFetch<any>(`/providers/me`, { method: 'GET' });
}

export async function getCurrentProvider(fallbackEmail?: string): Promise<any> {
  try {
    return await getMyProvider();
  } catch (e: any) {
    const status = Number(e?.status || 0);
    const msg = String(e?.message || e || '');
    const shouldTryEmailFallback = !!fallbackEmail && (status === 400 || status === 404 || /provider not found/i.test(msg));
    if (!shouldTryEmailFallback) throw e;

    const normalized = lowerText(fallbackEmail);
    const items = await listProviders({ q: normalized, limit: 25 });
    const exact = (Array.isArray(items) ? items : []).find((item) => lowerText(item?.email) === normalized);
    if (exact) return exact;
    throw e;
  }
}

export async function listProviders(params: {
  status?: string;
  q?: string;
  limit?: number;
  page?: number;
} = {}): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', String(params.status));
  if (params.q) qs.set('q', String(params.q));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.page) qs.set('page', String(params.page));
  const res = await doFetch<{ items: any[] }>(`/providers?${qs.toString()}`, { method: 'GET' });
  return res.items || [];
}

export async function getProviderByEmail(email: string): Promise<any | null> {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const items = await listProviders({ q: normalized, limit: 25 });
  const exact = items.find((item) => String(item?.email || '').toLowerCase() === normalized);
  return exact || null;
}

// Listings (tours/services)
export type CreateListingInput = {
  provider_id?: string;
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
  access_code?: string;
};
export async function createListing(body: CreateListingInput): Promise<any> {
  const headers: Record<string, string> = {};
  if (body?.access_code) headers['x-operator-access-code'] = String(body.access_code);
  return doFetch<any>(`/listings`, { method: 'POST', headers, body: JSON.stringify(body) });
}

export type UpdateListingInput = Partial<CreateListingInput> & { access_code?: string };
export async function getListing(id: string): Promise<any> {
  return doFetch<any>(`/listings/${encodeURIComponent(id)}`, { method: 'GET' });
}
export async function updateListing(id: string, body: UpdateListingInput): Promise<any> {
  const headers: Record<string, string> = {};
  if (body?.access_code) headers['x-operator-access-code'] = String(body.access_code);
  return doFetch<any>(`/listings/${encodeURIComponent(id)}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
}
export async function deleteListing(id: string, accessCode?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (accessCode) headers['x-operator-access-code'] = String(accessCode);
  return doFetch<any>(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
}

export type CreateTripInput = { destination: string; title?: string; start_date?: string; end_date?: string; travelers?: number; budget?: number | string; currency?: string; interests?: string[]; };
export async function listTrips(): Promise<any[]> { const res = await doFetch<{ items: any[] }>(`/trips`, { method: 'GET' }); return res.items || []; }
export async function createTrip(body: CreateTripInput): Promise<any> { return doFetch<any>('/trips', { method: 'POST', body: JSON.stringify(body) }); }
export async function getTrip(id: string): Promise<any> { return doFetch<any>(`/trips/${encodeURIComponent(id)}`, { method: 'GET' }); }
export async function saveTripExperience(tripId: string, listingId: string, source = 'traveler'): Promise<any> { return doFetch<any>(`/trips/${encodeURIComponent(tripId)}/experiences`, { method: 'POST', body: JSON.stringify({ listing_id: listingId, source }) }); }
export default {
  generateItinerary,
  predictPricing,
  getFlightRecommendation,
  listAlerts,
  subscribeAlert,
  getAlerts,
  getItineraries,
  getCommunityPosts,
  getDiagnostics,
  listBookings,
  getBooking,
  chatWadaAgent,
  searchListings,
  listDestinationCovers,
  resolveDestinationCover,
  createProvider,
  getProvider,
  getMyProvider,
  getCurrentProvider,
  listProviders,
  getProviderByEmail,
  createListing,
  getListing,
  updateListing,
  deleteListing,
  createBooking,
  listTrips,
  createTrip,
  getTrip,
  saveTripExperience,
  startCheckout,
  requestAuthCode,
  exchangeFirebaseToken,
  registerExpoPushToken,
  verifyAuthCode,
};


