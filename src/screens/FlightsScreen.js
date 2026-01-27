import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

export default function FlightsScreen() {
  const navigation = useNavigation();
  const [origin, setOrigin] = useState('MEX');
  const [destination, setDestination] = useState('CUN');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [flexDays, setFlexDays] = useState('3');
  const [adults, setAdults] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidDate = (v) => {
    if (!v) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  };
  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };
  const getApiMode = () => {
    const extra = (Constants && (Constants).expoConfig && (Constants).expoConfig.extra) || {};
    return String(extra.API_MODE || (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_MODE : '') || 'live').toLowerCase();
  };

  const onSearch = async () => {
    if (loading) return;
    setError('');
    if (!origin?.trim() || !destination?.trim()) { setError('Please enter origin and destination'); return; }
    if (!isValidDate(departDate) || !isValidDate(returnDate)) { setError('Invalid date. Use YYYY-MM-DD'); return; }
    setLoading(true);
    try {
      const min = parseNumber(budgetMin);
      const max = parseNumber(budgetMax);
      const hasBudget = (min != null && min > 0) || (max != null && max > 0);
      const { subscribeAlert } = await import('../lib/api');
      await subscribeAlert({
        route: { origin, destination },
        budget_min: min ?? undefined,
        budget_max: max ?? undefined,
        adults: parseInt(adults || '1', 10) || 1,
        dates: { depart: departDate || undefined, return: returnDate || undefined, flex_days: parseInt(flexDays || '0', 10) || 0 },
      });
      const mode = getApiMode();
      const message = hasBudget
        ? (mode === 'mock' ? 'Your budget alert was created (mock).' : 'Your budget alert was created.')
        : (mode === 'mock' ? 'Your ADRED alert was created (mock).' : 'We will notify you when ADRED recommends buy or optimize.');
      Alert.alert('Alert created', message);
      try { navigation.navigate('MyAlerts'); } catch {}
    } catch (e) {
      console.error(e);
      setError('Could not create alert');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.container, { paddingBottom: 160, minHeight: '100%' }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
      keyboardShouldPersistTaps="handled"
      overScrollMode="always"
    >
      <Text style={styles.title}>Flights</Text>

      <Text style={styles.label}>Origin</Text>
      <TextInput style={styles.input} placeholder="MEX" value={origin} onChangeText={setOrigin} />

      <Text style={styles.label}>Destination</Text>
      <TextInput style={styles.input} placeholder="CUN" value={destination} onChangeText={setDestination} />

      <Text style={styles.label}>Depart date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2025-09-10" value={departDate} onChangeText={setDepartDate} />

      <Text style={styles.label}>Return date (optional)</Text>
      <TextInput style={styles.input} placeholder="2025-09-20" value={returnDate} onChangeText={setReturnDate} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Budget min (optional)</Text>
          <TextInput style={styles.input} placeholder="$100" keyboardType="numeric" value={budgetMin} onChangeText={setBudgetMin} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Budget max (optional)</Text>
          <TextInput style={styles.input} placeholder="$600" keyboardType="numeric" value={budgetMax} onChangeText={setBudgetMax} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Flexibility (± days)</Text>
          <TextInput style={styles.input} placeholder="3" keyboardType="numeric" value={flexDays} onChangeText={setFlexDays} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Adults</Text>
          <TextInput style={styles.input} placeholder="1" keyboardType="numeric" value={adults} onChangeText={setAdults} />
        </View>
      </View>

      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onSearch} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Submitting…' : 'Search / Create Alert'}</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingRow}><ActivityIndicator color="#2a9d8f" /><Text style={styles.loadingText}> Loading…</Text></View>
      )}
      {!!error && (<View style={styles.errorPanel}><Text style={styles.errorText}>{error}</Text></View>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fbfc' },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  label: { color: '#0f172a', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primary: { backgroundColor: '#00b8b8' },
  buttonText: { color: '#fff', fontWeight: '600' },
  errorPanel: { backgroundColor: '#ffe8e8', borderColor: '#f5c2c7', borderWidth: 1, padding: 12, borderRadius: 8, marginTop: 10 },
  errorText: { color: '#b02a37', marginBottom: 6, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  loadingText: { marginLeft: 8, color: '#0f172a' },
});
