import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'wadatrip_mobile_app_session';
const listeners = new Set();

const normalizeUser = (raw = {}) => ({
  uid: String(raw.uid || raw.id || raw.email || 'guide-code-user'),
  email: String(raw.email || ''),
  displayName: String(raw.displayName || raw.name || ''),
  photoURL: String(raw.photoURL || raw.photo_url || ''),
  role: String(raw.role || 'guide'),
  authSource: String(raw.authSource || 'guide_code'),
});

const emit = (session) => {
  for (const listener of listeners) {
    try { listener(session); } catch {}
  }
};

const applySessionGlobals = (session) => {
  try { global.AUTH_TOKEN = session?.token || undefined; } catch {}
  try { global.APP_SESSION_USER = session?.user || undefined; } catch {}
};

export async function hydrateStoredAppSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      applySessionGlobals(null);
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user?.email) {
      await AsyncStorage.removeItem(SESSION_KEY);
      applySessionGlobals(null);
      return null;
    }
    const session = {
      ...parsed,
      user: normalizeUser(parsed.user),
    };
    applySessionGlobals(session);
    return session;
  } catch {
    applySessionGlobals(null);
    return null;
  }
}

export async function saveGuideCodeSession(payload = {}) {
  const token = String(payload.token || '').trim();
  if (!token) throw new Error('Missing auth token');
  const session = {
    kind: 'guide_code',
    token,
    user: normalizeUser(payload.user || payload),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  applySessionGlobals(session);
  emit(session);
  return session;
}

export async function clearStoredAppSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {}
  applySessionGlobals(null);
  emit(null);
}

export function getCurrentAppUser() {
  try {
    return global.APP_SESSION_USER || null;
  } catch {
    return null;
  }
}

export function subscribeAppSession(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
