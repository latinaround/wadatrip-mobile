// src/services/providers/providerInterfaces.js
// Lightweight provider interface and normalizer for tour providers.

/**
 * NormalizedTour shape
 * {
 *   id: string,
 *   provider: string,
 *   title: string,
 *   city: string,
 *   price: number,
 *   rating: number, // 0..5
 *   reviews: number,
 *   durationHours?: number,
 *   categories?: string[],
 *   discount?: number, // 0..1
 *   url?: string,
 *   images?: string[],
 * }
 */

export function normalizeTour(partial, provider) {
  return {
    id: String(partial.id ?? `${provider}-${partial.title ?? 'tour'}`),
    provider,
    title: String(partial.title ?? 'Tour'),
    city: String(partial.city ?? ''),
    price: Number(partial.price ?? 0),
    rating: Number(partial.rating ?? 0),
    reviews: Number(partial.reviews ?? 0),
    durationHours: partial.durationHours != null ? Number(partial.durationHours) : undefined,
    categories: Array.isArray(partial.categories) ? partial.categories : [],
    discount: partial.discount != null ? Number(partial.discount) : 0,
    url: partial.url,
    images: Array.isArray(partial.images) ? partial.images : undefined,
  };
}

export class ProviderError extends Error {
  constructor(message, meta) {
    super(message);
    this.name = 'ProviderError';
    this.meta = meta;
  }
}

export default { normalizeTour, ProviderError };

