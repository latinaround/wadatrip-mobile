// src/services/cronMock.js
// Development-only mock to simulate backend cron for tours alerts.
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { fetchAndRank } from './toursAggregator';

export async function runToursRefreshForUser(db, uid) {
  const alertsQ = query(collection(db, 'tourAlerts'), where('uid', '==', uid));
  const snap = await getDocs(alertsQ);
  const tasks = [];
  snap.forEach((doc) => {
    const a = doc.data();
    tasks.push((async () => {
      const ranked = await fetchAndRank({ destination: a.destination, budgetMin: a.budgetMin ?? undefined, budgetMax: a.budgetMax ?? undefined, limit: 10 });
      await addDoc(collection(db, 'tourRecommendations'), {
        uid,
        alertId: doc.id,
        destination: a.destination,
        recommendations: ranked.map(({ id, provider, title, city, price, rating, reviews, url }) => ({ id, provider, title, city, price, rating, reviews, url })),
        createdAt: serverTimestamp(),
      });
    })());
  });
  await Promise.all(tasks);
  return tasks.length;
}

export default { runToursRefreshForUser };

