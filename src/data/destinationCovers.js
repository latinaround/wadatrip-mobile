export const DESTINATION_COVERS = {
  lima: {
    imageUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Coastal city break',
  },
  cancun: {
    imageUrl: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Beach and day tours',
  },
  'mexico city': {
    imageUrl: 'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Big city culture',
  },
  madrid: {
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'City walks and food',
  },
  barcelona: {
    imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Architecture and coast',
  },
  paris: {
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Classic city escapes',
  },
  rome: {
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'History and local life',
  },
  tokyo: {
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Fast city discovery',
  },
  'new york': {
    imageUrl: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Iconic city routes',
  },
  'los angeles': {
    imageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=80',
    eyebrow: 'Sun, food and neighborhoods',
  },
  default: {
    imageUrl: '',
    eyebrow: 'Curated destination pick',
  },
};

export function getDestinationCover(city) {
  const key = String(city || '').trim().toLowerCase();
  return DESTINATION_COVERS[key] || DESTINATION_COVERS.default;
}
