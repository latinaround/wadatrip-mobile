// src/services/flightProviders/skyscannerProvider.js
// Placeholder adapter — replace with real API integration
import { normalizeFlight, ProviderError } from './providerInterfaces';

export async function fetchQuotes({ origin, destination, departureDate, returnDate, adults = 1 }) {
  try {
    // TODO: call real API. For now return empty array
    const data = [];
    return data.map((q) => normalizeFlight(q, 'Skyscanner'));
  } catch (e) {
    throw new ProviderError('Skyscanner provider failed', { cause: e });
  }
}

export default { fetchQuotes };

