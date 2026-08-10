import React, { useMemo, useState } from 'react';
import { Alert, Image, ImageBackground, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import { brand } from '../theme/brand';
import { getDestinationCover } from '../data/destinationCovers';
import { resolveDestinationCover } from '../lib/api';

const normalizeListing = (raw) => {
  const item = raw || {};
  return {
    id: item.id,
    title: item.title || 'Tour',
    description: item.description || 'Experience hosted by a trusted local tour guide.',
    city: item.city || 'Destination',
    country: item.country_code || '',
    provider: item.provider_name || item.provider || 'Local tour guide',
    providerStatus: String(item.provider_status || item.providerStatus || '').toLowerCase(),
    providerVerifiedLevel: String(item.provider_verified_level || item.providerVerifiedLevel || '').toLowerCase(),
    providerPhotoUrl: item.provider_photo_url || item.providerPhotoUrl || '',
    providerBioShort: item.provider_bio_short || item.providerBioShort || '',
    coverImageUrl: item.cover_image_url || item.coverImageUrl || '',
    price: Number(item.price_from || item.price || 0),
    currency: String(item.currency || 'USD').toUpperCase(),
    rating: Number(item.ratings_avg || item.rating || 0),
    reviews: Number(item.ratings_count || item.reviews || 0),
    durationMinutes: Number(item.duration_minutes || item.duration || 0),
    tags: Array.isArray(item.tags) ? item.tags : Array.isArray(item.categories) ? item.categories : [],
    startDate: item.startDate || item.start_date || null,
    endDate: item.endDate || item.end_date || null,
    url: item.url || (item.id ? `https://www.wadatrip.com/tours/${item.id}` : ''),
  };
};

const getHostInitials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return 'WT';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

const hasRemoteImage = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return !!raw && raw !== 'null' && raw !== 'undefined' && /^https?:\/\//.test(raw);
};

const getTagVisual = (tag) => {
  const value = String(tag || '').trim().toLowerCase();
  if (value === 'food') return { icon: 'restaurant', label: '#food', colors: ['#fff1e6', '#ffe4e6'] };
  if (value === 'nature') return { icon: 'leaf', label: '#nature', colors: ['#dcfce7', '#ecfeff'] };
  if (value === 'history') return { icon: 'library', label: '#history', colors: ['#ede9fe', '#fef3c7'] };
  if (value === 'free_tour') return { icon: 'flash', label: '#free_tour', colors: ['#dbeafe', '#dcfce7'] };
  if (value === 'nightlife') return { icon: 'moon', label: '#nightlife', colors: ['#e0e7ff', '#fce7f3'] };
  if (value === 'art') return { icon: 'color-palette', label: '#art', colors: ['#fae8ff', '#e0f2fe'] };
  return { icon: 'sparkles', label: `#${value || 'tour'}`, colors: ['#fff7ed', '#f0fdfa'] };
};

export default function TourDetailScreen({ route, navigation }) {
  const initialListing = normalizeListing(route?.params?.listing);
  const hostOptions = useMemo(() => {
    const rows = Array.isArray(route?.params?.hostOptions) && route.params.hostOptions.length ? route.params.hostOptions : [initialListing];
    return rows.map((item) => normalizeListing(item));
  }, [route?.params?.hostOptions, initialListing]);
  const [selectedHostId, setSelectedHostId] = useState(String(hostOptions[0]?.id || initialListing.id || ''));
  const [resolvedCover, setResolvedCover] = useState(null);
  const listing = hostOptions.find((item) => String(item.id || '') === selectedHostId) || hostOptions[0] || initialListing;
  const experienceTitle = route?.params?.experienceTitle || listing.title;
  const isFree = listing.tags.includes('free_tour') || listing.price <= 0;
  const durationHours = listing.durationMinutes ? Math.max(1, Math.round(listing.durationMinutes / 60)) : null;
  const trustLabel =
    listing.providerStatus === 'approved' && listing.providerVerifiedLevel === 'licensed'
      ? 'Verified licensed host'
      : listing.providerStatus === 'approved'
        ? 'Approved local host'
        : 'Host profile';
  const hostInitials = getHostInitials(listing.provider);
  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const item = await resolveDestinationCover({ city: listing.city, country_code: listing.country });
        if (active) setResolvedCover(item);
      } catch {
        if (active) setResolvedCover(null);
      }
    };
    run();
    return () => { active = false; };
  }, [listing.city, listing.country]);

  const destinationCover = resolvedCover?.image_url
    ? { imageUrl: resolvedCover.image_url, eyebrow: resolvedCover.eyebrow || '', title: resolvedCover.title || '' }
    : getDestinationCover(listing.city);
  const chosenCoverUrl = hasRemoteImage(listing.coverImageUrl) ? listing.coverImageUrl : destinationCover.imageUrl;
  const hasCoverImage = hasRemoteImage(chosenCoverUrl);
  const hasProviderPhoto = hasRemoteImage(listing.providerPhotoUrl);
  const destinationTitle = String(destinationCover?.title || experienceTitle || listing.city || 'Local experience');

  const highlights = [
    durationHours ? `${durationHours}h experience` : 'Flexible timing',
    listing.reviews ? `${listing.reviews} traveler reviews` : 'New on WadaTrip',
    isFree ? 'Reserve your spot first' : 'Secure checkout with Stripe',
  ];

  const onPrimary = () => {
    if (isFree) {
      if (listing.url) {
        Linking.openURL(listing.url).catch(() => {
          Alert.alert('Free tour', 'Open the web listing to reserve this free tour.');
        });
        return;
      }
      Alert.alert('Free tour', 'Open the listing online to reserve your spot.');
      return;
    }
    navigation.navigate('Reserve', { listing });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader title="Tour details" subtitle="Understand the experience fast, then reserve with confidence." />

        <BrandCard style={styles.heroCard}>
          {hasCoverImage ? (
            <ImageBackground source={{ uri: chosenCoverUrl }} style={styles.heroImage} imageStyle={styles.heroImageInner}>
              <LinearGradient colors={['rgba(15,33,51,0.24)', 'rgba(15,33,51,0.72)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient} />
              <View style={styles.heroMedia}>
                {hasProviderPhoto ? (
                  <Image source={{ uri: listing.providerPhotoUrl }} style={styles.hostAvatarImage} />
                ) : (
                  <View style={styles.hostAvatar}>
                    <Text style={styles.hostAvatarText}>{hostInitials}</Text>
                  </View>
                )}
                <View style={styles.heroMediaCopy}>
                  <Text style={styles.heroEyebrow}>{destinationCover.eyebrow || listing.city}{listing.country ? ` · ${listing.country}` : ''}</Text>
                  <Text style={styles.heroMini}>Hosted by {listing.provider}</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{destinationTitle}</Text>
              <Text style={styles.heroSubtitle}>{experienceTitle !== destinationTitle ? experienceTitle : `${listing.city} local experience`}</Text>
              <Text style={styles.heroTrust}>{trustLabel}</Text>
              <Text style={styles.heroPrice}>{isFree ? 'Free tour' : `${listing.currency} ${listing.price.toFixed(2)}`}</Text>
              <Text style={styles.heroBody}>This screen should make the decision easier: what it is, why to trust it, and what happens next.</Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatValue}>{listing.rating ? `${listing.rating}` : 'New'}</Text>
                  <Text style={styles.heroStatLabel}>rating</Text>
                </View>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatValue}>{durationHours ? `${durationHours}h` : 'flex'}</Text>
                  <Text style={styles.heroStatLabel}>duration</Text>
                </View>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatValue}>{isFree ? 'spot' : 'pay'}</Text>
                  <Text style={styles.heroStatLabel}>{isFree ? 'reserve first' : 'secure checkout'}</Text>
                </View>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.heroImage}>
              <LinearGradient colors={['#0f2133', '#153850', '#1f6671']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient} />
              <View style={styles.heroMedia}>
                {hasProviderPhoto ? (
                  <Image source={{ uri: listing.providerPhotoUrl }} style={styles.hostAvatarImage} />
                ) : (
                  <View style={styles.hostAvatar}>
                    <Text style={styles.hostAvatarText}>{hostInitials}</Text>
                  </View>
                )}
                <View style={styles.heroMediaCopy}>
                  <Text style={styles.heroEyebrow}>{destinationCover.eyebrow || listing.city}{listing.country ? ` · ${listing.country}` : ''}</Text>
                  <Text style={styles.heroMini}>Hosted by {listing.provider}</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{destinationTitle}</Text>
              <Text style={styles.heroSubtitle}>{experienceTitle !== destinationTitle ? experienceTitle : `${listing.city} local experience`}</Text>
              <Text style={styles.heroTrust}>{trustLabel}</Text>
              <Text style={styles.heroPrice}>{isFree ? 'Free tour' : `${listing.currency} ${listing.price.toFixed(2)}`}</Text>
              <Text style={styles.heroBody}>This screen should make the decision easier: what it is, why to trust it, and what happens next.</Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatValue}>{listing.rating ? `${listing.rating}` : 'New'}</Text>
                  <Text style={styles.heroStatLabel}>rating</Text>
                </View>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatValue}>{durationHours ? `${durationHours}h` : 'flex'}</Text>
                  <Text style={styles.heroStatLabel}>duration</Text>
                </View>
                <View style={styles.heroStatBox}>
                  <Text style={styles.heroStatValue}>{isFree ? 'spot' : 'pay'}</Text>
                  <Text style={styles.heroStatLabel}>{isFree ? 'reserve first' : 'secure checkout'}</Text>
                </View>
              </View>
            </View>
          )}
        </BrandCard>

        <BrandCard style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Meet your host</Text>
          <View style={styles.hostIntroRow}>
            {hasProviderPhoto ? (
              <Image source={{ uri: listing.providerPhotoUrl }} style={styles.hostIntroImage} />
            ) : (
              <View style={styles.hostIntroFallback}>
                <Text style={styles.hostIntroFallbackText}>{hostInitials}</Text>
              </View>
            )}
            <View style={styles.hostIntroCopy}>
              <Text style={styles.hostIntroName}>{listing.provider}</Text>
              <Text style={styles.hostIntroMeta}>{trustLabel}</Text>
              {!!listing.providerBioShort ? <Text style={styles.hostIntroBio}>{listing.providerBioShort}</Text> : null}
            </View>
          </View>
        </BrandCard>

        <BrandCard style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Why travelers book</Text>
          <Text style={styles.sectionTitle}>A simple, local experience with a clear next step.</Text>
          <Text style={styles.sectionBody}>{listing.description}</Text>

          <View style={styles.highlightList}>
            {highlights.map((item) => (
              <View key={item} style={styles.highlightRow}>
                <Ionicons name="checkmark-circle" size={18} color={brand.colors.heroStart} />
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        </BrandCard>

        <BrandCard style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Before you reserve</Text>
          <Text style={styles.sectionTitle}>Everything you need at a glance</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Host</Text>
              <Text style={styles.metaValue}>{listing.provider}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Trust</Text>
              <Text style={styles.metaValue}>{trustLabel}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Reviews</Text>
              <Text style={styles.metaValue}>{listing.reviews || 0}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Dates</Text>
              <Text style={styles.metaValue}>{listing.startDate ? 'Scheduled' : 'Check with host'}</Text>
            </View>
          </View>

          {listing.tags.length ? (
            <View style={styles.tagsRow}>
              {listing.tags.map((tag) => (
                <LinearGradient key={tag} colors={getTagVisual(tag).colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tagChip}>
                  <Ionicons name={getTagVisual(tag).icon} size={13} color={brand.colors.heroStart} />
                  <Text style={styles.tag}>{getTagVisual(tag).label}</Text>
                </LinearGradient>
              ))}
            </View>
          ) : null}
        </BrandCard>

        {hostOptions.length > 1 ? (
          <BrandCard style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Available hosts</Text>
            <Text style={styles.sectionTitle}>Same experience, different hosts</Text>
            <Text style={styles.sectionBody}>Use one destination page, then compare trusted hosts by price and fit.</Text>
            <View style={styles.hostList}>
              {hostOptions.map((host) => {
                const active = String(host.id || '') === String(listing.id || '');
                const hostTrust =
                  host.providerStatus === 'approved' && host.providerVerifiedLevel === 'licensed'
                    ? 'Verified licensed host'
                    : host.providerStatus === 'approved'
                      ? 'Approved local host'
                      : 'Host profile';
                return (
                  <TouchableOpacity key={String(host.id || host.provider)} style={[styles.hostCard, active && styles.hostCardActive]} onPress={() => setSelectedHostId(String(host.id || ''))}>
                    {hasRemoteImage(host.providerPhotoUrl) ? (
                      <Image source={{ uri: host.providerPhotoUrl }} style={styles.hostCardAvatarImage} />
                    ) : (
                      <View style={styles.hostCardAvatar}>
                        <Text style={styles.hostCardAvatarText}>{getHostInitials(host.provider)}</Text>
                      </View>
                    )}
                    <View style={styles.hostCardCopy}>
                      <Text style={styles.hostCardName}>{host.provider}</Text>
                      <Text style={styles.hostCardMeta}>{hostTrust}</Text>
                    </View>
                    <View style={styles.hostCardPriceBlock}>
                      <Text style={styles.hostCardPrice}>{host.price > 0 ? `${host.currency} ${host.price.toFixed(0)}` : 'Free'}</Text>
                      <Text style={styles.hostCardPriceHint}>{host.durationMinutes ? `${Math.max(1, Math.round(host.durationMinutes / 60))}h` : 'flex'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </BrandCard>
        ) : null}

        <BrandCard style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>How booking works</Text>
          <Text style={styles.sectionTitle}>Move from interest to checkout without friction.</Text>

          <View style={styles.stepList}>
            <View style={styles.stepRow}>
              <View style={styles.stepDot}><Text style={styles.stepDotText}>1</Text></View>
              <Text style={styles.stepText}>Choose your date and traveler count.</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepDot}><Text style={styles.stepDotText}>2</Text></View>
              <Text style={styles.stepText}>Review the total before paying.</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepDot}><Text style={styles.stepDotText}>3</Text></View>
              <Text style={styles.stepText}>{isFree ? 'Reserve the free spot on the web listing.' : 'Finish secure checkout with Stripe.'}</Text>
            </View>
          </View>
        </BrandCard>
      </ScrollView>

      <View style={styles.stickyShell}>
        <View style={styles.stickyPriceBlock}>
          <Text style={styles.stickyPriceLabel}>{isFree ? 'Free tour' : 'From'}</Text>
          <Text style={styles.stickyPriceValue}>{isFree ? 'Reserve spot' : `${listing.currency} ${listing.price.toFixed(2)}`}</Text>
        </View>
        <BrandButton title={isFree ? 'Open free tour' : 'Reserve and continue'} onPress={onPrimary} style={styles.stickyPrimaryButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.colors.bg },
  content: { paddingBottom: 140 },
  heroCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 30, overflow: 'hidden', backgroundColor: '#102334', borderColor: '#1c3a53' },
  heroImage: { minHeight: 320 },
  heroImageInner: { borderRadius: 30 },
  heroGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 30 },
  heroMedia: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hostAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  hostAvatarImage: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#dbeafe' },
  hostAvatarText: { color: '#fff', fontSize: 18, fontFamily: brand.typography.heading },
  heroMediaCopy: { flex: 1 },
  heroEyebrow: { color: '#8ce9df', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  heroMini: { color: '#c5d5e0', marginTop: 4, fontFamily: brand.typography.body },
  heroTitle: { color: '#fff', fontSize: 30, lineHeight: 36, marginTop: 10, letterSpacing: -0.8, fontFamily: brand.typography.display },
  heroSubtitle: { color: '#d2e3ea', marginTop: 6, lineHeight: 19, fontFamily: brand.typography.heading },
  heroTrust: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.14)', color: '#f4fbff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontFamily: brand.typography.heading },
  heroPrice: { color: '#fff', fontSize: 26, marginTop: 16, letterSpacing: -0.5, fontFamily: brand.typography.display },
  heroBody: { color: '#a7c0ce', marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroStatBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 12 },
  heroStatValue: { color: '#fff', fontSize: 18, fontFamily: brand.typography.display },
  heroStatLabel: { color: '#9ebfce', marginTop: 4, fontSize: 11, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  sectionCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  sectionEyebrow: { color: brand.colors.heroStart, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  sectionTitle: { color: brand.colors.deep, fontSize: 24, lineHeight: 30, marginTop: 8, letterSpacing: -0.6, fontFamily: brand.typography.display },
  sectionBody: { color: brand.colors.textMuted, marginTop: 10, lineHeight: 21, fontFamily: brand.typography.body },
  hostIntroRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  hostIntroImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#dbeafe' },
  hostIntroFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: brand.colors.deep, alignItems: 'center', justifyContent: 'center' },
  hostIntroFallbackText: { color: '#fff', fontSize: 24, fontFamily: brand.typography.heading },
  hostIntroCopy: { flex: 1 },
  hostIntroName: { color: brand.colors.deep, fontSize: 20, fontFamily: brand.typography.display },
  hostIntroMeta: { color: brand.colors.heroStart, marginTop: 4, fontFamily: brand.typography.heading },
  hostIntroBio: { color: '#475569', marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  highlightList: { marginTop: 14, gap: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  highlightText: { flex: 1, color: brand.colors.deep, lineHeight: 20, fontFamily: brand.typography.body },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  metaCard: { width: '48%', backgroundColor: '#f7fbfc', borderWidth: 1, borderColor: '#dce7ee', borderRadius: 18, padding: 12 },
  metaLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: brand.typography.heading },
  metaValue: { color: brand.colors.deep, fontSize: 16, marginTop: 6, lineHeight: 20, fontFamily: brand.typography.heading },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tag: { color: brand.colors.heroStart, fontSize: 12, fontFamily: brand.typography.heading },
  hostList: { marginTop: 14, gap: 10 },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#dce7ee', borderRadius: 18, padding: 12, backgroundColor: '#fff' },
  hostCardActive: { borderColor: brand.colors.primary, backgroundColor: '#f0fdfa' },
  hostCardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: brand.colors.deep, alignItems: 'center', justifyContent: 'center' },
  hostCardAvatarImage: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dbeafe' },
  hostCardAvatarText: { color: '#fff', fontSize: 14, fontFamily: brand.typography.heading },
  hostCardCopy: { flex: 1 },
  hostCardName: { color: brand.colors.deep, fontSize: 16, fontFamily: brand.typography.heading },
  hostCardMeta: { color: brand.colors.textMuted, marginTop: 3, fontFamily: brand.typography.body },
  hostCardPriceBlock: { alignItems: 'flex-end' },
  hostCardPrice: { color: brand.colors.deep, fontSize: 16, fontFamily: brand.typography.heading },
  hostCardPriceHint: { color: brand.colors.textMuted, marginTop: 3, fontSize: 12, fontFamily: brand.typography.body },
  stepList: { marginTop: 14, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: brand.colors.heroStart, fontSize: 13, fontFamily: brand.typography.heading },
  stepText: { flex: 1, color: brand.colors.deep, lineHeight: 20, fontFamily: brand.typography.body },
  stickyShell: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dce7ee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickyPriceBlock: { flex: 1 },
  stickyPriceLabel: { color: brand.colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: brand.typography.heading },
  stickyPriceValue: { color: brand.colors.deep, fontSize: 20, marginTop: 4, fontFamily: brand.typography.display },
  stickyPrimaryButton: { flex: 1.25 },
});
