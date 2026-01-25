// src/services/toursService.js
// Lightweight ranking for tours with budget awareness and popularity

// Mock catalog. Later, replace with real API fetch (Tripadvisor/Expedia/etc.)
const MOCK_TOURS = [
  // Tokyo
  { id: 't1', city: 'Tokyo', title: 'Tokyo Highlights Full-Day Tour', provider: 'MockAdvisor', price: 120, rating: 4.8, reviews: 1340, durationHours: 8, categories: ['city', 'culture'], discount: 0.1, url: 'https://example.com/tours/tokyo-highlights' },
  { id: 't2', city: 'Tokyo', title: 'Mt. Fuji and Hakone Day Trip', provider: 'MockAdvisor', price: 140, rating: 4.7, reviews: 980, durationHours: 10, categories: ['nature', 'day-trip'], discount: 0.05, url: 'https://example.com/tours/mt-fuji-hakone' },
  { id: 't3', city: 'Tokyo', title: 'Tsukiji Market + Sushi Workshop', provider: 'MockAdvisor', price: 95, rating: 4.6, reviews: 520, durationHours: 4, categories: ['food'], discount: 0.0, url: 'https://example.com/tours/tsukiji-sushi' },
  { id: 't4', city: 'Tokyo', title: 'Akihabara Anime & Tech Walk', provider: 'MockAdvisor', price: 45, rating: 4.5, reviews: 410, durationHours: 3, categories: ['city', 'pop-culture'], discount: 0.15, url: 'https://example.com/tours/akihabara-walk' },

  // San Francisco
  { id: 's1', city: 'San Francisco', title: 'Alcatraz + City Tour', provider: 'MockAdvisor', price: 135, rating: 4.7, reviews: 2100, durationHours: 6, categories: ['city', 'history'], discount: 0.05, url: 'https://example.com/tours/alcatraz-city' },
  { id: 's2', city: 'San Francisco', title: 'Wine Country Day Trip', provider: 'MockAdvisor', price: 160, rating: 4.6, reviews: 870, durationHours: 9, categories: ['wine', 'day-trip'], discount: 0.1, url: 'https://example.com/tours/wine-country' },
];

// Score components: price fit, rating, popularity, discount
export function scoreTour(tour, budgetMin, budgetMax) {
  const price = tour.price;
  const rating = tour.rating; // out of 5
  const popularity = Math.log10(1 + tour.reviews); // diminishing returns
  const discount = tour.discount || 0; // 0..0.5

  // Price fitness: best when inside budget; small penalty outside
  let priceFit = 0.0;
  if (budgetMin != null && budgetMax != null) {
    if (price >= budgetMin && price <= budgetMax) {
      // closer to center of budget range is slightly better
      const mid = (budgetMin + budgetMax) / 2;
      const span = Math.max(1, budgetMax - budgetMin);
      priceFit = 1 - Math.min(1, Math.abs(price - mid) / span);
    } else {
      const dist = price < budgetMin ? budgetMin - price : price - budgetMax;
      // penalize outside range — farther is worse
      priceFit = Math.max(0, 1 - dist / Math.max(1, budgetMax));
    }
  }

  const ratingNorm = rating / 5; // 0..1
  const popNorm = Math.min(1, popularity / 3); // rough cap
  const discountBoost = Math.min(1, discount / 0.3); // cap 30%

  // Weighted sum
  const score = 0.38 * priceFit + 0.34 * ratingNorm + 0.20 * popNorm + 0.08 * discountBoost;
  return score;
}

export async function searchAndRankTours({ destination, budgetMin, budgetMax, categories = [] }) {
  const city = (destination || '').trim().toLowerCase();
  if (!city) return [];

  // Filter by city and categories
  let candidates = MOCK_TOURS.filter(t => t.city.toLowerCase().includes(city));
  if (categories.length) {
    candidates = candidates.filter(t => categories.some(c => t.categories.includes(c)));
  }

  const ranked = candidates
    .map(t => ({ ...t, score: scoreTour(t, budgetMin, budgetMax) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return ranked;
}

// Placeholder for future integration
export async function fetchFromProviders(query) {
  // TODO: Integrate TripAdvisor/Expedia or GDS later
  return searchAndRankTours(query);
}

export default { searchAndRankTours, fetchFromProviders };

// Top mock tours across all cities (no filter)
export async function topMockTours(limit = 10) {
  const ranked = MOCK_TOURS
    .map(t => ({ ...t, score: scoreTour(t, null, null) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked;
}
