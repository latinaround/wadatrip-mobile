import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { searchAndRankTours, topMockTours } from '../services/toursService';
import { auth, db } from '../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { runToursRefreshForUser } from '../services/cronMock';
import { onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';

export default function ToursScreen() {
  const [destination, setDestination] = useState('Tokyo');
  const [budgetMin, setBudgetMin] = useState('50');
  const [budgetMax, setBudgetMax] = useState('600');
  const [decisionDays, setDecisionDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [date, setDate] = useState('');
  const [anywhere, setAnywhere] = useState(false);
  const [top, setTop] = useState([]);

  // Load top tours: prefer recommendations else mock top
  useEffect(() => {
    const uid = auth.currentUser?.uid || null;
    if (!uid) {
      topMockTours(10).then(setTop);
      return;
    }
    const q = query(collection(db, 'tourRecommendations'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        topMockTours(10).then(setTop);
      } else {
        const recs = snap.docs[0].data()?.recommendations || [];
        setTop(recs.slice(0, 10));
      }
    });
    return () => unsub();
  }, []);

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const onSearch = async () => {
    if (!anywhere && !destination) return Alert.alert('Where?', 'Please enter a destination or choose Anywhere');
    let min = parseNumber(budgetMin);
    let max = parseNumber(budgetMax);
    // Budget is optional: allow empty; if one side provided and the other not, allow as-is
    if (min != null && min < 0) min = null;
    if (max != null && max <= 0) max = null;
    if (min != null && max != null && min > max) {
      return Alert.alert('Invalid budget', 'Min must be <= Max');
    }

    setLoading(true);
    try {
      let ranked = [];
      if (anywhere) {
        ranked = await topMockTours(20);
      } else {
        ranked = await searchAndRankTours({ destination, budgetMin: min ?? undefined, budgetMax: max ?? undefined });
      }
      setResults(ranked);
      // Log search to Firestore for backend/analytics
      try {
        const user = auth.currentUser;
        await addDoc(collection(db, 'tourSearches'), {
          uid: user?.uid || null,
          destination: anywhere ? 'Anywhere' : destination,
          budgetMin: min ?? null,
          budgetMax: max ?? null,
          decisionDays: parseNumber(decisionDays) || null,
          date: date || null,
          resultCount: ranked.length,
          createdAt: serverTimestamp(),
        });
      } catch {}
    } catch (e) {
      console.error('Error searching tours', e);
      Alert.alert('Error', 'Could not load tours');
    } finally {
      setLoading(false);
    }
  };

  const onSaveAlert = async () => {
    const user = auth.currentUser;
    if (!user) return Alert.alert('Sign-in required', 'Please sign in to save alerts');
    const min = parseNumber(budgetMin);
    const max = parseNumber(budgetMax);
    const days = parseNumber(decisionDays) || 7;
    try {
      await addDoc(collection(db, 'tourAlerts'), {
        uid: user.uid,
        destination,
        budgetMin: min,
        budgetMax: max,
        decisionDays: days,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Saved', 'Your tours alert has been created');
    } catch (e) {
      console.error('Error saving alert', e);
      Alert.alert('Error', 'Could not save the alert');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardPrice}>${item.price}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.city} • {item.provider}</Text>
      <Text style={styles.cardMeta}>⭐ {item.rating} · {item.reviews} reseñas · {item.durationHours}h</Text>
      <View style={styles.tagsRow}>
        {item.categories?.map((c) => (
          <Text key={c} style={styles.tag}>#{c}</Text>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Tours & Best Deals</Text>
        <TextInput
          style={styles.input}
          placeholder="Where (e.g. Tokyo)"
          value={destination}
          onChangeText={setDestination}
          autoCapitalize="words"
        />
        <View style={styles.rowBetween}>
          <TouchableOpacity
            style={[styles.chip, anywhere && styles.chipActive]}
            onPress={() => setAnywhere(!anywhere)}
          >
            <Text style={[styles.chipText, anywhere && styles.chipTextActive]}>Anywhere</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Budget min (optional)"
            keyboardType="numeric"
            value={budgetMin}
            onChangeText={setBudgetMin}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Budget max (optional)"
            keyboardType="numeric"
            value={budgetMax}
            onChangeText={setBudgetMax}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Date (optional) — YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Decision window (days), e.g. 7"
          keyboardType="numeric"
          value={decisionDays}
          onChangeText={setDecisionDays}
        />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={onSearch} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Searching…' : 'Search tours'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onSaveAlert}>
          <Text style={styles.buttonText}>Save alert</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#6c757d', marginTop: 8 }]}
        onPress={async () => {
          const user = auth.currentUser;
          if (!user) return Alert.alert('Sign-in required', 'Please sign in to run refresh.');
          setRefreshLoading(true);
          try {
            const count = await runToursRefreshForUser(db, user.uid);
            Alert.alert('Refresh complete', `Updated recommendations for ${count} alert(s).`);
          } catch (e) {
            console.error('Refresh error', e);
            Alert.alert('Error', 'Could not run refresh.');
          } finally {
            setRefreshLoading(false);
          }
        }}
        disabled={refreshLoading}
      >
        <Text style={styles.buttonText}>{refreshLoading ? 'Refreshing…' : 'Run refresh (dev)'}</Text>
      </TouchableOpacity>
      </View>

      {/* Top Tours magazine-style */}
      <Text style={styles.magHeader}>Top Tours</Text>
      <FlatList
        horizontal
        data={results}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={null}
        contentContainerStyle={[styles.magList]}
        showsHorizontalScrollIndicator={false}
      />

      <FlatList
        data={results.length ? results : top}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No results yet. Search to see suggestions.</Text>}
        contentContainerStyle={(results.length ? results : top).length ? styles.list : styles.listEmpty}
      />
    </KeyboardAvoidingView>
  );
}

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    form: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 20, fontWeight: '700', color: '#1d3557', marginBottom: 8 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    inputHalf: { width: '48%' },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    primary: { backgroundColor: '#2a9d8f', marginRight: 8 },
    secondary: { backgroundColor: '#457b9d', marginLeft: 8 },
    buttonText: { color: '#fff', fontWeight: '600' },
    list: { padding: 16 },
    listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    empty: { color: '#6c757d' },
    card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2, width: 280, marginRight: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1d3557', flex: 1, paddingRight: 8 },
    cardPrice: { fontSize: 16, fontWeight: '700', color: '#2a9d8f' },
    cardSubtitle: { color: '#6c757d', marginTop: 4 },
    cardMeta: { color: '#6c757d', marginTop: 2 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    tag: { backgroundColor: '#eef6f5', color: '#2a9d8f', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 6, fontSize: 12 },
    magHeader: { fontSize: 18, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginTop: 10 },
    magList: { paddingHorizontal: 16, paddingVertical: 10 },
    chip: { backgroundColor: '#eef2f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    chipActive: { backgroundColor: '#2a9d8f' },
    chipText: { color: '#1d3557', fontWeight: '700' },
    chipTextActive: { color: '#fff' },
  });
