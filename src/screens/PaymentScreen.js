import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Platform, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { auth } from '../services/firebase';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import { brand } from '../theme/brand';
import { resolvedApiBase } from '../lib/api';

// Lazy load Stripe RN to avoid web bundling errors if not installed
let stripeRN = null;
try { stripeRN = require('@stripe/stripe-react-native'); } catch (e) { stripeRN = null; }
const CardField = stripeRN?.CardField || null;
const useStripe = stripeRN?.useStripe || (() => ({ confirmPayment: async () => ({ error: { message: 'Stripe not available' } }) }));
const initStripe = stripeRN?.initStripe || (() => {});

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_KEY || (Constants?.expoConfig?.extra?.stripe?.publishableKey) || 'pk_test_REPLACE_ME';

export default function PaymentScreen({ route, navigation }) {
  const { amount = 1000, currency = 'usd', description = 'Tour booking', listing = null, reservation = null } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  const { confirmPayment } = useStripe();
  const amountFormatted = useMemo(() => `$${(amount / 100).toFixed(2)} ${String(currency || 'usd').toUpperCase()}`, [amount, currency]);

  useEffect(() => {
    if (stripeRN && publishableKey) {
      initStripe({ publishableKey });
    }
  }, []);

  const backend = resolvedApiBase();

  const pay = async () => {
    if (!name || !email) return Alert.alert('Missing info', 'Enter name and email');
    if (!stripeRN || Platform.OS === 'web') {
      return Alert.alert('Not available on Web', 'Payments run in the mobile app build.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${backend}/payments/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency, description }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || 'Failed');
      const clientSecret = json.clientSecret;
      const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card', paymentMethodData: { billingDetails: { name, email } } });
      if (error) throw new Error(error.message);
      navigation.replace('BookingSuccess', {
        listing,
        reservation,
        amountFormatted,
        paymentReference: json?.paymentIntentId || json?.id || '',
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BrandHeader title="Secure Checkout" subtitle="Simple, fast, and backed by Stripe." />

      <BrandCard style={styles.summaryCard}>
        <Text style={styles.sectionEyebrow}>Order summary</Text>
        <Text style={styles.header}>{listing?.title || 'Tour booking'}</Text>
        <Text style={styles.meta}>{listing?.city || 'Destination'} · {listing?.provider_name || listing?.provider || 'Local tour guide'}</Text>
        {reservation?.date ? <Text style={styles.meta}>Date: {reservation.date}</Text> : null}
        {reservation?.people ? <Text style={styles.meta}>Travelers: {reservation.people}</Text> : null}
        <Text style={styles.total}>Total: {amountFormatted}</Text>
      </BrandCard>

      <BrandCard style={styles.formCard}>
        <Text style={styles.sectionTitle}>Traveler details</Text>
        <Text style={styles.sectionCopy}>Keep checkout light. Confirm who is paying, then finish securely.</Text>
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <View style={styles.trustBox}>
          <Text style={styles.trustTitle}>Why travelers trust this step</Text>
          <Text style={styles.trustText}>You review the total first, then pay inside secure Stripe checkout. No hidden steps after this.</Text>
        </View>
        <Text style={styles.microcopy}>Stripe handles card security. WadaTrip keeps the checkout flow short so travelers do not get lost.</Text>
        {stripeRN && Platform.OS !== 'web' ? (
          <>
            <CardField postalCodeEnabled={false} placeholders={{ number: '4242 4242 4242 4242' }} cardStyle={{ backgroundColor: '#fff', textColor: '#000' }} style={styles.card} />
            <BrandButton title={loading ? 'Processing...' : 'Pay now'} onPress={pay} disabled={loading} style={styles.primaryButton} />
          </>
        ) : (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>Payments run in the native mobile build with Stripe configured.</Text>
          </View>
        )}
      </BrandCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  content: { paddingBottom: 48 },
  summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 28, backgroundColor: '#102334', borderColor: '#1d3950' },
  formCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  sectionEyebrow: { color: '#8be9ea', fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  header: { fontSize: 27, lineHeight: 32, color: '#fff', marginTop: 8, letterSpacing: -0.6, fontFamily: brand.typography.display },
  meta: { color: '#c8d6e4', marginTop: 6, lineHeight: 20, fontFamily: brand.typography.body },
  total: { color: '#fff', fontSize: 25, marginTop: 16, letterSpacing: -0.5, fontFamily: brand.typography.display },
  sectionTitle: { color: brand.colors.deep, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontFamily: brand.typography.display },
  sectionCopy: { color: brand.colors.textMuted, marginTop: 8, marginBottom: 14, lineHeight: 20, fontFamily: brand.typography.body },
  input: {
    backgroundColor: '#fdfefe',
    borderWidth: 1,
    borderColor: '#dce7ee',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    color: brand.colors.deep,
    fontFamily: brand.typography.body,
  },
  trustBox: {
    marginTop: 8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#f7fbfc',
    borderWidth: 1,
    borderColor: '#dce7ee',
  },
  trustTitle: { color: brand.colors.deep, fontSize: 15, lineHeight: 20, fontFamily: brand.typography.heading },
  trustText: { color: brand.colors.textMuted, marginTop: 6, lineHeight: 20, fontFamily: brand.typography.body },
  microcopy: { color: '#5b7085', lineHeight: 19, marginBottom: 8, fontSize: 13, fontFamily: brand.typography.body },
  card: { width: '100%', height: 50, marginVertical: 12 },
  primaryButton: { marginTop: 8, borderRadius: 16, backgroundColor: brand.colors.primary },
  noticeBox: { paddingVertical: 12 },
  noticeText: { color: brand.colors.textMuted, lineHeight: 20, fontFamily: brand.typography.body },
});

