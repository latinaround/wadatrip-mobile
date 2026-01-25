// src/services/flightProviders/providerInterfaces.js
// Normalize flight quotes across providers and standardize errors

/**
 * NormalizedFlight shape
 * {
 *   provider: string,
 *   origin: string,
 *   destination: string,
 *   departureDate?: string, // ISO
 *   returnDate?: string,    // ISO
 *   price: number,
 *   currency?: string,
 *   cabin?: string,
 *   stops?: number,
 *   url?: string,
 *   collectedAt?: string,   // ISO timestamp
 * }
 */

export function normalizeFlight(partial, provider) {
  return {
    provider,
    origin: String(partial.origin || ''),
    destination: String(partial.destination || ''),
    departureDate: partial.departureDate || undefined,
    returnDate: partial.returnDate || undefined,
    price: Number(partial.price || 0),
    currency: partial.currency || 'USD',
    cabin: partial.cabin || 'ECONOMY',
    stops: typeof partial.stops === 'number' ? partial.stops : undefined,
    url: partial.url,
    collectedAt: partial.collectedAt || new Date().toISOString(),
  };
}

export class ProviderError extends Error {
  constructor(message, meta) {
    super(message);
    this.name = 'FlightProviderError';
    this.meta = meta;
  }
}

export default { normalizeFlight, ProviderError };

