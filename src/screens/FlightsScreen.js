import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import BrandHeader from '../components/brand/BrandHeader';
import BrandButton from '../components/brand/BrandButton';
import BrandInput from '../components/brand/BrandInput';
import BrandCard from '../components/brand/BrandCard';
import { brand } from '../theme/brand';

let NativeDateTimePicker = null;
try {
  NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {}

const ENABLE_NATIVE_DATE_PICKER = !!NativeDateTimePicker;

const AIRPORT_OPTIONS = [
  { code: 'MEX', city: 'Mexico City', country: 'Mexico' },
  { code: 'CUN', city: 'Cancun', country: 'Mexico' },
  { code: 'JFK', city: 'New York', country: 'United States' },
  { code: 'LAX', city: 'Los Angeles', country: 'United States' },
  { code: 'MIA', city: 'Miami', country: 'United States' },
  { code: 'MAD', city: 'Madrid', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain' },
  { code: 'CDG', city: 'Paris', country: 'France' },
  { code: 'FCO', city: 'Rome', country: 'Italy' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan' },
  { code: 'LIM', city: 'Lima', country: 'Peru' },
  { code: 'SCL', city: 'Santiago', country: 'Chile' },
];

const toIsoDate = (value) => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function FlightsScreen() {
  const navigation = useNavigation();
  const [origin, setOrigin] = useState('MEX');
  const [destination, setDestination] = useState('CUN');
  const [departDate, setDepartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(null);
  const [showDepartPicker, setShowDepartPicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [flexDays, setFlexDays] = useState('3');
  const [adults, setAdults] = useState('1');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState(null);

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const getApiMode = () => {
    const extra = (Constants && Constants.expoConfig && Constants.expoConfig.extra) || {};
    return String(extra.API_MODE || (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_MODE : '') || 'live').toLowerCase();
  };

  const onGetPrediction = async () => {
    if (loading) return;
    setError('');
    setRecommendation(null);
    if (!origin?.trim() || !destination?.trim()) {
      setError('Please enter origin and destination');
      return;
    }

    setLoading(true);
    try {
      const min = parseNumber(budgetMin);
      const max = parseNumber(budgetMax);
      const budget = max ?? min ?? undefined;
      const { getFlightRecommendation } = await import('../lib/api');

      const result = await getFlightRecommendation({
        origin,
        destination,
        departureDate: toIsoDate(departDate) || undefined,
        returnDate: toIsoDate(returnDate) || undefined,
        budget,
        budgetMin: min ?? undefined,
        budgetMax: max ?? undefined,
        adults: parseInt(adults || '1', 10) || 1,
        flexDays: parseInt(flexDays || '0', 10) || 0,
      });
      setRecommendation(result || null);
    } catch (e) {
      console.error(e);
      setError('Could not calculate a flight recommendation');
    } finally {
      setLoading(false);
    }
  };

  const onCreateAlert = async () => {
    if (savingAlert) return;
    setError('');
    try {
      setSavingAlert(true);
      const min = parseNumber(budgetMin);
      const max = parseNumber(budgetMax);
      const hasBudget = (min != null && min > 0) || (max != null && max > 0);
      const { subscribeAlert } = await import('../lib/api');
      await subscribeAlert({
        route: { origin, destination },
        budget_min: min ?? undefined,
        budget_max: max ?? undefined,
        adults: parseInt(adults || '1', 10) || 1,
        dates: {
          depart: toIsoDate(departDate) || undefined,
          return: toIsoDate(returnDate) || undefined,
          flex_days: parseInt(flexDays || '0', 10) || 0,
        },
      });
      const mode = getApiMode();
      const message = hasBudget
        ? (mode === 'mock' ? 'Your budget alert was created (mock).' : 'Your budget alert was created.')
        : (mode === 'mock' ? 'Your route alert was created (mock).' : 'We will watch this route and notify you when timing improves.');
      Alert.alert('Alert created', message);
      try { navigation.navigate('MyAlerts'); } catch {}
    } catch (e) {
      console.error(e);
      setError('Could not create alert');
    } finally {
      setSavingAlert(false);
    }
  };

  const actionMeta = useMemo(() => {
    const action = String(recommendation?.recommendation || '').toLowerCase();
    if (action === 'buy_now') return { title: 'Buy now', tone: styles.actionBuy, copy: 'Current price already looks favorable.' };
    if (action === 'buy_soon') return { title: 'Buy soon', tone: styles.actionSoon, copy: 'The route is near the buy window. Avoid waiting too long.' };
    if (action === 'watch') return { title: 'Watch closely', tone: styles.actionWatch, copy: 'Prices still have room to move down.' };
    return { title: 'Wait', tone: styles.actionWait, copy: 'There may still be a better buying window ahead.' };
  }, [recommendation]);

  const cheapestOffer = recommendation?.cheapest_offer || recommendation?.offers?.[0] || null;

  const filteredAirports = useMemo(() => {
    const q = (editingField === 'origin' ? origin : destination).trim().toLowerCase();
    if (!q) return [];
    return AIRPORT_OPTIONS.filter((a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [editingField, origin, destination]);

  const pickAirport = (field, code) => {
    if (field === 'origin') setOrigin(code);
    if (field === 'destination') setDestination(code);
    setEditingField(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <BrandHeader title="Flight Timing Coach" subtitle="Check the route first. Create an alert only if you still want us to watch it." />

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Route</Text>

        <BrandInput
          style={styles.input}
          placeholder="Origin (MEX)"
          value={origin}
          onFocus={() => setEditingField('origin')}
          onBlur={() => setTimeout(() => setEditingField(null), 120)}
          onChangeText={setOrigin}
          autoCapitalize="characters"
        />
        {editingField === 'origin' && filteredAirports.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredAirports.map((a) => (
              <TouchableOpacity key={`o-${a.code}`} style={styles.suggestionRow} onPress={() => pickAirport('origin', a.code)}>
                <Text style={styles.suggestionCode}>{a.code}</Text>
                <Text style={styles.suggestionText}>{a.city}, {a.country}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <BrandInput
          style={styles.input}
          placeholder="Destination (CUN)"
          value={destination}
          onFocus={() => setEditingField('destination')}
          onBlur={() => setTimeout(() => setEditingField(null), 120)}
          onChangeText={setDestination}
          autoCapitalize="characters"
        />
        {editingField === 'destination' && filteredAirports.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredAirports.map((a) => (
              <TouchableOpacity key={`d-${a.code}`} style={styles.suggestionRow} onPress={() => pickAirport('destination', a.code)}>
                <Text style={styles.suggestionCode}>{a.code}</Text>
                <Text style={styles.suggestionText}>{a.city}, {a.country}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.row}>
          <TouchableOpacity style={[styles.dateButton, styles.half]} onPress={() => ENABLE_NATIVE_DATE_PICKER && setShowDepartPicker(true)}>
            <Text style={styles.dateLabel}>Depart</Text>
            <Text style={styles.dateValue}>{toIsoDate(departDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateButton, styles.half]} onPress={() => ENABLE_NATIVE_DATE_PICKER && setShowReturnPicker(true)}>
            <Text style={styles.dateLabel}>Return</Text>
            <Text style={styles.dateValue}>{returnDate ? toIsoDate(returnDate) : 'Optional'}</Text>
          </TouchableOpacity>
        </View>
        {returnDate ? (
          <TouchableOpacity style={styles.clearDateLink} onPress={() => setReturnDate(null)}>
            <Text style={styles.clearDateText}>Switch to one-way</Text>
          </TouchableOpacity>
        ) : null}

        {ENABLE_NATIVE_DATE_PICKER && showDepartPicker && NativeDateTimePicker ? (
          <NativeDateTimePicker
            value={departDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDepartPicker(false);
              if (selectedDate) setDepartDate(selectedDate);
            }}
          />
        ) : null}

        {ENABLE_NATIVE_DATE_PICKER && showReturnPicker && NativeDateTimePicker ? (
          <NativeDateTimePicker
            value={returnDate || departDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowReturnPicker(false);
              if (selectedDate) setReturnDate(selectedDate);
            }}
          />
        ) : null}

        <TouchableOpacity style={styles.filterLink} onPress={() => setShowFilters((v) => !v)}>
          <Text style={styles.filterLinkText}>{showFilters ? 'Hide filters' : 'Add budget and flexibility'}</Text>
        </TouchableOpacity>

        {showFilters ? (
          <>
            <View style={styles.row}>
              <BrandInput style={[styles.input, styles.half]} placeholder="Budget min" keyboardType="numeric" value={budgetMin} onChangeText={setBudgetMin} />
              <BrandInput style={[styles.input, styles.half]} placeholder="Budget max" keyboardType="numeric" value={budgetMax} onChangeText={setBudgetMax} />
            </View>

            <View style={styles.row}>
              <BrandInput style={[styles.input, styles.half]} placeholder="Flex days" keyboardType="numeric" value={flexDays} onChangeText={setFlexDays} />
              <BrandInput style={[styles.input, styles.half]} placeholder="Adults" keyboardType="numeric" value={adults} onChangeText={setAdults} />
            </View>
          </>
        ) : null}

        <BrandButton title={loading ? 'Analyzing route...' : 'Get flight prediction'} onPress={onGetPrediction} disabled={loading} style={styles.button} />

        {!!error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.loadingText}>Checking fare timing, predicted lows and best buy window.</Text>
        </View>
      ) : null}

      {recommendation ? (
        <BrandCard style={styles.resultCard}>
          <View style={styles.resultTop}>
            <View>
              <Text style={styles.resultEyebrow}>Recommendation</Text>
              <Text style={styles.resultTitle}>{origin} to {destination}</Text>
            </View>
            <View style={[styles.actionPill, actionMeta.tone]}>
              <Text style={styles.actionText}>{actionMeta.title}</Text>
            </View>
          </View>

          <Text style={styles.resultCopy}>{actionMeta.copy}</Text>
          <Text style={styles.resultReason}>{recommendation.reason}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Current</Text>
              <Text style={styles.metricValue}>${Number(recommendation.current_price || 0).toFixed(0)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Predicted low</Text>
              <Text style={styles.metricValue}>${Number(recommendation.predicted_low || 0).toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Confidence</Text>
              <Text style={styles.metricValue}>{Math.round(Number(recommendation.confidence || 0) * 100)}%</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Check again in</Text>
              <Text style={styles.metricValue}>{Number(recommendation.best_buy_window_hours || 24)}h</Text>
            </View>
          </View>

          {cheapestOffer ? (
            <View style={styles.offerWrap}>
              <Text style={styles.offerTitle}>Cheapest live offer</Text>
              <Text style={styles.offerMeta}>
                {String(cheapestOffer.provider || 'provider').toUpperCase()} · ${Number(cheapestOffer.price || 0).toFixed(0)} {cheapestOffer.currency || 'USD'}
              </Text>
              {cheapestOffer.affiliate_link ? (
                <TouchableOpacity onPress={() => Linking.openURL(String(cheapestOffer.affiliate_link)).catch(() => Alert.alert('Link error', 'Could not open booking link'))}>
                  <Text style={styles.offerLink}>Open booking link</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={styles.ctaRow}>
            <BrandButton
              title={savingAlert ? 'Creating alert...' : 'Create price alert'}
              onPress={onCreateAlert}
              disabled={savingAlert}
              style={styles.ctaPrimary}
            />
            <TouchableOpacity style={styles.secondaryCta} onPress={() => navigation.navigate('MyAlerts')}>
              <Text style={styles.secondaryCtaText}>My alerts</Text>
            </TouchableOpacity>
          </View>
        </BrandCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  form: { margin: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#dce7ee', padding: 16 },
  sectionTitle: { color: brand.colors.deep, marginBottom: 10, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, fontFamily: brand.typography.display },
  input: { },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  half: { flex: 1 },
  suggestions: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 16, marginTop: -5, marginBottom: 10, overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionCode: { color: '#0f172a', width: 44, fontFamily: brand.typography.heading },
  suggestionText: { color: '#334155', fontFamily: brand.typography.body },
  dateButton: { borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, backgroundColor: '#fff' },
  dateLabel: { color: '#64748b', fontSize: 12, letterSpacing: 0.4, fontFamily: brand.typography.heading },
  dateValue: { color: '#0f172a', marginTop: 4, fontFamily: brand.typography.heading },
  clearDateLink: { alignSelf: 'flex-end', marginTop: -2, marginBottom: 8 },
  clearDateText: { color: brand.colors.heroEnd, fontFamily: brand.typography.heading },
  filterLink: { marginTop: 2, marginBottom: 8, alignSelf: 'flex-end' },
  filterLinkText: { color: brand.colors.heroEnd, fontFamily: brand.typography.heading },
  button: { marginTop: 6 },
  errorText: { color: '#b02a37', marginTop: 10, fontFamily: brand.typography.heading },
  loadingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    padding: 20,
    alignItems: 'center',
  },
  loadingText: { marginTop: 10, color: '#334155', textAlign: 'center', lineHeight: 20, fontFamily: brand.typography.body },
  resultCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#ffffff',
    borderColor: '#d7e3ea',
  },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  resultEyebrow: { color: brand.colors.heroStart, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: brand.typography.heading },
  resultTitle: { color: '#0f172a', fontSize: 27, lineHeight: 31, marginTop: 4, maxWidth: 220, letterSpacing: -0.7, fontFamily: brand.typography.display },
  actionPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  actionBuy: { backgroundColor: '#dcfce7' },
  actionSoon: { backgroundColor: '#fef3c7' },
  actionWatch: { backgroundColor: '#dbeafe' },
  actionWait: { backgroundColor: '#f1f5f9' },
  actionText: { color: '#0f172a', fontFamily: brand.typography.heading },
  resultCopy: { marginTop: 14, color: '#0f172a', fontSize: 17, lineHeight: 24, fontFamily: brand.typography.heading },
  resultReason: { marginTop: 8, color: '#475569', lineHeight: 21, fontFamily: brand.typography.body },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metricBox: {
    flex: 1,
    backgroundColor: '#f7fbfc',
    borderWidth: 1,
    borderColor: '#dce7ee',
    borderRadius: 18,
    padding: 14,
  },
  metricLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: brand.typography.heading },
  metricValue: { color: '#0f172a', fontSize: 24, marginTop: 6, letterSpacing: -0.5, fontFamily: brand.typography.display },
  offerWrap: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  offerTitle: { color: '#fff', fontSize: 16, letterSpacing: -0.2, fontFamily: brand.typography.heading },
  offerMeta: { color: '#cbd5e1', marginTop: 6, lineHeight: 20, fontFamily: brand.typography.body },
  offerLink: { color: '#67e8f9', marginTop: 10, fontFamily: brand.typography.heading },
  ctaRow: { marginTop: 18, gap: 12 },
  ctaPrimary: { borderRadius: 14 },
  secondaryCta: { alignItems: 'center', paddingVertical: 4 },
  secondaryCtaText: { color: brand.colors.heroStart, fontFamily: brand.typography.heading },
});
