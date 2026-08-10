import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import BrandInput from '../components/brand/BrandInput';
import { brand } from '../theme/brand';
import { createBooking, startCheckout } from '../lib/api';
import { auth } from '../services/firebase';
let NativeDateTimePicker = null;
try {
  NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {}
const ENABLE_NATIVE_DATE_PICKER = !!NativeDateTimePicker;

const toIsoDate = (value) => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReserveBookingScreen({ route, navigation }) {
  const listing = route?.params?.listing || {};
  const [date, setDate] = useState(listing.startDate ? new Date(String(listing.startDate)) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const validateDate = (d) => {
    if (!d || isNaN(+d)) return false;
    if (minDate && d < minDate) return false;
    if (maxDate && d > maxDate) return false;
    return true;
  };

  const onReserve = async () => {
    if (!validateDate(date)) { Alert.alert('Invalid date', 'Pick a date within the available range'); return; }
    const n = parseInt(people || '1', 10) || 1; if (n <= 0) { Alert.alert('Invalid people', 'Enter a valid number of people'); return; }
    if (pricePer <= 0) {
      Alert.alert('Free tour', 'Free tour reservation sync is still being finalized. Use the listing details to continue on web.');
      return;
    }
    setLoading(true);
    try {
      const booking = await createBooking({
        listing_id: String(listing.id),
        date: toIsoDate(date),
        num_people: n,
        total_price: total || undefined,
        user_email: auth.currentUser?.email || undefined,
        user_name: auth.currentUser?.displayName || undefined,
        trip_id: route?.params?.tripId || undefined,
      });

      try {
        const checkout = await startCheckout(String(booking.id));
        if (!checkout?.url) throw new Error('Stripe did not return a checkout URL.');
        await WebBrowser.openBrowserAsync(checkout.url);
        // Closing Stripe is not payment confirmation. BookingDetail reloads the
        // server state, which Stripe's webhook is responsible for updating.
        navigation.replace('BookingDetail', { booking, checkoutReturned: true });
        return;
      } catch (checkoutError) {
        navigation.replace('BookingDetail', {
          booking,
          checkoutError: 'We created your reservation, but could not start Stripe checkout. It remains pending and unpaid. Please retry payment from this booking.',
        });
        return;
      }
    } catch (e) {
      const status = Number(e?.status || 0);
      if (status === 404 || status === 501) {
        Alert.alert('Checkout still being connected', 'Guide tour publishing is live, but traveler booking sync is still being connected on the backend.');
      } else {
        Alert.alert('Error', String(e?.message || e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <BrandHeader title="Reserve Tour" subtitle="Choose the date and travelers before moving to checkout." />

      <BrandCard style={styles.summaryCard}>
        <Text style={styles.eyebrow}>Reservation summary</Text>
        <Text style={styles.title}>{listing.title || 'Tour'}</Text>
        <Text style={styles.subtitle}>{listing.city || 'Destination'} · {listing.provider_name || listing.provider || 'Local tour guide'}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available</Text>
          <Text style={styles.summaryValue}>{minDate ? minDate.toISOString().slice(0, 10) : '-'} to {maxDate ? maxDate.toISOString().slice(0, 10) : '-'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Price per traveler</Text>
          <Text style={styles.summaryValue}>{pricePer <= 0 ? 'Free' : `${currency} ${pricePer.toFixed(2)}`}</Text>
        </View>
      </BrandCard>

      <BrandCard style={styles.formCard}>
        <Text style={styles.sectionTitle}>Trip setup</Text>
        <Text style={styles.sectionCopy}>Keep this fast: pick a date, confirm traveler count, then continue to secure checkout.</Text>

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => ENABLE_NATIVE_DATE_PICKER && setShowDatePicker(true)}>
          <Text style={styles.dateText}>{date ? toIsoDate(date) : 'Select date'}</Text>
        </TouchableOpacity>
        {ENABLE_NATIVE_DATE_PICKER && showDatePicker && NativeDateTimePicker && (
          <NativeDateTimePicker
            value={date || minDate || new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <Text style={styles.label}>Travelers</Text>
        <BrandInput style={styles.input} keyboardType="numeric" value={people} onChangeText={setPeople} placeholder="1" />

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Price per traveler</Text>
            <Text style={styles.totalMeta}>{pricePer <= 0 ? 'Free' : `${currency} ${pricePer.toFixed(2)}`}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Travelers</Text>
            <Text style={styles.totalMeta}>{people || '1'}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowStrong]}>
            <Text style={styles.totalStrongLabel}>Total</Text>
            <Text style={styles.totalValue}>{currency} {total.toFixed(2)}</Text>
          </View>
        </View>

        <BrandButton title={loading ? 'Working...' : pricePer <= 0 ? 'Free tour info' : 'Continue to payment'} onPress={onReserve} disabled={loading} style={styles.primaryButton} />
      </BrandCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  content: { paddingBottom: 40 },
  summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 28, backgroundColor: '#102334', borderColor: '#1d3950' },
  formCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  eyebrow: { color: '#8be9ea', fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  title: { fontSize: 27, lineHeight: 32, color: '#fff', marginTop: 8, letterSpacing: -0.6, fontFamily: brand.typography.display },
  subtitle: { color: '#c8d6e4', marginTop: 6, lineHeight: 20, fontFamily: brand.typography.body },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  summaryLabel: { color: '#9eb6c9', fontFamily: brand.typography.heading },
  summaryValue: { color: '#fff', flexShrink: 1, textAlign: 'right', fontFamily: brand.typography.heading },
  sectionTitle: { color: brand.colors.deep, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontFamily: brand.typography.display },
  sectionCopy: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  label: { color: brand.colors.deep, marginTop: 14, marginBottom: 6, letterSpacing: 0.2, fontFamily: brand.typography.heading },
  input: { marginBottom: 0 },
  dateInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: brand.colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14 },
  dateText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  totalCard: { marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: '#f7fbfc', borderWidth: 1, borderColor: '#dce7ee' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  totalRowStrong: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#dce7ee' },
  totalLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: brand.typography.heading },
  totalMeta: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  totalStrongLabel: { color: brand.colors.deep, fontSize: 14, fontFamily: brand.typography.heading },
  totalValue: { color: brand.colors.deep, fontSize: 24, letterSpacing: -0.4, fontFamily: brand.typography.display },
  primaryButton: { marginTop: 18, borderRadius: 16, backgroundColor: brand.colors.primary },
});


