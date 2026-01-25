// src/services/toursAggregator.js
// Aggregates multiple providers and ranks results.
import * as TA from './providers/tripadvisorProvider';
import * as EX from './providers/expediaProvider';
import { scoreTour } from './toursService';

const PROVIDERS = [TA, EX];

export async function fetchAndRank({ destination, budgetMin, budgetMax, limit = 30 }) {
  const queries = PROVIDERS.map((p) => p.fetchTours({ destination, budgetMin, budgetMax }).catch(() => []));
  const results = (await Promise.all(queries)).flat();

  // Deduplicate by title+city+provider URL if any
  const seen = new Set();
  const deduped = [];
  for (const t of results) {
    const key = `${t.provider}|${(t.city || '').toLowerCase()}|${(t.title || '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(t);
    }
  }

  const ranked = deduped
    .map((t) => ({ ...t, score: scoreTour(t, budgetMin, budgetMax) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}

export default { fetchAndRank };

