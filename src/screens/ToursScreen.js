import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { searchListings, normalizeProviderStatus, listDestinationCovers } from '../lib/api';
import BrandHeader from '../components/brand/BrandHeader';
import BrandButton from '../components/brand/BrandButton';
import BrandInput from '../components/brand/BrandInput';
import BrandCard from '../components/brand/BrandCard';
import { brand } from '../theme/brand';
import { getDestinationCover } from '../data/destinationCovers';

let NativeDateTimePicker = null;
try {
  NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {}

const ENABLE_NATIVE_DATE_PICKER = !!NativeDateTimePicker;
const CITY_OPTIONS = ['Tokyo', 'Cancun', 'Mexico City', 'New York', 'Los Angeles', 'Madrid', 'Barcelona', 'Paris', 'Rome', 'Lima', 'Santiago'];

const toIsoDate = (value) => {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseNumber = (value) => {
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? null : n;
};

const normalizeListing = (item) => ({
  id: item?.id,
  title: item?.title || 'Tour',
  description: item?.description || 'Local experience hosted through WadaTrip.',
  city: item?.city || 'Destination',
  provider: item?.provider_name || 'Local tour guide',
  price: Number(item?.price_from || 0),
  rating: Number(item?.ratings_avg || 0),
  reviews: Number(item?.ratings_count || 0),
  durationHours: item?.duration_minutes ? Math.max(1, Math.round(Number(item.duration_minutes) / 60)) : null,
  categories: Array.isArray(item?.tags) ? item.tags : [],
  providerStatus: String(item?.provider_status || '').toLowerCase(),
  providerVerifiedLevel: String(item?.provider_verified_level || item?.verified_level || '').toLowerCase(),
  providerPhotoUrl: item?.provider_photo_url || '',
  providerBioShort: item?.provider_bio_short || '',
  coverImageUrl: item?.cover_image_url || '',
  url: item?.url || `https://www.wadatrip.com/tours/${item?.id}`,
});

const groupExperiences = (rows) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const listing = normalizeListing(row);
    const key = `${String(listing.title || '').trim().toLowerCase()}::${String(listing.city || '').trim().toLowerCase()}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        key,
        id: listing.id,
        title: listing.title,
        city: listing.city,
        description: listing.description,
        categories: listing.categories,
        minPrice: listing.price,
        maxPrice: listing.price,
        rating: listing.rating,
        reviews: listing.reviews,
        durationHours: listing.durationHours,
        primaryHost: listing.provider,
        primaryListing: listing,
        hosts: [listing],
      });
      return;
    }
    current.hosts.push(listing);
    current.minPrice = Math.min(current.minPrice, listing.price);
    current.maxPrice = Math.max(current.maxPrice, listing.price);
    if ((listing.reviews || 0) > (current.reviews || 0)) {
      current.rating = listing.rating;
      current.reviews = listing.reviews;
      current.durationHours = listing.durationHours || current.durationHours;
      current.primaryHost = listing.provider;
      current.primaryListing = listing;
    }
  });
  return Array.from(map.values()).sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
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

const getCoverMeta = (listing) => {
  const primaryTag = Array.isArray(listing?.categories) && listing.categories.length ? String(listing.categories[0]) : 'tour';
  if (primaryTag === 'food') return { icon: 'restaurant', label: 'Food pick', colors: ['#ffedd5', '#ffe4e6'] };
  if (primaryTag === 'nature') return { icon: 'leaf', label: 'Nature day', colors: ['#dcfce7', '#ecfeff'] };
  if (primaryTag === 'history') return { icon: 'library', label: 'History walk', colors: ['#ede9fe', '#fef3c7'] };
  if (primaryTag === 'free_tour') return { icon: 'flash', label: 'Free tour', colors: ['#e0f2fe', '#ecfccb'] };
  return { icon: 'compass', label: 'Top local experience', colors: ['#fff7ed', '#f0fdfa'] };
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

const getSketchBadges = (item, data) => {
  const badges = [];
  const primary = getTagVisual(data.categories[0] || 'tour');
  badges.push(primary);
  if ((item?.hosts?.length || 0) > 1) {
    badges.push({ icon: 'people', label: `${item.hosts.length} hosts`, colors: ['#ecfeff', '#dbeafe'] });
  } else {
    badges.push({ icon: 'person-circle', label: 'Local host', colors: ['#eef2ff', '#fce7f3'] });
  }
  if (data.durationHours) {
    badges.push({ icon: 'time', label: `${data.durationHours}h`, colors: ['#fef3c7', '#ffedd5'] });
  } else {
    badges.push({ icon: 'map', label: 'City walk', colors: ['#fef9c3', '#ecfccb'] });
  }
  return badges.slice(0, 3);
};

const getDestinationTitle = (listing, destinationCover) =>
  String(destinationCover?.title || listing?.title || listing?.city || 'Local experience');

const hasRemoteImage = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return !!raw && raw !== 'null' && raw !== 'undefined' && /^https?:\/\//.test(raw);
};

export default function ToursScreen({ route }) {
  const navigation = useNavigation();
  const [destination, setDestination] = useState('Lima');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('250');
  const [decisionDays, setDecisionDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [top, setTop] = useState([]);
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingDestination, setEditingDestination] = useState(false);
  const [anywhere, setAnywhere] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [destinationCoverRegistry, setDestinationCoverRegistry] = useState({});
  const openPlanner = !!route?.params?.openPlanner;
  const communityDestination = String(route?.params?.destination || route?.params?.city || '').trim();
  const autoSearchDestination = !!route?.params?.autoSearch;

  const rankListings = (rows) => {
    const list = Array.isArray(rows) ? [...rows] : [];
    const score = (row) => {
      const status = normalizeProviderStatus({
        status: row?.provider_status || row?.provider?.status,
        verification_status: row?.provider_verification_status || row?.provider?.verification_status,
      });
      const level = String(row?.provider_verified_level || row?.verified_level || '').toLowerCase();
      if (status === 'approved' && level === 'licensed') return 3;
      if (status === 'approved') return 2;
      return 1;
    };
    return list.sort((a, b) => score(b) - score(a));
  };

  useEffect(() => {
    const loadDestinationCovers = async () => {
      try {
        const items = await listDestinationCovers({ active: true, limit: 100 });
        const next = {};
        (Array.isArray(items) ? items : []).forEach((item) => {
          const key = String(item?.city || '').trim().toLowerCase();
          if (!key) return;
          next[key] = {
            imageUrl: item?.image_url || '',
            eyebrow: item?.eyebrow || '',
            title: item?.title || '',
          };
        });
        setDestinationCoverRegistry(next);
      } catch {
        setDestinationCoverRegistry({});
      }
    };
    loadDestinationCovers();
  }, []);

  useEffect(() => {
    const loadTop = async () => {
      try {
        const rows = await searchListings({ status: 'published', limit: 10, free_tour: freeOnly });
        setTop(groupExperiences(rankListings(rows)));
      } catch {
        setTop([]);
      }
    };
    loadTop();
  }, [freeOnly]);

  useEffect(() => {
    if (openPlanner) {
      Alert.alert('Trip planner', 'Use Explore first, then open the planner when you need help comparing options.');
    }
  }, [openPlanner]);

  const destinationSuggestions = useMemo(() => {
    if (!editingDestination) return [];
    const q = destination.trim().toLowerCase();
    if (!q) return CITY_OPTIONS.slice(0, 6);
    return CITY_OPTIONS.filter((city) => city.toLowerCase().includes(q)).slice(0, 6);
  }, [destination, editingDestination]);

  const runSearch = async (overrides = {}) => {
    const destinationValue = String(overrides.destination ?? destination).trim();
    const anywhereValue = typeof overrides.anywhere === 'boolean' ? overrides.anywhere : anywhere;
    const freeOnlyValue = typeof overrides.freeOnly === 'boolean' ? overrides.freeOnly : freeOnly;

    if (!anywhereValue && !destinationValue) {
      Alert.alert('Where to?', 'Choose a city or turn on Anywhere first.');
      return;
    }

    let min = parseNumber(budgetMin);
    let max = parseNumber(budgetMax);
    if (min != null && min < 0) min = null;
    if (max != null && max <= 0) max = null;
    if (min != null && max != null && min > max) {
      Alert.alert('Invalid budget', 'Min budget must be lower than max budget.');
      return;
    }

    setLoading(true);
    try {
      const locationQuery = anywhereValue ? undefined : destinationValue;
      const rows = await searchListings({
        city: locationQuery,
        q: locationQuery,
        min_price: min ?? undefined,
        max_price: max ?? undefined,
        status: 'published',
        limit: 20,
        free_tour: freeOnlyValue,
      });
      setResults(groupExperiences(rankListings(rows)));
    } catch (e) {
      console.error('Error searching tours', e);
      Alert.alert('Error', 'Could not load tours right now.');
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async () => runSearch();

  useEffect(() => {
    if (!communityDestination) return;
    setAnywhere(false);
    setDestination(communityDestination);
    if (autoSearchDestination) {
      runSearch({ destination: communityDestination, anywhere: false });
    }
  }, [communityDestination, autoSearchDestination]);

  const proofItems = [
    { icon: 'shield-checkmark', title: 'Verified hosts', text: 'Approved tour guides and operators only.' },
    { icon: 'card', title: 'Secure payment', text: 'Clear checkout and booking states.' },
    { icon: 'sparkles', title: 'Faster decisions', text: 'Price, trust and next step all visible.' },
  ];

  const renderCard = ({ item }, horizontal = false) => {
    const data = item?.primaryListing || normalizeListing(item);
    const isFree = data.categories.includes('free_tour') || item?.minPrice <= 0;
    const trustLabel =
      data.providerStatus === 'approved' && data.providerVerifiedLevel === 'licensed'
        ? 'Verified licensed host'
        : data.providerStatus === 'approved'
          ? 'Approved local host'
          : 'Host profile';
    const hostInitials = getHostInitials(data.provider);
    const coverMeta = getCoverMeta(data);
    const hostCount = Array.isArray(item?.hosts) ? item.hosts.length : 1;
    const destinationCover = destinationCoverRegistry[String(data.city || '').trim().toLowerCase()] || getDestinationCover(data.city);
    const chosenCoverUrl = hasRemoteImage(data.coverImageUrl) ? data.coverImageUrl : destinationCover.imageUrl;
    const hasCoverImage = hasRemoteImage(chosenCoverUrl);
    const hasProviderPhoto = hasRemoteImage(data.providerPhotoUrl);
    const destinationTitle = getDestinationTitle(data, destinationCover);
    const hostLabel = hostCount > 1 ? `${hostCount} hosts available` : data.provider;
    const priceLabel = isFree
      ? 'Free'
      : item?.minPrice !== item?.maxPrice
        ? `$${item.minPrice}-$${item.maxPrice}`
        : `$${item?.minPrice ?? data.price}`;
    const sketchBadges = getSketchBadges(item, data);

    return (
      <BrandCard style={[styles.card, horizontal ? styles.cardHorizontal : styles.cardVertical]}>
        <LinearGradient colors={['#fff6ef', '#f7ffff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGlow} />

        {hasCoverImage ? (
          <ImageBackground
            source={{ uri: chosenCoverUrl }}
            style={styles.coverFrame}
            imageStyle={styles.coverImage}
          >
            <LinearGradient colors={['rgba(15,23,42,0.08)', 'rgba(15,23,42,0.48)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverPanel}>
              <View style={styles.coverBadge}>
                <Ionicons name={coverMeta.icon} size={14} color="#fff" />
                <Text style={[styles.coverBadgeText, styles.coverBadgeTextOnImage]}>{destinationCover.eyebrow || coverMeta.label}</Text>
              </View>
              <View style={styles.coverBottom}>
                {hasProviderPhoto ? (
                  <Image source={{ uri: data.providerPhotoUrl }} style={styles.coverAvatarImage} />
                ) : (
                  <View style={styles.coverAvatar}>
                    <Text style={styles.coverAvatarText}>{hostInitials}</Text>
                  </View>
                )}
                <View style={styles.coverCopy}>
                  <Text style={[styles.coverCity, styles.coverCityOnImage]}>{destinationTitle}</Text>
                  <Text style={[styles.coverHost, styles.coverHostOnImage]} numberOfLines={1}>
                    {hostLabel}
                  </Text>
                </View>
              </View>
            </LinearGradient>
            <View pointerEvents="none" style={styles.coverImageMask}>
              <View style={styles.coverImageHint}>
                <Ionicons name="image" size={14} color="#fff" />
                <Text style={styles.coverImageHintText}>Destination cover</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.coverFrame}>
            <LinearGradient colors={coverMeta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverPanel}>
              <View style={styles.coverBadge}>
                <Ionicons name={coverMeta.icon} size={14} color={brand.colors.deep} />
                <Text style={styles.coverBadgeText}>{destinationCover.eyebrow || coverMeta.label}</Text>
              </View>
              <View style={styles.coverBottom}>
                {hasProviderPhoto ? (
                  <Image source={{ uri: data.providerPhotoUrl }} style={styles.coverAvatarImage} />
                ) : (
                  <View style={styles.coverAvatar}>
                    <Text style={styles.coverAvatarText}>{hostInitials}</Text>
                  </View>
                )}
                <View style={styles.coverCopy}>
                  <Text style={styles.coverCity}>{destinationTitle}</Text>
                  <Text style={styles.coverHost} numberOfLines={1}>
                    {hostLabel}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={styles.cardTopRow}>
          <View style={styles.cityPill}>
            <Ionicons name="location" size={13} color={brand.colors.heroEnd} />
            <Text style={styles.cityPillText}>{data.city}</Text>
          </View>
          <Text style={styles.priceText}>{priceLabel}</Text>
        </View>

        <Text style={styles.cardTitle}>{destinationTitle}</Text>
        <Text style={styles.cardSubhead}>{item?.title || data.title}</Text>
        <Text style={styles.cardHost}>
          {hostCount > 1 ? `${hostCount} verified hosts available for this experience` : `Hosted by ${data.provider}`}
        </Text>

        <Text style={styles.trustPill}>{trustLabel}</Text>
        <Text style={styles.cardMeta}>
          {data.rating ? `${data.rating} stars` : 'New host'}
          {data.reviews ? ` · ${data.reviews} reviews` : ''}
          {data.durationHours ? ` · ${data.durationHours}h` : ''}
        </Text>

        <Text style={styles.cardDescription} numberOfLines={2}>
          {data.description}
        </Text>

        <View style={styles.sketchRow}>
          {sketchBadges.map((badge) => (
            <LinearGradient key={`${data.id}-${badge.label}`} colors={badge.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sketchBadge}>
              <Ionicons name={badge.icon} size={14} color={brand.colors.deep} />
              <Text style={styles.sketchBadgeText}>{badge.label}</Text>
            </LinearGradient>
          ))}
        </View>

        <View style={styles.tagsRow}>
          {data.categories.slice(0, 3).map((tag) => (
            <LinearGradient key={tag} colors={getTagVisual(tag).colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tagChip}>
              <Ionicons name={getTagVisual(tag).icon} size={13} color={brand.colors.heroStart} />
              <Text style={styles.tag}>{getTagVisual(tag).label}</Text>
            </LinearGradient>
          ))}
        </View>

        <View style={styles.cardActions}>
          <BrandButton title="View details" onPress={() => navigation.navigate('TourDetail', { listing: data, hostOptions: item?.hosts || [data], experienceTitle: item?.title || data.title })} style={styles.actionButton} />
          <BrandButton title={isFree ? 'Save spot' : 'Reserve'} variant="secondary" onPress={() => navigation.navigate('TourDetail', { listing: data, hostOptions: item?.hosts || [data], experienceTitle: item?.title || data.title })} style={styles.actionButton} />
        </View>
      </BrandCard>
    );
  };

  const emptyResults = (
    <BrandCard style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No tours matched your trip yet</Text>
      <Text style={styles.emptyText}>Try Lima, Cancun, Madrid, or broaden your budget range.</Text>
    </BrandCard>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={(info) => renderCard(info, false)}
        ListEmptyComponent={results.length ? emptyResults : null}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.heroWrap}>
              <BrandHeader title="Book better tours. Meet trusted hosts." subtitle="Traveler-first marketplace for memorable local experiences." />

              <View style={styles.heroPanel}>
                <Text style={styles.heroEyebrow}>Traveler marketplace</Text>
                <Text style={styles.heroHeadline}>Compare tours fast, trust the host, then reserve with confidence.</Text>
                <Text style={styles.heroBody}>WadaTrip should make buying tours feel obvious: clear prices, approved local hosts, and a next step you can understand immediately.</Text>

                <View style={styles.heroStats}>
                  <View style={styles.heroStatCard}>
                    <Text style={styles.heroStatValue}>{top.length || 0}</Text>
                    <Text style={styles.heroStatLabel}>featured picks</Text>
                  </View>
                  <View style={styles.heroStatCard}>
                    <Text style={styles.heroStatValue}>{freeOnly ? 'Free' : 'Paid + free'}</Text>
                    <Text style={styles.heroStatLabel}>tour types</Text>
                  </View>
                  <View style={styles.heroStatCard}>
                    <Text style={styles.heroStatValue}>Stripe</Text>
                    <Text style={styles.heroStatLabel}>secure checkout</Text>
                  </View>
                </View>
              </View>

              <View style={styles.proofList}>
                {proofItems.map((item) => (
                  <View key={item.title} style={styles.proofCard}>
                    <Ionicons name={item.icon} size={16} color={brand.colors.heroStart} />
                    <Text style={styles.proofTitle}>{item.title}</Text>
                    <Text style={styles.proofText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <BrandCard style={styles.searchCard}>
              <Text style={styles.sectionEyebrow}>Search</Text>
              <Text style={styles.sectionTitle}>Find the right experience fast</Text>
              <Text style={styles.sectionBody}>Start with a city. Add budget and dates only if you want to narrow down quickly.</Text>

              <BrandInput
                style={styles.input}
                placeholder="Where are you going?"
                value={destination}
                onChangeText={setDestination}
                onFocus={() => setEditingDestination(true)}
                onBlur={() => setTimeout(() => setEditingDestination(false), 120)}
                autoCapitalize="words"
              />

              {destinationSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {destinationSuggestions.map((city) => (
                    <TouchableOpacity key={city} style={styles.suggestionRow} onPress={() => { setDestination(city); setEditingDestination(false); }}>
                      <Text style={styles.suggestionText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View style={styles.quickCityRow}>
                {CITY_OPTIONS.slice(0, 4).map((city) => (
                  <TouchableOpacity
                    key={`quick-${city}`}
                    style={[styles.quickCityChip, destination === city && styles.quickCityChipActive]}
                    onPress={() => {
                      setAnywhere(false);
                      setDestination(city);
                      setEditingDestination(false);
                    }}
                  >
                    <Text style={[styles.quickCityText, destination === city && styles.quickCityTextActive]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.filterChip, anywhere && styles.filterChipActive]} onPress={() => { const next = !anywhere; setAnywhere(next); if (next) setDestination(''); }}>
                  <Text style={[styles.filterChipText, anywhere && styles.filterChipTextActive]}>Anywhere</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterChip, freeOnly && styles.filterChipActive]} onPress={() => setFreeOnly((prev) => !prev)}>
                  <Text style={[styles.filterChipText, freeOnly && styles.filterChipTextActive]}>Free tours</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreFilters} onPress={() => setShowFilters((prev) => !prev)}>
                  <Text style={styles.moreFiltersText}>{showFilters ? 'Hide filters' : 'More filters'}</Text>
                </TouchableOpacity>
              </View>

              {showFilters ? (
                <>
                  <View style={styles.row}>
                    <BrandInput style={[styles.input, styles.inputHalf]} placeholder="Min budget" keyboardType="numeric" value={budgetMin} onChangeText={setBudgetMin} />
                    <BrandInput style={[styles.input, styles.inputHalf]} placeholder="Max budget" keyboardType="numeric" value={budgetMax} onChangeText={setBudgetMax} />
                  </View>

                  <View style={styles.dateRow}>
                    <TouchableOpacity style={[styles.dateButton, styles.dateButtonMain]} onPress={() => ENABLE_NATIVE_DATE_PICKER && setShowDatePicker(true)}>
                      <Text style={styles.dateText}>{date ? toIsoDate(date) : 'Travel date (optional)'}</Text>
                    </TouchableOpacity>
                    {date ? (
                      <TouchableOpacity style={styles.dateClearButton} onPress={() => setDate(null)}>
                        <Text style={styles.dateClearText}>Any date</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {ENABLE_NATIVE_DATE_PICKER && showDatePicker && NativeDateTimePicker ? (
                    <NativeDateTimePicker
                      value={date || new Date()}
                      mode="date"
                      display="default"
                      onChange={(_, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDate(selectedDate);
                      }}
                    />
                  ) : null}

                  <BrandInput style={styles.input} placeholder="Decision window (days)" keyboardType="numeric" value={decisionDays} onChangeText={setDecisionDays} />
                </>
              ) : null}

              <View style={styles.searchActions}>
                <BrandButton title={loading ? 'Searching...' : 'Find experiences'} onPress={onSearch} disabled={loading} style={styles.searchButton} />
                <BrandButton title="Trip planner" variant="secondary" onPress={() => navigation.navigate('Itinerary')} style={styles.planButton} />
              </View>
            </BrandCard>

            {!!top.length ? (
              <View style={styles.topSection}>
                <Text style={styles.resultsEyebrow}>Featured</Text>
                <Text style={styles.resultsTitle}>Tours travelers can book right now</Text>
                <Text style={styles.resultsBody}>Lead with the best options first, then search if you already know your destination.</Text>
                <FlatList
                  horizontal
                  data={top}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={(info) => renderCard(info, true)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </View>
            ) : null}

            {results.length > 0 ? (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsEyebrow}>Search results</Text>
                <Text style={styles.resultsTitle}>{results.length} experiences matched your trip</Text>
                <Text style={styles.resultsBody}>Host trust, price and reserve CTA are visible before you tap.</Text>
              </View>
            ) : null}
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.colors.bg },
  list: { paddingBottom: 32 },
  heroWrap: { paddingBottom: 8 },
  heroPanel: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 28,
    backgroundColor: '#0f2133',
  },
  heroEyebrow: { color: '#8ce9df', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  heroHeadline: { color: '#fff', fontSize: 28, lineHeight: 34, marginTop: 10, letterSpacing: -0.8, fontFamily: brand.typography.display },
  heroBody: { color: '#bed2df', marginTop: 10, lineHeight: 21, fontFamily: brand.typography.body },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroStatCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 12 },
  heroStatValue: { color: '#fff', fontSize: 18, fontFamily: brand.typography.display },
  heroStatLabel: { color: '#9ec0cf', marginTop: 4, fontSize: 11, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  proofList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  proofCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5edf4', borderRadius: 20, padding: 14 },
  proofTitle: { color: brand.colors.deep, marginTop: 10, fontSize: 15, fontFamily: brand.typography.heading },
  proofText: { color: brand.colors.textMuted, marginTop: 4, lineHeight: 19, fontFamily: brand.typography.body },
  searchCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 24 },
  sectionEyebrow: { color: brand.colors.heroStart, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8, fontFamily: brand.typography.heading },
  sectionTitle: { color: brand.colors.deep, fontSize: 25, lineHeight: 31, letterSpacing: -0.6, fontFamily: brand.typography.display },
  sectionBody: { color: brand.colors.textMuted, marginTop: 8, marginBottom: 14, lineHeight: 20, fontFamily: brand.typography.body },
  input: {},
  suggestions: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 16, marginTop: -5, marginBottom: 10, overflow: 'hidden' },
  suggestionRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  quickCityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  quickCityChip: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#f3dfcd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  quickCityChipActive: { backgroundColor: '#ccfbf1', borderColor: '#5eead4' },
  quickCityText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  quickCityTextActive: { color: brand.colors.heroStart },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  filterChip: { backgroundColor: '#eef6f8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  filterChipActive: { backgroundColor: '#ccfbf1' },
  filterChipText: { color: '#334155', fontFamily: brand.typography.heading },
  filterChipTextActive: { color: brand.colors.heroStart },
  moreFilters: { marginLeft: 'auto' },
  moreFiltersText: { color: brand.colors.heroEnd, fontFamily: brand.typography.heading },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputHalf: { width: '48%' },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dateButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ee', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 },
  dateButtonMain: { flex: 1 },
  dateText: { color: brand.colors.deep, fontFamily: brand.typography.body },
  dateClearButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef6f8', borderRadius: 16, paddingHorizontal: 12 },
  dateClearText: { color: brand.colors.heroEnd, fontFamily: brand.typography.heading },
  searchActions: { flexDirection: 'row', gap: 10 },
  searchButton: { flex: 1 },
  planButton: { flex: 1 },
  topSection: { paddingTop: 8 },
  resultsHeader: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  resultsEyebrow: { color: brand.colors.heroStart, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  resultsTitle: { color: brand.colors.deep, fontSize: 24, lineHeight: 30, marginTop: 4, letterSpacing: -0.5, fontFamily: brand.typography.display },
  resultsBody: { color: brand.colors.textMuted, marginTop: 6, lineHeight: 20, fontFamily: brand.typography.body },
  horizontalList: { paddingHorizontal: 16, paddingVertical: 10 },
  emptyCard: { marginHorizontal: 16, marginTop: 4, marginBottom: 16 },
  emptyTitle: { color: brand.colors.deep, fontSize: 18, fontFamily: brand.typography.heading },
  emptyText: { color: brand.colors.textMuted, marginTop: 6, fontFamily: brand.typography.body },
  card: { marginHorizontal: 16, marginBottom: 14, borderRadius: 26, overflow: 'hidden' },
  cardVertical: {},
  cardHorizontal: { width: 305, marginRight: 12, marginHorizontal: 0 },
  cardGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 26 },
  coverFrame: { marginBottom: 14, borderRadius: 22, overflow: 'hidden', backgroundColor: '#dbeafe' },
  coverImage: { borderRadius: 22 },
  coverPanel: { padding: 14, minHeight: 132, justifyContent: 'space-between' },
  coverImageMask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.14)' },
  coverImageHint: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.58)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  coverImageHintText: { color: '#fff', fontSize: 12, fontFamily: brand.typography.heading },
  coverBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  coverBadgeText: { color: brand.colors.deep, fontSize: 12, fontFamily: brand.typography.heading },
  coverBadgeTextOnImage: { color: '#fff' },
  coverBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,23,42,0.86)', alignItems: 'center', justifyContent: 'center' },
  coverAvatarImage: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe' },
  coverAvatarText: { color: '#fff', fontSize: 15, fontFamily: brand.typography.heading },
  coverCopy: { flex: 1 },
  coverCity: { color: brand.colors.deep, fontSize: 20, lineHeight: 24, fontFamily: brand.typography.display },
  coverCityOnImage: { color: '#fff' },
  coverHost: { color: '#475569', marginTop: 3, fontFamily: brand.typography.body },
  coverHostOnImage: { color: '#d9ebf4' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  cityPillText: { color: brand.colors.heroEnd, fontSize: 12, fontFamily: brand.typography.heading },
  priceText: { color: brand.colors.deep, fontSize: 23, letterSpacing: -0.4, fontFamily: brand.typography.display },
  cardTitle: { color: brand.colors.deep, fontSize: 23, lineHeight: 29, marginTop: 12, letterSpacing: -0.6, fontFamily: brand.typography.display },
  cardSubhead: { color: '#51687b', marginTop: 5, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: brand.typography.heading },
  cardHost: { color: '#4b6276', marginTop: 4, fontFamily: brand.typography.body },
  trustPill: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#dcf8f2', color: '#0a7569', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontFamily: brand.typography.heading },
  cardMeta: { color: brand.colors.textMuted, marginTop: 8, fontFamily: brand.typography.body },
  cardDescription: { color: '#334155', marginTop: 10, lineHeight: 20, fontFamily: brand.typography.body },
  sketchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sketchBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  sketchBadgeText: { color: brand.colors.deep, fontSize: 12, fontFamily: brand.typography.heading },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  tag: { color: brand.colors.heroStart, fontSize: 12, fontFamily: brand.typography.heading },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1 },
});
