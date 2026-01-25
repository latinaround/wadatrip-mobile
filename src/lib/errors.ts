// src/lib/errors.js
export function extractErrorDetails(err) {
  try {
    if (!err || !('body' in err)) return null;
    const raw = String(err.body || '').trim();
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      return JSON.stringify(obj, null, 2);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}
