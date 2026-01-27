import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createBooking, startCheckout } from '../lib/api';

export default function ReserveBookingScreen({ route, navigation }) {
  const listing = route?.params?.listing || {};
  const [date, setDate] = useState(listing.startDate ? String(listing.startDate).slice(0,10) : '');
  const [people, setPeople] = useState('1');
  const [loading, setLoading] = useState(false);

  const minDate = listing.startDate ? new Date(String(listing.startDate)) : null;
  const maxDate = listing.endDate ? new Date(String(listing.endDate)) : null;
  const pricePer = Number(listing.price || listing.price_from || 0);
  const currency = listing.currency || 'USD';
  const total = useMemo(() => {
    const n = parseInt(people || '1', 10) || 1;
    return Math.max(0, pricePer * n);
  }, [people, pricePer]);

  const validateDate = (s) => {
    if (!s) return false; const d = new Date(String(s)); if (isNaN(+d)) return false; if (minDate && d < minDate) return false; if (maxDate && d > maxDate) return false; return true;
  };

  const onReserve = async () => {
    if (!validateDate(date)) { Alert.alert('Invalid date', 'Pick a date within the available range'); return; }
    const n = parseInt(people || '1', 10) || 1; if (n <= 0) { Alert.alert('Invalid people', 'Enter a valid number of people'); return; }
    setLoading(true);
    try {
      const userEmail = (global && (global).AUTH_EMAIL) || undefined;
      const payload = { listing_id: String(listing.id), date: String(date), num_people: n, total_price: total || undefined, user_email: userEmail };
      const booking = await createBooking(payload);
      const { url } = await startCheckout(String(booking.id));
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      } else {
        Alert.alert('Checkout', 'Unable to open checkout URL');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reserve Tour</Text>
      <Text style={styles.subtitle}>{listing.title || '-'}</Text>
      <View style={styles.row}><Text style={styles.label}>Available:</Text><Text style={styles.value}>{minDate ? minDate.toISOString().slice(0,10) : '-'} — {maxDate ? maxDate.toISOString().slice(0,10) : '-'}</Text></View>
      <View style={styles.field}>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>People</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={people} onChangeText={setPeople} />
      </View>
      <View style={styles.totalRow}><Text style={styles.total}>Total:</Text><Text style={styles.total}>{currency} {total.toFixed(2)}</Text></View>
      <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} disabled={loading} onPress={onReserve}>
        <Text style={styles.buttonText}>{loading ? 'Processing…' : 'Pay with Stripe'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#6c757d', marginTop: 4, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#0f172a', fontWeight: '700' },
  value: { color: '#333' },
  field: { marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, padding: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  total: { color: '#0f172a', fontWeight: '800' },
  button: { backgroundColor: '#00b8b8', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700' },
});


