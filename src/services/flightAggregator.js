// src/services/flightAggregator.js
// Aggregate across multiple flight providers and return best quotes
import * as SKY from './flightProviders/skyscannerProvider';
import * as AMA from './flightProviders/amadeusProvider';

const PROVIDERS = [SKY, AMA];

export async function fetchBestQuotes(params) {
  const tasks = PROVIDERS.map((p) => p.fetchQuotes(params).catch(() => []));
  const lists = await Promise.all(tasks);
  const quotes = lists.flat().filter((q) => q && q.price > 0);
  quotes.sort((a, b) => a.price - b.price);
  return quotes;
}

export async function fetchBestPrice(params) {
  const quotes = await fetchBestQuotes(params);
  return quotes[0] || null;
}

export default { fetchBestQuotes, fetchBestPrice };

