'use strict';

// Seed Firestore with example documents for first-run demo.
// Uses Firebase compat API to avoid React Native-specific deps when running under Node.

const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

// Keep this in sync with src/services/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyA8rL2T7tKWkDp6Mkx6eeOsqKXVDpmodx0",
  authDomain: "wadatrip-nuevo.firebaseapp.com",
  projectId: "wadatrip-nuevo",
  storageBucket: "wadatrip-nuevo.firebasestorage.app",
  messagingSenderId: "981114942208",
  appId: "1:981114942208:web:e5502a1698dcd0065cf9e5",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

async function seedCollectionIfEmpty(collectionName, docs) {
  const colRef = db.collection(collectionName);
  const existing = await colRef.limit(1).get();
  if (!existing.empty) {
    console.log(`ℹ️  Collection "${collectionName}" already has data. Skipping.`);
    return;
  }
  const batchAdds = docs.map((d) => {
    const payload = { ...d };
    if (!('createdAt' in payload)) {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    return colRef.add(payload);
  });
  await Promise.all(batchAdds);
  console.log(`✅ Seeded ${docs.length} docs into "${collectionName}".`);
}

async function main() {
  // Community posts
  const communityDocs = [
    { author: 'Kiara', message: 'Exploring Mexico City this week!', location: 'CDMX' },
    { author: 'Alex', message: 'Looking for hiking buddies in Cusco.', location: 'Cusco' },
    { author: 'Maria', message: 'Best tapas in Barcelona are at La Boqueria!', location: 'Barcelona' },
  ];

  // Tours & Deals
  const toursDocs = [
    { title: 'Cancún Beach Escape', description: '3 nights all-inclusive at a resort', price: 499, operator: 'SunTravel', destination: 'CUN' },
    { title: 'Machu Picchu Adventure', description: '4-day trek with local guide', price: 899, operator: 'InkaTours', destination: 'CUS' },
    { title: 'Paris City Lights', description: 'Weekend getaway with museum passes', price: 799, operator: 'EuroTrips', destination: 'PAR' },
  ];

  await seedCollectionIfEmpty('community_posts', communityDocs);
  await seedCollectionIfEmpty('tours_deals', toursDocs);
}

main()
  .then(() => {
    console.log('🎉 Firestore seeding completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });

