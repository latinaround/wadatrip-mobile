import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Platform } from 'react-native';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, query, where, orderBy, deleteDoc, doc, limit, updateDoc } from 'firebase/firestore';
import { Linking } from 'react-native';

function formatDate(ts) {
  try {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch {
    return '';
  }
}

export default function MyAlertsScreen() {
  const [tab, setTab] = useState('flights'); // 'flights' | 'tours' | 'recs'
  const [flights, setFlights] = useState([]);
  const [tours, setTours] = useState([]);
  const [recs, setRecs] = useState([]);

  const uid = auth.currentUser?.uid || null;

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'flightAlerts'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setFlights(rows);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'tourAlerts'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setTours(rows);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'tourRecommendations'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setRecs(rows);
    });
    return () => unsub();
  }, [uid]);

  const onDelete = async (type, id) => {
    try {
      const path = type === 'flight' ? 'flightAlerts' : 'tourAlerts';
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      console.error('Delete error', e);
      Alert.alert('Error', 'Could not delete alert');
    }
  };

  const renderFlight = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.origin} → {item.destination}</Text>
      <Text style={styles.meta}>Budget: ${item.budget} · Flex: {item.maxWaitHours}h · {item.status || 'active'}</Text>
      <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
      <View style={styles.rowRight}>
        <TouchableOpacity
          style={[styles.btn, item.status === 'paused' ? styles.resume : styles.pause]}
          onPress={async () => {
            try {
              await updateDoc(doc(db, 'flightAlerts', item.id), { status: item.status === 'paused' ? 'active' : 'paused' });
            } catch (e) { Alert.alert('Error', 'Could not update alert'); }
          }}
        >
          <Text style={styles.btnText}>{item.status === 'paused' ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.delete]} onPress={() => onDelete('flight', item.id)}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTour = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Where: {item.destination}</Text>
      <Text style={styles.meta}>Budget: {item.budgetMin ? `$${item.budgetMin}` : '—'} – {item.budgetMax ? `$${item.budgetMax}` : '—'} · Window: {item.decisionDays || '—'}d · {item.status || 'active'}</Text>
      <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
      <View style={styles.rowRight}>
        <TouchableOpacity
          style={[styles.btn, item.status === 'paused' ? styles.resume : styles.pause]}
          onPress={async () => {
            try {
              await updateDoc(doc(db, 'tourAlerts', item.id), { status: item.status === 'paused' ? 'active' : 'paused' });
            } catch (e) { Alert.alert('Error', 'Could not update alert'); }
          }}
        >
          <Text style={styles.btnText}>{item.status === 'paused' ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.delete]} onPress={() => onDelete('tour', item.id)}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRec = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Recommendations for {item.destination}</Text>
      <Text style={styles.meta}>{formatDate(item.createdAt)} · {item.recommendations?.length || 0} items</Text>
      {(item.recommendations || []).slice(0, 3).map((r) => (
        <TouchableOpacity
          key={r.id}
          onPress={() => r.url ? Linking.openURL(r.url) : null}
          disabled={!r.url}
        >
          <Text style={[styles.recLine, !r.url && { opacity: 0.6 }]}>• {r.title} — ${r.price} — ⭐ {r.rating} ({r.reviews}){r.url ? ' ↗' : ''}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const data = tab === 'flights' ? flights : tab === 'tours' ? tours : recs;
  const renderer = tab === 'flights' ? renderFlight : tab === 'tours' ? renderTour : renderRec;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Alerts</Text>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'flights' && styles.tabActive]} onPress={() => setTab('flights')}>
          <Text style={[styles.tabText, tab === 'flights' && styles.tabTextActive]}>Flights</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'tours' && styles.tabActive]} onPress={() => setTab('tours')}>
          <Text style={[styles.tabText, tab === 'tours' && styles.tabTextActive]}>Tours</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'recs' && styles.tabActive]} onPress={() => setTab('recs')}>
          <Text style={[styles.tabText, tab === 'recs' && styles.tabTextActive]}>Recommendations</Text>
        </TouchableOpacity>
      </View>

      {!uid ? (
        <View style={styles.center}><Text>Please sign in to see your alerts.</Text></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          renderItem={renderer}
          ListEmptyComponent={<View style={styles.center}><Text>No items.</Text></View>}
          contentContainerStyle={!data.length ? styles.listEmpty : styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginBottom: 8 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eef2f7', marginRight: 8 },
  tabActive: { backgroundColor: '#2a9d8f' },
  tabText: { color: '#1d3557', fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  list: { padding: 12 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  center: { padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 16, fontWeight: '800', color: '#1d3557' },
  meta: { color: '#6c757d', marginTop: 4 },
  time: { color: '#adb5bd', marginTop: 2 },
  recLine: { color: '#333', marginTop: 4 },
  rowRight: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  delete: { backgroundColor: '#e63946' },
  pause: { backgroundColor: '#ffbe0b', marginRight: 8 },
  resume: { backgroundColor: '#2a9d8f', marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
