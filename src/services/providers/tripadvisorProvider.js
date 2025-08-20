// src/services/providers/tripadvisorProvider.js
// Placeholder provider adapter for TripAdvisor-like API
import { normalizeTour, ProviderError } from './providerInterfaces';

export async function fetchTours({ destination, budgetMin, budgetMax }) {
  try {
    // TODO: Replace with real API call. For now, return empty array.
    // Example request would include destination text and optional price filters.
    const data = [];
    return data.map((t) => normalizeTour(t, 'TripAdvisor'));
  } catch (e) {
    throw new ProviderError('TripAdvisor provider failed', { cause: e });
  }
}

export default { fetchTours };

