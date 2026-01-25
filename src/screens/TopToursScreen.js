import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, where, limit } from 'firebase/firestore';
import { scoreTour } from '../services/toursService';

export default function TopToursScreen() {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || null;
    if (!uid) return;
    const q = query(collection(db, 'tourRecommendations'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setRecs(rows);
    });
    return () => unsub();
  }, []);

  const flat = useMemo(() => {
    const items = [];
    for (const doc of recs) {
      for (const r of doc.recommendations || []) {
        items.push({ ...r, _groupId: doc.id, _createdAt: doc.createdAt });
      }
    }
    // Rank with scoreTour (no budget), then by createdAt desc as tiebreaker
    return items
      .map((t) => ({ ...t, score: scoreTour(t, null, null) }))
      .sort((a, b) => (b.score - a.score) || ((b._createdAt?.seconds || 0) - (a._createdAt?.seconds || 0)));
  }, [recs]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => item.url ? Linking.openURL(item.url) : null} disabled={!item.url}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>${item.price}</Text>
      </View>
      <Text style={styles.meta}>{item.city} • {item.provider} • ⭐ {item.rating} ({item.reviews})</Text>
      {!!item.url && <Text style={styles.link}>Open details ↗</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Top Tours For You</Text>
      {!(auth.currentUser?.uid) ? (
        <View style={styles.center}><Text>Please sign in to see your top tours.</Text></View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(i, idx) => `${i.id}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={!flat.length ? styles.listEmpty : styles.list}
          ListEmptyComponent={<View style={styles.center}><Text>No recommendations yet. Save a Tours alert, then Run refresh (dev) in Tours.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 12 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  center: { padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#1d3557', flex: 1, paddingRight: 8 },
  price: { fontSize: 16, fontWeight: '800', color: '#2a9d8f' },
  meta: { color: '#6c757d', marginTop: 4 },
  link: { color: '#3a86ff', marginTop: 6, fontWeight: '700' },
});

