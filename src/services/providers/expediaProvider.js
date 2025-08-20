// src/services/providers/expediaProvider.js
// Placeholder provider adapter for Expedia-like API
import { normalizeTour, ProviderError } from './providerInterfaces';

export async function fetchTours({ destination, budgetMin, budgetMax }) {
  try {
    // TODO: Replace with real API call. For now, return empty array.
    const data = [];
    return data.map((t) => normalizeTour(t, 'Expedia'));
  } catch (e) {
    throw new ProviderError('Expedia provider failed', { cause: e });
  }
}

export default { fetchTours };

