import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
let NativeDateTimePicker = null;
try {
  NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {}
const ENABLE_NATIVE_DATE_PICKER = !!NativeDateTimePicker;

const AIRPORT_OPTIONS = [
  { code: 'MEX', city: 'Mexico City' },
  { code: 'CUN', city: 'Cancun' },
  { code: 'SCL', city: 'Santiago' },
  { code: 'JFK', city: 'New York' },
  { code: 'LAX', city: 'Los Angeles' },
  { code: 'MAD', city: 'Madrid' },
  { code: 'CDG', city: 'Paris' },
  { code: 'NRT', city: 'Tokyo' },
];

const toIsoDate = (value) => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ItineraryScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [origin, setOrigin] = useState('SCL');
  const [destination, setDestination] = useState('JFK');
  const [budgetMin, setBudgetMin] = useState('50');
  const [budgetMax, setBudgetMax] = useState('600');
  const [startDate, setStartDate] = useState(new Date('2025-09-10'));
  const [endDate, setEndDate] = useState(new Date('2025-09-15'));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [adults, setAdults] = useState('1');
  const [flexHours, setFlexHours] = useState('168'); // 1 week
  const [loading, setLoading] = useState(false);
  const [tours, setTours] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [loadingItins, setLoadingItins] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [loadingPred, setLoadingPred] = useState(false);
  const [destTours, setDestTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(false);

  // Format ISO-like dates as YYYY-MM-DD for display
  const fmt = (d) => {
    if (!d) return '';
    try {
      const dt = new Date(String(d));
      if (!isNaN(+dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d);
  };

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const filteredAirports = useMemo(() => {
    const currentValue = editingField === 'origin' ? origin : destination;
    const q = String(currentValue || '').trim().toLowerCase();
    if (!q) return [];
    return AIRPORT_OPTIONS.filter((a) => a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)).slice(0, 6);
  }, [editingField, origin, destination]);

  const handleCreateAlert = async () => {
    const min = parseNumber(budgetMin);
    const max = parseNumber(budgetMax);
    if (min == null || max == null || min <= 0 || max <= 0 || min > max) {
      Alert.alert('Invalid budget', 'Please check your range');
      return;
    }
    try {
      const { subscribeAlert } = await import('../lib/api');
      await subscribeAlert({
        route: { origin, destination },
        budget_min: min,
        budget_max: max,
        adults: parseInt(adults || '1', 10) || 1,
        dates: {
          depart: toIsoDate(startDate) || undefined,
          return: toIsoDate(endDate) || undefined,
          flex_hours: parseInt(flexHours || '168', 10) || 168,
        },
      });
      Alert.alert('Alert created', 'We are now tracking this trip window for you.');
      navigation.navigate('MyAlerts');
    } catch (e) {
      Alert.alert('Error', 'Could not create the alert right now.');
    }
  };

  // Load sample itineraries from mock backend when API_MODE=mock
  const refreshItineraries = async () => {
    const extra = (Constants && (Constants).expoConfig && (Constants).expoConfig.extra) || {};
    const mode = String(extra.API_MODE || (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_MODE : '') || '').toLowerCase();
    const useMock = mode === 'mock';
    if (!useMock) return;
    setLoadingItins(true);
    try {
      const { getItineraries } = await import('../lib/api');
      const res = await getItineraries();
      const list = Array.isArray(res) ? res.map((it, idx) => ({
        id: String(it.id || `i${idx}`),
        title: it.title || 'Itinerary',
        price: it.price ?? it.total_price ?? 0,
        currency: it.currency || 'USD',
        startDate: it.start_date || it.startDate || null,
        endDate: it.end_date || it.endDate || null,
        activities: Array.isArray(it.activities) ? it.activities : [],
      })) : [];
      setItineraries(list);
    } catch (e) {
      // no-op for demo
    } finally {
      setLoadingItins(false);
    }
  };

  useEffect(() => { refreshItineraries(); }, []);

  // Tours por destino: si FF_PROVIDER_HUB=true usamos backend, si no mock
  useEffect(() => {
    const extra = (Constants && (Constants).expoConfig && (Constants).expoConfig.extra) || {};
    const ff = String(((typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_FF_PROVIDER_HUB) || extra.FF_PROVIDER_HUB || '')).toLowerCase() === 'true';
    const city = destination || '';
    if (!ff) {
      const seed = [
        { id: 't1', title: `City walking tour in ${city || 'your destination'}`, price: 39, rating: 4.7, reviews: 128 },
        { id: 't2', title: `Food tasting experience - ${city || 'local cuisine'}`, price: 59, rating: 4.8, reviews: 86 },
        { id: 't3', title: `Day trip highlights around ${city || 'the area'}`, price: 89, rating: 4.6, reviews: 203 },
      ];
      setDestTours(seed);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingTours(true);
      try {
        const { searchListings } = await import('../lib/api');
        const items = await searchListings({ city, limit: 10 });
        if (!cancelled) {
          const mapped = (items || []).map((x) => ({
            id: String(x.id),
            title: String(x.title || ''),
            price: Number(x.price_from || 0),
            rating: x.rating || 0,
            reviews: x.reviews || 0,
            currency: x.currency || 'USD',
            description: x.description ?? null,
            startDate: x.start_date || x.startDate || null,
            endDate: x.end_date || x.endDate || null,
          }));
          setDestTours(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          // fallback to mock
          const seed = [
            { id: 't1', title: `City walking tour in ${city || 'your destination'}`, price: 39, rating: 4.7, reviews: 128 },
            { id: 't2', title: `Food tasting experience - ${city || 'local cuisine'}`, price: 59, rating: 4.8, reviews: 86 },
            { id: 't3', title: `Day trip highlights around ${city || 'the area'}`, price: 89, rating: 4.6, reviews: 203 },
          ];
          setDestTours(seed);
        }
      } finally {
        if (!cancelled) setLoadingTours(false);
      }
    })();
    return () => { cancelled = true; };
  }, [destination]);

  const checkPredictions = async () => {
    setLoadingPred(true);
    try {
      const { predictPricing } = await import('../lib/api');
      const res = await predictPricing({ origin, destination, start_date: toIsoDate(startDate) || undefined });
      setPredictions(Array.isArray(res) ? res : []);
    } catch (e) {
      setPredictions([]);
    } finally { setLoadingPred(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('itinerary.title', 'Itinerary')}</Text>
      </View>
      <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={[styles.content, { paddingBottom: 200, minHeight: '100%' }]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  persistentScrollbar={true}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  overScrollMode="always"
                  contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.promoText}>
          {t('itinerary_promo', 'Create an alert for the best itinerary deals!')}
        </Text>
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={styles.label}>Origin</Text>
            <TextInput style={styles.input} placeholder="SCL" value={origin} onFocus={() => setEditingField('origin')} onChangeText={setOrigin} autoCapitalize="characters" />
            {editingField === 'origin' && filteredAirports.length > 0 && (
              <View style={styles.suggestions}>
                {filteredAirports.map((a) => (
                  <TouchableOpacity key={`o-${a.code}`} style={styles.suggestionRow} onPress={() => { setOrigin(a.code); setEditingField(null); }}>
                    <Text style={styles.suggestionText}>{a.code} - {a.city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={styles.label}>Destination</Text>
            <TextInput style={styles.input} placeholder="JFK" value={destination} onFocus={() => setEditingField('destination')} onChangeText={setDestination} autoCapitalize="characters" />
            {editingField === 'destination' && filteredAirports.length > 0 && (
              <View style={styles.suggestions}>
                {filteredAirports.map((a) => (
                  <TouchableOpacity key={`d-${a.code}`} style={styles.suggestionRow} onPress={() => { setDestination(a.code); setEditingField(null); }}>
                    <Text style={styles.suggestionText}>{a.code} - {a.city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        

        <View style={styles.row}> 
          <View style={[styles.inputGroup, styles.half]}>
          <Text style={styles.label}>Budget min</Text>
          <TextInput style={styles.input} placeholder="$50" keyboardType="numeric" value={budgetMin} onChangeText={setBudgetMin} />
        </View>
        <View style={[styles.inputGroup, styles.half]}>
          <Text style={styles.label}>Budget max</Text>
          <TextInput style={styles.input} placeholder="$600" keyboardType="numeric" value={budgetMax} onChangeText={setBudgetMax} />
        </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={styles.label}>Start date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => ENABLE_NATIVE_DATE_PICKER && setShowStartPicker(true)}>
              <Text style={styles.dateText}>{toIsoDate(startDate)}</Text>
            </TouchableOpacity>
            {ENABLE_NATIVE_DATE_PICKER && showStartPicker && NativeDateTimePicker && (
              <NativeDateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}
          </View>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={styles.label}>End date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => ENABLE_NATIVE_DATE_PICKER && setShowEndPicker(true)}>
              <Text style={styles.dateText}>{toIsoDate(endDate)}</Text>
            </TouchableOpacity>
            {ENABLE_NATIVE_DATE_PICKER && showEndPicker && NativeDateTimePicker && (
              <NativeDateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Flexibility time to find</Text>
          <View style={styles.flexGrid}>
            <TouchableOpacity style={[styles.flexBtn, flexHours === '24' && styles.flexBtnActive]} onPress={() => setFlexHours('24')}>
              <Text style={[styles.flexBtnText, flexHours === '24' && styles.flexBtnTextActive]}>1 hr – 24 hrs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.flexBtn, flexHours === '72' && styles.flexBtnActive]} onPress={() => setFlexHours('72')}>
              <Text style={[styles.flexBtnText, flexHours === '72' && styles.flexBtnTextActive]}>1 day – 3 days</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.flexBtn, flexHours === '168' && styles.flexBtnActive]} onPress={() => setFlexHours('168')}>
              <Text style={[styles.flexBtnText, flexHours === '168' && styles.flexBtnTextActive]}>3 days – 1 week</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.flexBtn, flexHours === '720' && styles.flexBtnActive]} onPress={() => setFlexHours('720')}>
              <Text style={[styles.flexBtnText, flexHours === '720' && styles.flexBtnTextActive]}>1 month</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleCreateAlert}>
          <Text style={styles.buttonText}>{t('create_alert', 'Create Alert')}</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={styles.label}>Adults</Text>
            <TextInput style={styles.input} placeholder="1" keyboardType="numeric" value={adults} onChangeText={setAdults} />
          </View>
          <View style={[styles.inputGroup, styles.half]} />
        </View>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#00b8b8', marginTop: 10 }]} onPress={async () => {
          setLoading(true);
          try {
            const { generateItinerary } = await import('../lib/api');
            const payload = {
              title: `${origin}-${destination}`,
              origin,
              destination,
              start_date: toIsoDate(startDate),
              end_date: toIsoDate(endDate),
              adults: parseInt(adults || '1', 10) || 1,
              budget_total: parseNumber(budgetMax) || 0,
            };
            const res = await generateItinerary(payload);
            setScenarios(res.scenarios || []);
          } catch (e) { console.error(e); Alert.alert('Error', 'Could not generate itinerary'); }
          finally { setLoading(false); }
        }}>
          <Text style={styles.buttonText}>{loading ? 'Generating…' : 'Generate Itinerary (Backend)'}</Text>
        </TouchableOpacity>

        {/* Price predictions (moved from Flights) */}
        <TouchableOpacity style={[styles.button, { backgroundColor: '#0f172a', marginTop: 10 }]} onPress={checkPredictions}>
          <Text style={styles.buttonText}>{loadingPred ? 'Checking…' : 'Check Price Predictions'}</Text>
        </TouchableOpacity>
        {predictions?.length ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>Price Predictions</Text>
            {predictions.map((p, idx) => (
              <View key={idx} style={styles.itinCard}>
                <Text style={styles.itinTitle}>{[p?.route?.origin || origin, p?.route?.destination || destination].filter(Boolean).join('-')}</Text>
                {'current_price' in p && (<Text style={styles.itinMeta}>Current: ${p.current_price}</Text>)}
                {'predicted_low' in p && (<Text style={styles.itinMeta}>Predicted low: ${p.predicted_low}</Text>)}
                {'trend' in p && (<Text style={styles.itinMeta}>Trend: {String(p.trend).toUpperCase()}</Text>)}
                {'action' in p && (<Text style={styles.itinMeta}>Action: {String(p.action).toUpperCase()}</Text>)}
              </View>
            ))}
          </View>
        ) : null}

        {/* Tours available at your destination (mock) */}
          {!!destTours?.length && (
            <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>Tours available at your destination</Text>
            {destTours.map((t) => (
              <View key={t.id} style={styles.tourCard}>
                  <Text style={styles.tourTitle}>{t.title}</Text>
                  {!!t.description && (
                    <Text style={styles.tourDesc}>{String(t.description)}</Text>
                  )}
                  {(t.startDate || t.endDate) && (
                    <Text style={styles.tourMeta}>Dates: {fmt(t.startDate) || '—'} - {fmt(t.endDate) || '—'}</Text>
                  )}
                <Text style={styles.tourMeta}>{t.currency ? `${t.currency} ` : '$'}{t.price} · ⭐ {t.rating ?? 0} ({t.reviews ?? 0})</Text>
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#00b8b8', marginTop: 8 }]} onPress={() => navigation.navigate('Reserve', { listing: t })}>
                    <Text style={styles.buttonText}>Reserve</Text>
                  </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Sample itineraries list (mock mode) */}
        {loadingItins ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: '#0f172a' }}>Loading itineraries…</Text>
          </View>
        ) : (itineraries?.length ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>Sample Itineraries</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#0f172a', marginBottom: 10 }]} onPress={refreshItineraries}>
              <Text style={styles.buttonText}>Refresh Itineraries</Text>
            </TouchableOpacity>
            {itineraries.map((it) => (
              <View key={it.id} style={styles.itinCard}>
                <Text style={styles.itinTitle}>{it.title}</Text>
                <Text style={styles.itinMeta}>Total: {it.currency} ${it.price}</Text>
                {(it.startDate || it.endDate) && (
                  <Text style={styles.itinMeta}>Dates: {it.startDate || '—'} → {it.endDate || '—'}</Text>
                )}
                {it.activities?.length ? (
                  <View style={{ marginTop: 6 }}>
                    {it.activities.map((a, i) => (
                      <Text key={i} style={styles.itinAct}>• {String(a)}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null)}
        <TouchableOpacity style={[styles.button, { backgroundColor: '#00b8b8', marginTop: 10 }]} onPress={async () => {
          const min = parseNumber(budgetMin); const max = parseNumber(budgetMax);
          if (!destination || min == null || max == null) return;
          setLoading(true);
          try {
            const { searchAndRankTours } = await import('../services/toursService');
            const res = await searchAndRankTours({ destination, budgetMin: min, budgetMax: max });
            setTours(res);
          } catch (e) { console.error(e); Alert.alert('Error', 'Could not load tours'); }
          finally { setLoading(false); }
        }}>
          <Text style={styles.buttonText}>{loading ? 'Searching…' : 'See best tours'}</Text>
        </TouchableOpacity>

        {tours?.length ? (
          <View style={{ marginTop: 20 }}>
            {tours.map((t) => (
              <View key={t.id} style={styles.tourCard}>
                <Text style={styles.tourTitle}>{t.title}</Text>
                <Text style={styles.tourMeta}>{t.city} • ${t.price} • ⭐ {t.rating} ({t.reviews})</Text>
              </View>
            ))}
          </View>
        ) : null}

        {scenarios?.length ? (
          <View style={{ marginTop: 20 }}>
            {scenarios.map((sc) => (
              <View key={sc.type} style={styles.scenarioCard}>
                <Text style={styles.scenarioTitle}>{String(sc.type || '').toUpperCase()}</Text>
                <Text style={styles.scenarioMeta}>Total: ${sc.total_price}</Text>
                <Text style={styles.scenarioMeta}>KPIs · ${sc.kpis?.cost_per_day}/day · Free {sc.kpis?.free_time_hours}h · Walk {sc.kpis?.walk_distance_km}km</Text>
                <Text style={styles.scenarioMeta}>ADRED: {String(sc.adred?.action || '').toUpperCase()} ({Math.round((sc.adred?.confidence || 0) * 100)}%)</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbfc',
  },
  header: {
    backgroundColor: '#00c6c6',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  promoText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  suggestions: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: -8, marginBottom: 10, overflow: 'hidden' },
  suggestionRow: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionText: { color: '#334155', fontWeight: '600' },
  dateButton: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  dateText: { color: '#0f172a' },
  button: {
    backgroundColor: '#ff2aa1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  itinCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e9ecef' },
  itinTitle: { fontWeight: '800', color: '#0f172a' },
  itinMeta: { color: '#6c757d', marginTop: 4 },
  itinAct: { color: '#333', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  flexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flexBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef2f7' },
  flexBtnActive: { backgroundColor: '#00b8b8' },
  flexBtnText: { color: '#0f172a', fontWeight: '600' },
  flexBtnTextActive: { color: '#fff' },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scenarioCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e9ecef' },
  scenarioTitle: { fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  scenarioMeta: { color: '#333', marginTop: 2 },
    tourCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e9ecef' },
    tourTitle: { fontWeight: '800', color: '#0f172a' },
    tourDesc: { color: '#495057', marginTop: 6 },
    tourMeta: { color: '#6c757d', marginTop: 4 },
  });

export default ItineraryScreen;






