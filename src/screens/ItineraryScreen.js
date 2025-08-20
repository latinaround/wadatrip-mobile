import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const ItineraryScreen = () => {
  const { t } = useTranslation();
  const [location, setLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('50');
  const [budgetMax, setBudgetMax] = useState('600');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [flexHours, setFlexHours] = useState('168'); // 1 week
  const [loading, setLoading] = useState(false);
  const [tours, setTours] = useState([]);

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const handleCreateAlert = () => {
    if (!location) {
      Alert.alert(t('error', 'Error'), 'Please enter a location');
      return;
    }
    const min = parseNumber(budgetMin);
    const max = parseNumber(budgetMax);
    if (min == null || max == null || min <= 0 || max <= 0 || min > max) {
      Alert.alert('Invalid budget', 'Please check your range');
      return;
    }
    Alert.alert('Ready', 'We will create itinerary alerts with your parameters.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('itinerary.title', 'Itinerary')}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.promoText}>
          {t('itinerary_promo', 'Create an alert for the best itinerary deals!')}
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('location', 'Location')}</Text>
          <TextInput style={styles.input} placeholder={t('enter_location', 'Enter a location')} value={location} onChangeText={setLocation} />
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
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
          </View>
          <View style={[styles.inputGroup, styles.half]}>
            <Text style={styles.label}>End date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
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
        <TouchableOpacity style={[styles.button, { backgroundColor: '#2a9d8f', marginTop: 10 }]} onPress={async () => {
          const min = parseNumber(budgetMin); const max = parseNumber(budgetMax);
          if (!location || min == null || max == null) return;
          setLoading(true);
          try {
            const { searchAndRankTours } = await import('../services/toursService');
            const res = await searchAndRankTours({ destination: location, budgetMin: min, budgetMax: max });
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#457b9d',
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
    color: '#1d3557',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d3557',
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
  button: {
    backgroundColor: '#e63946',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  flexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flexBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef2f7' },
  flexBtnActive: { backgroundColor: '#2a9d8f' },
  flexBtnText: { color: '#1d3557', fontWeight: '600' },
  flexBtnTextActive: { color: '#fff' },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ItineraryScreen;
