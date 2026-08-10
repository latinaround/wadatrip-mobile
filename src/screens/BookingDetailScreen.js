import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import { brand } from '../theme/brand';
import { getBooking, startCheckout } from '../lib/api';

function getAmountFromBooking(booking) {
  const direct = [booking?.total_price, booking?.amount_total, booking?.total_amount, booking?.price_total];
  for (const value of direct) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function getStatusMeta(booking) {
  const bookingStatus = String(booking?.status || '').toLowerCase();
  const paymentStatus = String(booking?.payment_status || '').toLowerCase();

  if (paymentStatus === 'paid' || paymentStatus === 'succeeded' || paymentStatus === 'completed') {
    return { label: 'Paid', style: styles.badgePaid };
  }
  if (bookingStatus === 'confirmed' || bookingStatus === 'booked') {
    return { label: 'Confirmed', style: styles.badgeConfirmed };
  }
  if (paymentStatus === 'processing' || paymentStatus === 'requires_action') {
    return { label: 'Processing', style: styles.badgeProcessing };
  }
  return { label: 'Pending', style: styles.badgePending };
}

export default function BookingDetailScreen({ route, navigation }) {
  const bookingSeed = route?.params?.booking || {};
  const [booking, setBooking] = useState(bookingSeed);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(route?.params?.checkoutError || '');
  const statusMeta = getStatusMeta(booking);
  const amount = getAmountFromBooking(booking);
  const currency = String(booking?.currency || booking?.listing?.currency || 'USD').toUpperCase();
  const listing = booking?.listing || {};
  const bookingLink = booking?.checkout_url || booking?.receipt_url || listing?.url || null;

  const refreshBooking = useCallback(async () => {
    const bookingId = booking?.id || bookingSeed?.id;
    if (!bookingId) return;
    setLoading(true);
    try {
      const fresh = await getBooking(String(bookingId));
      if (fresh) setBooking(fresh);
    } catch {
      // Keep the known booking state visible when a refresh cannot complete.
    } finally {
      setLoading(false);
    }
  }, [booking?.id, bookingSeed?.id]);

  useEffect(() => {
    refreshBooking();
  }, [refreshBooking]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refreshBooking);
    return unsubscribe;
  }, [navigation, refreshBooking]);

  useEffect(() => {
    if (route?.params?.checkoutError) setCheckoutError(route.params.checkoutError);
  }, [route?.params?.checkoutError]);

  const onRefresh = async () => {
    await refreshBooking();
  };

  const openExternal = async () => {
    if (!bookingLink) {
      Alert.alert('Not available', 'No receipt or booking link is available for this reservation yet.');
      return;
    }
    try {
      await Linking.openURL(String(bookingLink));
    } catch {
      Alert.alert('Link error', 'Could not open the booking link.');
    }
  };

  const onRetryPayment = async () => {
    if (!booking?.id) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const checkout = await startCheckout(String(booking.id));
      if (!checkout?.url) throw new Error('Stripe did not return a checkout URL.');
      await WebBrowser.openBrowserAsync(String(checkout.url));
      // A browser close is not a successful payment. Ask the API for the state
      // that Stripe's webhook has actually persisted.
      await refreshBooking();
    } catch {
      setCheckoutError('Stripe checkout could not be started. Your reservation is still pending and unpaid; please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };
  const onContactGuide = () => {
    navigation.navigate('Community');
  };

  const shouldShowRetry = ['pending', 'requires_payment_method', 'unpaid'].includes(String(booking?.payment_status || '').toLowerCase()) && amount > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BrandHeader title="Booking Details" subtitle="Everything the traveler needs after checkout." />

      <BrandCard style={styles.heroCard}>
        <View style={[styles.badge, statusMeta.style]}>
          <Text style={styles.badgeText}>{statusMeta.label}</Text>
        </View>
        <Text style={styles.title}>{listing?.title || 'Booking'}</Text>
        <Text style={styles.subtitle}>{listing?.city || 'Destination'} · {listing?.provider_name || listing?.provider || 'Local tour guide'}</Text>
      </BrandCard>

      <BrandCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Reservation</Text>
        {loading ? <ActivityIndicator style={styles.loading} color={brand.colors.heroStart} /> : null}
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{booking?.date ? String(booking.date).slice(0, 10) : 'Pending'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Travelers</Text>
          <Text style={styles.value}>{booking?.num_people || booking?.people || 1}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment</Text>
          <Text style={styles.value}>{String(booking?.payment_status || 'unpaid')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Booking</Text>
          <Text style={styles.value}>{String(booking?.status || 'pending')}</Text>
        </View>
        {amount > 0 ? (
          <View style={styles.row}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{currency} {amount.toFixed(2)}</Text>
          </View>
        ) : null}
        {booking?.id ? (
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{String(booking.id).slice(0, 12)}</Text>
          </View>
        ) : null}
      </BrandCard>

      <BrandCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Next step</Text>
        <Text style={styles.copy}>Payment confirmation comes from Stripe's webhook. Closing the checkout page does not mark this reservation as paid.</Text>
        {checkoutError ? <Text style={styles.error}>{checkoutError}</Text> : null}
        <BrandButton title={loading ? 'Refreshing...' : 'Refresh booking status'} onPress={onRefresh} disabled={loading || checkoutLoading} style={styles.refreshButton} />
        <BrandButton title="View receipt or booking link" onPress={openExternal} style={styles.primaryButton} />
        {shouldShowRetry ? <BrandButton title={checkoutLoading ? 'Opening Stripe...' : 'Retry payment'} onPress={onRetryPayment} disabled={checkoutLoading || loading} style={styles.warningButton} /> : null}
        <BrandButton title="Contact host" onPress={onContactGuide} style={styles.secondaryButton} />
      </BrandCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  content: { paddingBottom: 32 },
  heroCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 24 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: brand.typography.heading },
  badgePaid: { backgroundColor: '#d1fae5' },
  badgeConfirmed: { backgroundColor: '#dbeafe' },
  badgeProcessing: { backgroundColor: '#fef3c7' },
  badgePending: { backgroundColor: '#f1f5f9' },
  title: { marginTop: 12, color: brand.colors.deep, fontSize: 26, lineHeight: 31, letterSpacing: -0.6, fontFamily: brand.typography.display },
  subtitle: { marginTop: 8, color: brand.colors.textMuted, lineHeight: 21, fontFamily: brand.typography.body },
  sectionCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  sectionTitle: { color: brand.colors.deep, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, fontFamily: brand.typography.display },
  loading: { marginTop: 12 },
  row: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#dce7ee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: brand.typography.heading },
  value: { flexShrink: 1, textAlign: 'right', color: brand.colors.deep, fontFamily: brand.typography.heading },
  copy: { marginTop: 10, color: brand.colors.textMuted, lineHeight: 21, fontFamily: brand.typography.body },
  error: { marginTop: 12, color: '#b42318', lineHeight: 20, fontFamily: brand.typography.body },
  refreshButton: { marginTop: 16, backgroundColor: brand.colors.secondary },
  primaryButton: { marginTop: 12, backgroundColor: brand.colors.primary },
  warningButton: { marginTop: 12, backgroundColor: brand.colors.accent },
  secondaryButton: { marginTop: 12, backgroundColor: brand.colors.secondary },
});
