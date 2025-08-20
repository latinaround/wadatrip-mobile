import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { searchAndRankTours } from '../services/toursService';
import { auth, db } from '../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function ToursScreen() {
  const [destination, setDestination] = useState('Tokyo');
  const [budgetMin, setBudgetMin] = useState('50');
  const [budgetMax, setBudgetMax] = useState('600');
  const [decisionDays, setDecisionDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const onSearch = async () => {
    const min = parseNumber(budgetMin);
    const max = parseNumber(budgetMax);
    if (!destination) return Alert.alert('Missing destination', 'Please enter a destination');
    if (min == null || max == null || min <= 0 || max <= 0 || min > max) {
      return Alert.alert('Invalid budget', 'Please check your budget range');
    }
    setLoading(true);
    try {
      const ranked = await searchAndRankTours({ destination, budgetMin: min, budgetMax: max });
      setResults(ranked);
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
          placeholder="Destination (e.g. Tokyo)"
          value={destination}
          onChangeText={setDestination}
          autoCapitalize="words"
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Budget min"
            keyboardType="numeric"
            value={budgetMin}
            onChangeText={setBudgetMin}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Budget max"
            keyboardType="numeric"
            value={budgetMax}
            onChangeText={setBudgetMax}
          />
        </View>
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
      </View>

      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No results yet. Search to see suggestions.</Text>}
        contentContainerStyle={results.length ? styles.list : styles.listEmpty}
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
  inputHalf: { width: '48%' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  primary: { backgroundColor: '#2a9d8f', marginRight: 8 },
  secondary: { backgroundColor: '#457b9d', marginLeft: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: '#6c757d' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1d3557', flex: 1, paddingRight: 8 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: '#2a9d8f' },
  cardSubtitle: { color: '#6c757d', marginTop: 4 },
  cardMeta: { color: '#6c757d', marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  tag: { backgroundColor: '#eef6f5', color: '#2a9d8f', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 6, fontSize: 12 },
});
