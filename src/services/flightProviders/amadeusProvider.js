// src/services/flightProviders/amadeusProvider.js
// Placeholder adapter — replace with real API integration
import { normalizeFlight, ProviderError } from './providerInterfaces';

export async function fetchQuotes({ origin, destination, departureDate, returnDate, adults = 1 }) {
  try {
    const data = [];
    return data.map((q) => normalizeFlight(q, 'Amadeus'));
  } catch (e) {
    throw new ProviderError('Amadeus provider failed', { cause: e });
  }
}

export default { fetchQuotes };

