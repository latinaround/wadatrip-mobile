import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import { brand } from '../theme/brand';

export default function BookingSuccessScreen({ route, navigation }) {
  const { listing = null, reservation = null, amountFormatted = '', paymentReference = '' } = route?.params || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BrandHeader title="Booking Confirmed" subtitle="Your payment went through and your tour is now in motion." />

      <BrandCard style={styles.heroCard}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="check-bold" size={34} color="#0f8f98" />
        </View>
        <Text style={styles.heroTitle}>You are booked.</Text>
        <Text style={styles.heroCopy}>We kept the next step simple: your reservation is confirmed and you can review it in My bookings.</Text>
      </BrandCard>

      <BrandCard style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>What was confirmed</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Tour</Text>
          <Text style={styles.value}>{listing?.title || 'Tour booking'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Guide</Text>
          <Text style={styles.value}>{listing?.provider_name || listing?.provider || 'Local tour guide'}</Text>
        </View>
        {reservation?.date ? (
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{reservation.date}</Text>
          </View>
        ) : null}
        {reservation?.people ? (
          <View style={styles.row}>
            <Text style={styles.label}>Travelers</Text>
            <Text style={styles.value}>{reservation.people}</Text>
          </View>
        ) : null}
        {amountFormatted ? (
          <View style={styles.row}>
            <Text style={styles.label}>Paid</Text>
            <Text style={styles.value}>{amountFormatted}</Text>
          </View>
        ) : null}
        {paymentReference ? (
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{paymentReference}</Text>
          </View>
        ) : null}
        {reservation?.bookingStatus ? (
          <View style={styles.row}>
            <Text style={styles.label}>Booking status</Text>
            <Text style={styles.value}>{String(reservation.bookingStatus)}</Text>
          </View>
        ) : null}
        {reservation?.paymentStatus ? (
          <View style={styles.row}>
            <Text style={styles.label}>Payment status</Text>
            <Text style={styles.value}>{String(reservation.paymentStatus)}</Text>
          </View>
        ) : null}
      </BrandCard>

      <BrandCard style={styles.nextCard}>
        <Text style={styles.sectionTitle}>Next step</Text>
        <Text style={styles.copy}>Open My bookings to double-check the reservation details, payment status, and follow-up from the tour guide.</Text>
        <BrandButton
          title="Open My bookings"
          onPress={() =>
            navigation.navigate('Profile', {
              refreshBookings: true,
              recentBookingId: reservation?.bookingId || null,
              bookingSuccess: {
                title: listing?.title || 'Tour booking',
                date: reservation?.date || null,
                amountFormatted,
                paymentStatus: reservation?.paymentStatus || 'paid',
              },
            })
          }
          style={styles.primaryButton}
        />
        <BrandButton title="Back to Home" onPress={() => navigation.navigate('Home')} style={styles.secondaryButton} />
      </BrandCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  content: { paddingBottom: 32 },
  heroCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 28, alignItems: 'center' },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: 16,
    color: brand.colors.deep,
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.6,
    fontFamily: brand.typography.display,
  },
  heroCopy: {
    marginTop: 10,
    color: brand.colors.textMuted,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: brand.typography.body,
  },
  summaryCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  nextCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  sectionTitle: {
    color: brand.colors.deep,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.4,
    fontFamily: brand.typography.display,
  },
  row: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#dce7ee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: brand.typography.heading,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    color: brand.colors.deep,
    fontFamily: brand.typography.heading,
  },
  copy: {
    marginTop: 10,
    color: brand.colors.textMuted,
    lineHeight: 21,
    fontFamily: brand.typography.body,
  },
  primaryButton: { marginTop: 16, backgroundColor: brand.colors.primary },
  secondaryButton: { marginTop: 12, backgroundColor: brand.colors.accent },
});
