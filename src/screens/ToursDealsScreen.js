import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { searchListings } from '../lib/api';

export default function ToursDealsScreen() {
  const [destination, setDestination] = useState('');
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'tours_deals'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setAllDeals(rows);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // If Provider Hub is enabled, prefer backend listings
  useEffect(() => {
    const extra = (Constants && (Constants).expoConfig && (Constants).expoConfig.extra) || {};
    const ff = String(((typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_FF_PROVIDER_HUB) || extra.FF_PROVIDER_HUB || '')).toLowerCase() === 'true';
    if (!ff) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const items = await searchListings({ limit: 50 });
        if (!cancelled) setAllDeals(items.map((x) => ({
          id: String(x.id),
          title: x.title,
          destination: x.city,
          operator: x.provider_id,
          description: x.description,
          price: x.price_from,
          currency: x.currency || 'USD',
          startDate: x.start_date,
          endDate: x.end_date,
        })));
      } catch (e) {
        if (!cancelled) {
          // keep existing
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => {
    const q = (destination || '').trim().toLowerCase();
    if (!q) return allDeals;
    return allDeals.filter((d) => String(d.destination || '').toLowerCase().includes(q));
  }, [destination, allDeals]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title || 'Tour'}</Text>
      <Text style={styles.subtitle}>{item.destination || '—'} • {item.operator || item.provider || '—'}</Text>
      {item.description ? (<Text style={styles.desc}>{item.description}</Text>) : null}
      <Text style={styles.price}>{item.price != null ? `$${item.price}` : '—'}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}> 
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Destination (e.g. Tokyo)"
          value={destination}
          onChangeText={setDestination}
        />
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => setSearching(true)}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.centerRow}><ActivityIndicator color="#2a9d8f" /><Text style={styles.loading}> Loading…</Text></View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i, idx) => String(i.id || idx)}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? <View style={styles.emptyWrap}><Text style={styles.empty}>No deals yet.</Text></View> : null}
        contentContainerStyle={!items.length ? styles.listEmpty : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  button: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#2a9d8f' },
  buttonText: { color: '#fff', fontWeight: '700' },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { padding: 24 },
  empty: { color: '#6c757d' },
  centerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  loading: { marginLeft: 8, color: '#1d3557' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e9ecef' },
  title: { fontSize: 16, fontWeight: '800', color: '#1d3557' },
  subtitle: { color: '#6c757d', marginTop: 4 },
  desc: { color: '#333', marginTop: 6 },
  price: { color: '#2a9d8f', fontWeight: '800', marginTop: 8 },
});
