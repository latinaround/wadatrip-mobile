import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { searchListings } from '../lib/api';

export default function ToursScreen() {
  const navigation = useNavigation();
  const [destination, setDestination] = useState('Tokyo');
  const [budgetMin, setBudgetMin] = useState('50');
  const [budgetMax, setBudgetMax] = useState('600');
  const [decisionDays, setDecisionDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [date, setDate] = useState('');
  const [anywhere, setAnywhere] = useState(false);
  const [top, setTop] = useState([]);

  useEffect(() => {
    const loadTop = async () => {
      try {
        const rows = await searchListings({ status: 'published', limit: 10 });
        setTop(rows);
      } catch {
        setTop([]);
      }
    };
    loadTop();
  }, []);

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const onSearch = async () => {
    const destinationValue = destination.trim();
    if (!anywhere && !destinationValue) return Alert.alert('Where?', 'Please enter a destination or choose Anywhere');
    let min = parseNumber(budgetMin);
    let max = parseNumber(budgetMax);
    if (min != null && min < 0) min = null;
    if (max != null && max <= 0) max = null;
    if (min != null && max != null && min > max) {
      return Alert.alert('Invalid budget', 'Min must be <= Max');
    }

    setLoading(true);
    try {
      const locationQuery = anywhere ? undefined : destinationValue;
      const rows = await searchListings({
        city: locationQuery,
        q: locationQuery,
        min_price: min ?? undefined,
        max_price: max ?? undefined,
        status: 'published',
        limit: 20,
      });
      setResults(rows);
    } catch (e) {
      console.error('Error searching tours', e);
      Alert.alert('Error', 'Could not load tours');
    } finally {
      setLoading(false);
    }
  };

  const onSaveAlert = async () => {
    Alert.alert('Coming soon', 'Alerts will be enabled after launch.');
  };

  const normalizeListing = (item) => ({
    id: item.id,
    title: item.title,
    city: item.city,
    provider: item.provider_name || 'Local guide',
    price: Number(item.price_from || 0),
    rating: item.ratings_avg || 0,
    reviews: item.ratings_count || 0,
    durationHours: item.duration_minutes ? Math.round(Number(item.duration_minutes) / 60) : null,
    categories: item.tags || [],
    url: `https://www.wadatrip.com/tours/${item.id}`,
  });

  const renderItem = ({ item }, isHorizontal = false) => {
    const data = item.title ? normalizeListing(item) : item;
    return (
      <View style={[styles.card, isHorizontal ? styles.cardHorizontal : styles.cardVertical]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{data.title}</Text>
          <Text style={styles.cardPrice}>${data.price}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{data.city}  {data.provider}</Text>
        <Text style={styles.cardMeta}>? {data.rating} ú {data.reviews} rese¤as {data.durationHours ? `ú ${data.durationHours}h` : ''}</Text>
        <View style={styles.tagsRow}>
          {data.categories?.map((c) => (
            <Text key={c} style={styles.tag}>#{c}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => data.url && Linking.openURL(data.url)}>
            <Text style={styles.buttonText}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#3a86ff', marginLeft: 8 }]} onPress={() => {
            const amount = Math.max(1, Math.round(data.price * 100));
            navigation.navigate('Payment', { amount, currency: 'usd', description: `Tour: ${data.title}` });
          }}>
            <Text style={styles.buttonText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const data = results.length ? results : top;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={(info) => renderItem(info, false)}
        ListEmptyComponent={<Text style={styles.empty}>No results yet. Search to see suggestions.</Text>}
        contentContainerStyle={data.length ? styles.list : styles.listEmpty}
        ListHeaderComponent={(
          <View>
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
                  onPress={() => {
                    const next = !anywhere;
                    setAnywhere(next);
                    if (next) setDestination('');
                  }}
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
                placeholder="Date (optional) - YYYY-MM-DD"
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
                  <Text style={styles.buttonText}>{loading ? 'Searching.' : 'Search tours'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onSaveAlert}>
                  <Text style={styles.buttonText}>Save alert</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!!top.length && (
              <>
                <View style={styles.banner}>
                  <Text style={styles.bannerTitle}>Top Tours</Text>
                  <Text style={styles.bannerSub}>{top?.length || 0} picks from local operators</Text>
                </View>
                <Text style={styles.magHeader}>Top Tours</Text>
                <FlatList
                  horizontal
                  data={top}
                  keyExtractor={(i) => i.id}
                  renderItem={(info) => renderItem(info, true)}
                  ListEmptyComponent={null}
                  contentContainerStyle={[styles.magList]}
                  showsHorizontalScrollIndicator={false}
                />
              </>
            )}
          </View>
        )}
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
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardVertical: { width: '100%' },
  cardHorizontal: { width: 280, marginRight: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1d3557', flex: 1, paddingRight: 8 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: '#2a9d8f' },
  cardSubtitle: { color: '#6c757d', marginTop: 4 },
  cardMeta: { color: '#6c757d', marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  tag: { backgroundColor: '#eef6f5', color: '#2a9d8f', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 6, fontSize: 12 },
  magHeader: { fontSize: 18, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginTop: 6 },
  magList: { paddingHorizontal: 16, paddingVertical: 10 },
  chip: { backgroundColor: '#eef2f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  chipActive: { backgroundColor: '#2a9d8f' },
  chipText: { color: '#1d3557', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  banner: { backgroundColor: '#e6f4ff', borderWidth: 1, borderColor: '#cfe7ff', borderRadius: 10, marginHorizontal: 16, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12 },
  bannerTitle: { color: '#1d3557', fontWeight: '800', fontSize: 16 },
  bannerSub: { color: '#3a86ff', marginTop: 2, fontWeight: '600' },
});
