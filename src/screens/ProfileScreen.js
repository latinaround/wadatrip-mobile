import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Image, Platform, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { auth } from '../services/firebase';
import { getCurrentAppUser } from '../services/appSession';
import { getUserProfile } from '../services/userProfile';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as ImagePicker from 'expo-image-picker';
import { searchListings, listBookings, getCurrentProvider, normalizeProviderStatus } from '../lib/api';
import BrandHeader from '../components/brand/BrandHeader';
import BrandButton from '../components/brand/BrandButton';
import BrandCard from '../components/brand/BrandCard';
import BrandInput from '../components/brand/BrandInput';
import { useFocusEffect } from '@react-navigation/native';
import { brand } from '../theme/brand';

const normalizeRemoteImage = (value) => {
  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') return '';
  return raw;
};

export default function ProfileScreen({ navigation, route }) {
  const firebaseUser = auth.currentUser;
  const user = firebaseUser || getCurrentAppUser();
  const initialWorkspace = String(route?.params?.focusSection || '').toLowerCase() === 'guide' ? 'guide' : 'traveler';
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(normalizeRemoteImage(user?.photoURL));
  const [activeWorkspace, setActiveWorkspace] = useState(initialWorkspace);
  const [provider, setProvider] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [bookingEmail, setBookingEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [tours, setTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [toursError, setToursError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [guideSales, setGuideSales] = useState([]);
  const [loadingGuideSales, setLoadingGuideSales] = useState(false);
  const [guideSalesError, setGuideSalesError] = useState('');
  const showTestPayment = __DEV__ && process.env.EXPO_PUBLIC_SHOW_TEST_PAYMENT === 'true';
  const successState = route?.params?.bookingSuccess || null;
  const recentBookingId = route?.params?.recentBookingId || null;
  const shouldRefreshBookings = !!route?.params?.refreshBookings;
  const normalizedProviderStatus = normalizeProviderStatus(provider);
  const normalizedVerifiedLevel = String(provider?.verified_level || '').toLowerCase();
  const travelerStatusMeta = {
    title: 'Traveler space is active',
    copy: 'Use this same login to explore tours, pay, and manage your bookings.',
  };
  const guideStatusMeta = (() => {
    if (!provider) {
      return {
        title: 'Not a tour guide yet',
        tone: styles.statusNeutral,
        copy: 'Apply once. After approval you can publish tours and appear in Explore.',
      };
    }
    if (normalizedProviderStatus === 'approved') {
      return {
        title: normalizedVerifiedLevel === 'licensed' ? 'Approved: Verified licensed tour guide' : 'Approved: Community tour guide',
        tone: styles.statusApproved,
        copy: 'Your tour guide account is active. You can publish tours and show up in Explore.',
      };
    }
    if (normalizedProviderStatus === 'rejected') {
      return {
        title: 'Rejected: needs updates',
        tone: styles.statusRejected,
        copy: 'Update your application details and submit again for review.',
      };
    }
    return {
      title: 'Pending review',
      tone: styles.statusPending,
      copy: 'Your application is under review. Publishing stays locked until approval.',
    };
  })();
  const accountModeSummary = (() => {
    const guideLabel = !provider
      ? 'Not active'
      : normalizedProviderStatus === 'approved'
        ? 'Active'
        : normalizedProviderStatus === 'rejected'
          ? 'Needs updates'
          : 'Under review';
    return {
      traveler: 'Active',
      guide: guideLabel,
      copy: !provider
        ? 'One account, two paths. You already use WadaTrip as a traveler. Tour guide tools only turn on if you apply.'
        : normalizedProviderStatus === 'approved'
          ? 'One account, two paths. You can buy tours as a traveler and also publish tours as a tour guide or operator.'
          : 'One account, two paths. Your traveler side works now while your tour guide side is still being reviewed.',
    };
  })();

  const resolveProvider = async () => {
    setLoadingProvider(true);
    setProviderError('');
    try {
      const row = await getCurrentProvider(user?.email || '');
      setProvider(row || null);
    } catch (e) {
      if (e?.status === 404 || /Provider account not found/i.test(String(e?.message || ''))) {
        setProvider(null);
      } else {
        setProvider(null);
        setProviderError('Could not load tour guide status');
      }
    } finally {
      setLoadingProvider(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (firebaseUser?.uid) {
        const p = await getUserProfile(firebaseUser.uid);
        if (p) {
          if (p.displayName && !displayName) setDisplayName(p.displayName);
          if (p.photoURL && !photoURL) setPhotoURL(normalizeRemoteImage(p.photoURL));
        }
      }
      if (!bookingEmail && user?.email) setBookingEmail(String(user.email));
      if (user?.email) {
        await resolveProvider();
      }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.email) {
        resolveProvider();
      }
      if (shouldRefreshBookings && (bookingEmail || user?.email)) {
        loadMyBookings(bookingEmail || user?.email || '');
        try {
          navigation.setParams({ refreshBookings: false });
        } catch {}
      }
      return () => {};
    }, [user?.email, shouldRefreshBookings, bookingEmail]),
  );

  useEffect(() => {
    const section = String(route?.params?.focusSection || '').toLowerCase();
    if (section === 'guide' && user?.email) {
      resolveProvider();
    }
    if (section === 'guide' || section === 'traveler') {
      setActiveWorkspace(section);
    }
  }, [route?.params?.focusSection, user?.email]);

  useEffect(() => {
    const signedInEmail = String(user?.email || '').trim();
    const currentEmail = String(bookingEmail || '').trim();
    if (activeWorkspace !== 'traveler' || !signedInEmail) return;
    if (currentEmail && currentEmail.toLowerCase() !== signedInEmail.toLowerCase()) return;
    if (!currentEmail) setBookingEmail(signedInEmail);
    loadMyBookings(signedInEmail);
  }, [activeWorkspace, user?.email]);

  const loadMyTours = async () => {
    const pid = String(provider?.id || '').trim();
    const providerStatus = normalizeProviderStatus(provider);
    if (!pid || providerStatus !== 'approved') {
      setTours([]);
      return;
    }
    setLoadingTours(true);
    setToursError('');
    try {
      const items = await searchListings({ provider_id: pid, status: 'published', limit: 50 });
      const filtered = (Array.isArray(items) ? items : []).filter((item) => String(item?.provider_id || '') === pid);
      setTours(filtered);
    } catch (e) {
      console.error('Load tours error', e);
      setToursError('Could not load tours');
    } finally {
      setLoadingTours(false);
    }
  };

  const onSave = async () => {
    if (!firebaseUser) {
      Alert.alert('Limited session', 'Traveler profile edits use Firebase login. Guide code sign-in still works for hosting tools.');
      return;
    }
    if (!displayName) return Alert.alert('Name required', 'Please enter a display name');
    setSaving(true);
    try {
      await updateProfile(firebaseUser, { displayName, photoURL: photoURL || null });
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName,
        photoURL: photoURL || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      Alert.alert('Saved', 'Your profile was updated');
    } catch (e) {
      console.error('Profile save error', e);
      Alert.alert('Error', 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const loadMyBookings = async (email) => {
    const e = String(email || '').trim();
    if (!e) {
      setBookings([]);
      return;
    }
    setLoadingBookings(true);
    setBookingsError('');
    try {
      const items = await listBookings({ user_email: e });
      setBookings(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Load bookings error', err);
      const status = Number(err?.status || 0);
      setBookingsError(status === 404 || status === 501 ? 'Traveler bookings are not live on the backend yet' : 'Could not load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const getAmountFromBooking = (booking) => {
    const direct = [booking?.total_price, booking?.amount_total, booking?.total_amount, booking?.price_total];
    for (const value of direct) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  };

  const getNetFromBooking = (booking) => {
    const providerAmount = Number(booking?.provider_amount);
    if (Number.isFinite(providerAmount) && providerAmount > 0) return providerAmount;
    const providerAmountCents = Number(booking?.provider_amount_cents);
    if (Number.isFinite(providerAmountCents) && providerAmountCents > 0) return providerAmountCents / 100;

    const gross = getAmountFromBooking(booking);
    const commission = Number(booking?.commission_amount);
    if (Number.isFinite(commission) && commission > 0) return Math.max(gross - commission, 0);
    const commissionCents = Number(booking?.commission_cents);
    if (Number.isFinite(commissionCents) && commissionCents > 0) return Math.max(gross - commissionCents / 100, 0);
    return gross;
  };

  const loadGuideSales = async () => {
    const pid = String(provider?.id || '').trim();
    if (!pid || normalizedProviderStatus !== 'approved') {
      setGuideSales([]);
      return;
    }
    setLoadingGuideSales(true);
    setGuideSalesError('');
    try {
      let items = [];
      let bookingsBackendMissing = false;
      try {
        items = await listBookings({ provider_id: pid, limit: 100 });
      } catch (bookingError) {
        const status = Number(bookingError?.status || 0);
        bookingsBackendMissing = status === 404 || status === 501;
        items = [];
      }
      if (bookingsBackendMissing) {
        setGuideSales([]);
        setGuideSalesError('Guide wallet needs the bookings backend to be enabled');
        return;
      }
      const listings = await searchListings({ provider_id: pid, limit: 100 });
      const listingIds = new Set((Array.isArray(listings) ? listings : []).map((x) => String(x?.id || '')));
      const filtered = (Array.isArray(items) ? items : []).filter((b) => {
        const byProviderId = String(b?.provider_id || b?.listing?.provider_id || '') === pid;
        const listingId = String(b?.listing_id || b?.listing?.id || '');
        return byProviderId || (listingId && listingIds.has(listingId));
      });
      setGuideSales(filtered);
    } catch (err) {
      console.error('Load guide sales error', err);
      setGuideSalesError('Could not load wallet data');
    } finally {
      setLoadingGuideSales(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace !== 'guide') return;
    if (!provider?.id || normalizedProviderStatus !== 'approved') return;
    loadMyTours();
    loadGuideSales();
  }, [activeWorkspace, provider?.id, normalizedProviderStatus]);

  const guideSalesSummary = guideSales.reduce((acc, booking) => {
    const status = String(booking?.payment_status || '').toLowerCase();
    const gross = getAmountFromBooking(booking);
    const net = getNetFromBooking(booking);
    acc.gross += gross;
    acc.net += net;
    if (!status || status === 'pending' || status === 'requires_payment_method' || status === 'processing') {
      acc.pending += net;
    }
    if (status === 'paid' || status === 'succeeded' || status === 'completed') {
      acc.paid += net;
    }
    return acc;
  }, { gross: 0, net: 0, pending: 0, paid: 0 });

  const bookingSummary = useMemo(() => {
    return bookings.reduce((acc, booking) => {
      acc.total += 1;
      const paymentStatus = String(booking?.payment_status || '').toLowerCase();
      const bookingStatus = String(booking?.status || '').toLowerCase();
      if (paymentStatus === 'paid' || paymentStatus === 'succeeded' || paymentStatus === 'completed') acc.paid += 1;
      if (bookingStatus === 'confirmed' || bookingStatus === 'booked') acc.confirmed += 1;
      return acc;
    }, { total: 0, paid: 0, confirmed: 0 });
  }, [bookings]);

  const getBookingStatusMeta = (booking) => {
    const bookingStatus = String(booking?.status || '').toLowerCase();
    const paymentStatus = String(booking?.payment_status || '').toLowerCase();

    if (paymentStatus === 'paid' || paymentStatus === 'succeeded' || paymentStatus === 'completed') {
      return { label: 'Paid', style: styles.bookingBadgePaid };
    }
    if (bookingStatus === 'confirmed' || bookingStatus === 'booked') {
      return { label: 'Confirmed', style: styles.bookingBadgeConfirmed };
    }
    if (paymentStatus === 'processing' || paymentStatus === 'requires_action') {
      return { label: 'Processing', style: styles.bookingBadgeProcessing };
    }
    return { label: 'Pending', style: styles.bookingBadgePending };
  };

  const onPickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo access to pick an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length) {
        setPhotoURL(normalizeRemoteImage(result.assets[0].uri));
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      <BrandHeader title="My Profile" subtitle="Account, language and tour guide status." />
      <BrandCard style={styles.modeSummaryCard}>
        <Text style={styles.modeSummaryEyebrow}>How this account works</Text>
        <Text style={styles.modeSummaryTitle}>One login, two paths</Text>
        <Text style={styles.modeSummaryText}>{accountModeSummary.copy}</Text>
        <View style={styles.modeSummaryGrid}>
          <View style={[styles.modePill, styles.modePillTraveler]}>
            <Text style={styles.modePillLabel}>Traveler</Text>
            <Text style={styles.modePillValue}>{accountModeSummary.traveler}</Text>
          </View>
          <View style={[styles.modePill, styles.modePillGuide]}>
            <Text style={styles.modePillLabel}>Tour guide</Text>
            <Text style={styles.modePillValue}>{accountModeSummary.guide}</Text>
          </View>
        </View>
      </BrandCard>
      <BrandCard style={styles.workspaceCard}>
        <Text style={styles.workspaceEyebrow}>Workspace</Text>
        <Text style={styles.workspaceTitle}>Choose the side you want to manage now</Text>
        <Text style={styles.workspaceText}>
          Traveler is for searching, paying and managing bookings. Tour guide is for approval, tours and sales.
        </Text>
        <View style={styles.segmented}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.segmentButton, activeWorkspace === 'traveler' && styles.segmentButtonTravelerActive]}
            onPress={() => setActiveWorkspace('traveler')}
          >
            <Text style={[styles.segmentText, activeWorkspace === 'traveler' && styles.segmentTextActive]}>Traveler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.segmentButton, activeWorkspace === 'guide' && styles.segmentButtonGuideActive]}
            onPress={() => setActiveWorkspace('guide')}
          >
            <Text style={[styles.segmentText, activeWorkspace === 'guide' && styles.segmentTextActive]}>Tour guide</Text>
          </TouchableOpacity>
        </View>
      </BrandCard>
      {successState ? (
        <BrandCard style={styles.successCard}>
          <Text style={styles.successEyebrow}>Latest booking</Text>
          <Text style={styles.successTitle}>Payment confirmed</Text>
          <Text style={styles.successText}>
            {successState.title || 'Your booking'}{successState.date ? ` on ${successState.date}` : ''}{successState.amountFormatted ? ` · ${successState.amountFormatted}` : ''}.
          </Text>
          {successState.paymentStatus ? (
            <View style={[styles.statusBadge, styles.statusApproved, styles.successBadge]}>
              <Text style={styles.statusBadgeText}>{String(successState.paymentStatus).toUpperCase()}</Text>
            </View>
          ) : null}
        </BrandCard>
      ) : null}
      <BrandCard style={styles.profileCard}>
        <View style={styles.avatarRow}>
          {normalizeRemoteImage(photoURL) ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{(displayName || 'U').charAt(0).toUpperCase()}</Text></View>
          )}
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{displayName || 'Traveler'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'No email linked'}</Text>
          </View>
        </View>

        <Text style={styles.label}>Display name</Text>
        <BrandInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your tour guide name" />
        <Text style={styles.label}>Photo URL</Text>
        <BrandInput style={styles.input} value={photoURL} onChangeText={setPhotoURL} placeholder="https://..." autoCapitalize="none" />
        <BrandButton title="Choose photo" onPress={onPickImage} variant="secondary" style={[styles.button, styles.secondary]} />
        <Text style={styles.helperText}>Local image only. Use a URL for cross-device sharing.</Text>
      </BrandCard>

      {activeWorkspace === 'traveler' ? (
        <>
          <Text style={styles.sectionTitle}>Traveler space</Text>
          <BrandCard style={[styles.statusCard, styles.travelerCard]}>
            <View style={[styles.statusBadge, styles.statusNeutral]}>
              <Text style={styles.statusBadgeText}>{travelerStatusMeta.title}</Text>
            </View>
            <Text style={styles.helperText}>{travelerStatusMeta.copy}</Text>
            <View style={styles.inlineActions}>
              <BrandButton title="Explore tours" onPress={() => navigation.navigate('ToursDeals')} style={[styles.button, styles.primary, styles.inlineButton]} />
              <BrandButton title="Flights" onPress={() => navigation.navigate('Flights')} style={[styles.button, styles.secondary, styles.inlineButton]} />
            </View>
          </BrandCard>
        </>
      ) : null}

      {activeWorkspace === 'guide' ? (
        <>
          <Text style={styles.sectionTitle}>Tour guide tools</Text>
          {loadingProvider ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : providerError ? (
            <Text style={styles.errorText}>{providerError}</Text>
          ) : !provider ? (
            <BrandCard style={[styles.statusCard, styles.guideCard]}>
              <View style={[styles.statusBadge, guideStatusMeta.tone]}>
                <Text style={styles.statusBadgeText}>{guideStatusMeta.title}</Text>
              </View>
              <Text style={styles.helperText}>{guideStatusMeta.copy}</Text>
              <BrandButton title="Become a tour guide" onPress={() => navigation.navigate('ProviderSignup')} style={[styles.button, styles.primary]} />
            </BrandCard>
          ) : (
            <BrandCard style={[styles.statusCard, styles.guideCard]}>
              <View style={[styles.statusBadge, guideStatusMeta.tone]}>
                <Text style={styles.statusBadgeText}>{guideStatusMeta.title}</Text>
              </View>
              <Text style={styles.helperText}>{guideStatusMeta.copy}</Text>
              {normalizedProviderStatus === 'approved' ? (
                <>
                  <Text style={styles.metaCaption}>Your tours and wallet refresh automatically when you open this space.</Text>
                  <BrandButton title={loadingTours ? 'Loading...' : 'Refresh my tours'} onPress={loadMyTours} disabled={loadingTours} variant="secondary" style={[styles.button, styles.secondary]} />
                  <BrandButton title="Create Tour" onPress={() => navigation.navigate('CreateListing', { provider })} style={[styles.button, styles.primary]} />
                </>
              ) : normalizedProviderStatus === 'rejected' ? (
                <>
                  <Text style={styles.errorText}>Application rejected.</Text>
                  {provider?.rejection_reason ? (
                    <Text style={styles.helperText}>Reason: {String(provider.rejection_reason)}</Text>
                  ) : null}
                  <Text style={styles.helperText}>Update your details and resubmit for review.</Text>
                  <BrandButton title="Update Application" onPress={() => navigation.navigate('ProviderSignup', { provider })} style={[styles.button, styles.secondary]} />
                </>
              ) : normalizedProviderStatus === 'suspended' ? (
                <Text style={styles.errorText}>Account suspended. Contact support to reactivate publishing access.</Text>
              ) : (
                <>
                  <BrandButton title="Refresh Status" onPress={() => resolveProvider()} style={[styles.button, styles.secondary]} />
                </>
              )}
            </BrandCard>
          )}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Account settings</Text>
      <Text style={styles.helperText}>Manage language, preferences and sign out.</Text>
      <BrandButton title="Open Settings" onPress={() => navigation.navigate('Settings')} variant="secondary" style={[styles.button, styles.secondary]} />

      <BrandButton title={saving ? 'Saving.' : 'Save'} onPress={onSave} disabled={saving} style={[styles.button, styles.primary]} />

      {activeWorkspace === 'guide' ? (
        <>
          <Text style={styles.sectionTitle}>My tours as tour guide</Text>
          {loadingTours ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : toursError ? (
            <Text style={styles.errorText}>{toursError}</Text>
          ) : tours.length ? (
            tours.map((tour) => (
              <BrandCard key={tour.id} style={styles.tourCard}>
                <Text style={styles.tourTitle}>{tour.title}</Text>
                <Text style={styles.tourMeta}>{tour.city} · {tour.currency || 'USD'} {tour.price_from || ''}</Text>
              </BrandCard>
            ))
          ) : (
            <Text style={styles.helperText}>No tours loaded yet.</Text>
          )}
        </>
      ) : null}

      {activeWorkspace === 'traveler' ? (
        <>
          <Text style={styles.sectionTitle}>My bookings as traveler</Text>
          <Text style={styles.label}>Booking email</Text>
          <BrandInput style={styles.input} value={bookingEmail} onChangeText={setBookingEmail} placeholder="you@email.com" autoCapitalize="none" />
          <Text style={styles.helperText}>We auto-load bookings from your signed-in email. Change it only if you booked with another address.</Text>
          <BrandButton title={loadingBookings ? 'Loading...' : 'Refresh my bookings'} onPress={() => loadMyBookings(bookingEmail)} disabled={loadingBookings} variant="secondary" style={[styles.button, styles.secondary]} />
          {bookings.length ? (
            <View style={styles.walletGrid}>
              <BrandCard style={styles.walletCard}>
                <Text style={styles.walletLabel}>Total bookings</Text>
                <Text style={styles.walletValue}>{bookingSummary.total}</Text>
              </BrandCard>
              <BrandCard style={styles.walletCard}>
                <Text style={styles.walletLabel}>Paid</Text>
                <Text style={styles.walletValue}>{bookingSummary.paid}</Text>
              </BrandCard>
              <BrandCard style={styles.walletCard}>
                <Text style={styles.walletLabel}>Confirmed</Text>
                <Text style={styles.walletValue}>{bookingSummary.confirmed}</Text>
              </BrandCard>
            </View>
          ) : null}
          {loadingBookings ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : bookingsError ? (
            <Text style={styles.errorText}>{bookingsError}</Text>
          ) : bookings.length ? (
            bookings.map((b) => (
              <TouchableOpacity key={b.id} activeOpacity={0.9} onPress={() => navigation.navigate('BookingDetail', { booking: b })}>
                <BrandCard style={[styles.tourCard, recentBookingId && String(b?.id) === String(recentBookingId) ? styles.recentBookingCard : null]}>
                  <View style={styles.bookingHeaderRow}>
                    <Text style={styles.tourTitle}>{b.listing?.title || 'Booking'}</Text>
                    <View style={[styles.bookingBadge, getBookingStatusMeta(b).style]}>
                      <Text style={styles.bookingBadgeText}>{getBookingStatusMeta(b).label}</Text>
                    </View>
                  </View>
                  <Text style={styles.tourMeta}>{b.listing?.city || b?.listing?.location || 'Destination'} · {b.listing?.provider_name || b?.listing?.provider || 'Local tour guide'}</Text>
                  <Text style={styles.tourMeta}>Date: {b.date ? String(b.date).slice(0, 10) : 'Date pending'}</Text>
                  <Text style={styles.tourMeta}>Payment: {b.payment_status || 'unpaid'}{b.status ? ` · Booking: ${b.status}` : ''}</Text>
                  {getAmountFromBooking(b) > 0 ? (
                    <Text style={styles.tourMeta}>Total: {String(b?.currency || b?.listing?.currency || 'USD').toUpperCase()} {getAmountFromBooking(b).toFixed(2)}</Text>
                  ) : null}
                  {b?.id ? <Text style={styles.bookingRef}>Ref: {String(b.id).slice(0, 12)}</Text> : null}
                  {String(b?.id || '') === String(recentBookingId || '') ? <Text style={styles.recentBookingText}>Most recent purchase</Text> : null}
                  <View style={styles.bookingActionsRow}>
                    <BrandButton title="View detail" onPress={() => navigation.navigate('BookingDetail', { booking: b })} style={styles.bookingActionPrimary} />
                    {['pending', 'requires_payment_method', 'unpaid'].includes(String(b?.payment_status || '').toLowerCase()) ? (
                      <BrandButton
                        title="Retry payment"
                        onPress={() => navigation.navigate('BookingDetail', { booking: b })}
                        style={styles.bookingActionSecondary}
                      />
                    ) : null}
                  </View>
                </BrandCard>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.helperText}>No bookings loaded yet. After checkout, your reservation should show up here.</Text>
          )}
        </>
      ) : null}

      {activeWorkspace === 'guide' && normalizedProviderStatus === 'approved' ? (
        <>
          <Text style={styles.sectionTitle}>Tour guide wallet</Text>
          <Text style={styles.helperText}>Track your sales, net earnings and payment status. This also auto-refreshes when you open guide tools.</Text>
          <BrandButton
            title={loadingGuideSales ? 'Loading...' : 'Refresh wallet'}
            onPress={loadGuideSales}
            disabled={loadingGuideSales}
            variant="secondary"
            style={[styles.button, styles.secondary]}
          />
          {loadingGuideSales ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : guideSalesError ? (
            <Text style={styles.errorText}>{guideSalesError}</Text>
          ) : (
            <>
              <View style={styles.walletGrid}>
                <BrandCard style={styles.walletCard}>
                  <Text style={styles.walletLabel}>Gross sales</Text>
                  <Text style={styles.walletValue}>${guideSalesSummary.gross.toFixed(2)}</Text>
                </BrandCard>
                <BrandCard style={styles.walletCard}>
                  <Text style={styles.walletLabel}>Net earnings</Text>
                  <Text style={styles.walletValue}>${guideSalesSummary.net.toFixed(2)}</Text>
                </BrandCard>
                <BrandCard style={styles.walletCard}>
                  <Text style={styles.walletLabel}>Paid out</Text>
                  <Text style={styles.walletValue}>${guideSalesSummary.paid.toFixed(2)}</Text>
                </BrandCard>
                <BrandCard style={styles.walletCard}>
                  <Text style={styles.walletLabel}>Pending</Text>
                  <Text style={styles.walletValue}>${guideSalesSummary.pending.toFixed(2)}</Text>
                </BrandCard>
              </View>
              {guideSales.length ? (
                guideSales.map((b) => {
                  const gross = getAmountFromBooking(b);
                  const net = getNetFromBooking(b);
                  const currency = String(b?.currency || b?.listing?.currency || 'USD').toUpperCase();
                  return (
                    <BrandCard key={`wallet-${b.id}`} style={styles.tourCard}>
                      <Text style={styles.tourTitle}>{b.listing?.title || 'Tour booking'}</Text>
                      <Text style={styles.tourMeta}>Receipt: {String(b?.id || '').slice(0, 12) || '-'}</Text>
                      <Text style={styles.tourMeta}>Date: {b?.date ? String(b.date).slice(0, 10) : '-'}</Text>
                      <Text style={styles.tourMeta}>Traveler: {b?.user_email || '-'}</Text>
                      <Text style={styles.tourMeta}>Gross: {currency} {gross.toFixed(2)}</Text>
                      <Text style={styles.tourMeta}>Net: {currency} {net.toFixed(2)} · {String(b?.payment_status || 'pending')}</Text>
                    </BrandCard>
                  );
                })
              ) : (
                <Text style={styles.helperText}>No sales yet.</Text>
              )}
            </>
          )}
        </>
      ) : null}

      {showTestPayment ? (
        <BrandButton
          title="Test Payment ($19.99)"
          variant="secondary"
          style={[styles.button, { backgroundColor: '#ff2aa1' }]}
          onPress={() => navigation.navigate('Payment', { amount: 1999, currency: 'usd', description: 'Test tour booking' })}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.colors.bg, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16 },
  modeSummaryCard: { marginTop: 12, borderRadius: 24, backgroundColor: brand.colors.surfaceMint, borderColor: brand.colors.borderMint },
  modeSummaryEyebrow: { color: brand.colors.heroStart, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: brand.typography.heading },
  modeSummaryTitle: { marginTop: 8, color: brand.colors.deep, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, fontFamily: brand.typography.display },
  modeSummaryText: { marginTop: 8, color: brand.colors.textMuted, lineHeight: 21, fontFamily: brand.typography.body },
  modeSummaryGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modePill: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 13, borderWidth: 1, borderColor: brand.colors.borderMint },
  modePillTraveler: { backgroundColor: brand.colors.surfaceWarm, borderColor: brand.colors.borderWarm },
  modePillGuide: { backgroundColor: brand.colors.surfaceRose, borderColor: brand.colors.borderRose },
  modePillLabel: { color: brand.colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: brand.typography.heading },
  modePillValue: { marginTop: 5, color: brand.colors.deep, fontSize: 18, fontFamily: brand.typography.heading },
  workspaceCard: { marginTop: 12, borderRadius: 24, backgroundColor: '#fffbf8', borderColor: brand.colors.borderWarm },
  workspaceEyebrow: { color: brand.colors.accent, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: brand.typography.heading },
  workspaceTitle: { marginTop: 8, color: brand.colors.deep, fontSize: 22, lineHeight: 27, letterSpacing: -0.4, fontFamily: brand.typography.display },
  workspaceText: { marginTop: 8, color: brand.colors.textMuted, lineHeight: 21, fontFamily: brand.typography.body },
  segmented: { flexDirection: 'row', backgroundColor: '#f1e5da', borderRadius: 18, padding: 5, marginTop: 14 },
  segmentButton: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  segmentButtonTravelerActive: { backgroundColor: brand.colors.surfaceWarm },
  segmentButtonGuideActive: { backgroundColor: brand.colors.surfaceRose },
  segmentText: { color: '#6b7280', fontFamily: brand.typography.heading },
  segmentTextActive: { color: brand.colors.deep },
  successCard: { marginTop: 12, borderRadius: 24, backgroundColor: '#ecfeff', borderColor: brand.colors.borderMint },
  successEyebrow: { color: brand.colors.heroStart, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: brand.typography.heading },
  successTitle: { marginTop: 8, color: brand.colors.deep, fontSize: 22, lineHeight: 27, letterSpacing: -0.4, fontFamily: brand.typography.display },
  successText: { marginTop: 8, color: brand.colors.textMuted, lineHeight: 21, fontFamily: brand.typography.body },
  successBadge: { marginTop: 12 },
  profileCard: { borderRadius: 24, marginTop: 12, backgroundColor: '#fffdfb', borderColor: '#ece4da' },
  label: { color: brand.colors.deep, marginTop: 8, marginBottom: 6, letterSpacing: 0.2, fontFamily: brand.typography.heading },
  input: { marginBottom: 0 },
  button: { paddingVertical: 12, borderRadius: 16, alignItems: 'center', marginTop: 14 },
  primary: { backgroundColor: brand.colors.primary },
  secondary: { backgroundColor: brand.colors.accent },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: '#b9eced', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, color: '#0f6f78', fontFamily: brand.typography.display },
  profileMeta: { marginLeft: 14, flex: 1 },
  profileName: { color: brand.colors.deep, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, fontFamily: brand.typography.display },
  profileEmail: { color: brand.colors.textMuted, marginTop: 4, fontFamily: brand.typography.body },
  sectionTitle: { marginTop: 24, color: brand.colors.deep, fontSize: 23, lineHeight: 28, letterSpacing: -0.4, fontFamily: brand.typography.display },
  statusCard: { marginTop: 8, borderRadius: 24 },
  travelerCard: { backgroundColor: brand.colors.surfaceWarm, borderColor: brand.colors.borderWarm },
  guideCard: { backgroundColor: brand.colors.surfaceRose, borderColor: brand.colors.borderRose },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  statusBadgeText: { fontSize: 13, fontFamily: brand.typography.heading },
  statusApproved: { backgroundColor: '#d7faf1' },
  statusPending: { backgroundColor: '#fff2c9' },
  statusRejected: { backgroundColor: '#ffe5e8' },
  statusNeutral: { backgroundColor: '#e3f6fb' },
  inlineActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  inlineButton: { flex: 1 },
  metaCaption: { color: brand.colors.textMuted, marginTop: 10, fontSize: 12, fontFamily: brand.typography.heading },
  tourCard: { marginTop: 10, borderRadius: 18 },
  bookingHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  bookingBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  bookingBadgeText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: brand.typography.heading },
  bookingBadgePaid: { backgroundColor: '#d1fae5' },
  bookingBadgeConfirmed: { backgroundColor: '#dbeafe' },
  bookingBadgeProcessing: { backgroundColor: '#fef3c7' },
  bookingBadgePending: { backgroundColor: '#f1f5f9' },
  recentBookingCard: { borderColor: '#8be9ea', backgroundColor: '#f6feff' },
  recentBookingText: { marginTop: 8, color: brand.colors.heroStart, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: brand.typography.heading },
  tourTitle: { color: brand.colors.deep, lineHeight: 22, fontFamily: brand.typography.heading },
  tourMeta: { color: brand.colors.textMuted, marginTop: 4, fontFamily: brand.typography.body },
  bookingRef: { color: '#5b7085', marginTop: 8, fontSize: 12, fontFamily: brand.typography.heading },
  bookingActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  bookingActionPrimary: { flex: 1, backgroundColor: brand.colors.primary },
  bookingActionSecondary: { flex: 1, backgroundColor: brand.colors.accent },
  helperText: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  errorText: { color: '#b02a37', marginTop: 8, lineHeight: 20, fontFamily: brand.typography.heading },
  walletGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  walletCard: { width: '48%', borderRadius: 20, padding: 12, backgroundColor: '#f8fbfc', borderColor: '#deedf0' },
  walletLabel: { color: brand.colors.textMuted, fontSize: 12, letterSpacing: 0.3, fontFamily: brand.typography.heading },
  walletValue: { color: brand.colors.deep, fontSize: 18, marginTop: 4, letterSpacing: -0.3, fontFamily: brand.typography.display },
});

