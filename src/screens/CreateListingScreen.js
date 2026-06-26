import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createListing, getProvider, getListing, updateListing, deleteListing, getCurrentProvider, normalizeProviderStatus } from '../lib/api';
import { auth } from '../services/firebase';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import BrandInput from '../components/brand/BrandInput';
import { brand } from '../theme/brand';

const CATEGORIES = ['tour', 'activity', 'transfer', 'custom'];

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tour';

const buildPublicTourUrl = (listing) => {
  const direct = String(listing?.url || '').trim();
  if (/^https?:\/\//i.test(direct)) return direct;
  const id = String(listing?.id || '').trim();
  if (!id) return 'https://www.wadatrip.com/tours';
  const slug = `${slugify(listing?.title)}-${slugify(listing?.city)}-${id.slice(-6).toLowerCase()}`;
  return `https://www.wadatrip.com/tours/${slug}`;
};

export default function CreateListingScreen({ route, navigation }) {
  const { t } = useTranslation();
  const initialProvider = route?.params?.provider || null;
  const user = auth.currentUser;
  const [provider, setProvider] = useState(initialProvider || null);
  const [providerStatus, setProviderStatus] = useState(String(initialProvider?.status || ''));
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [editLookup, setEditLookup] = useState('');
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tour');
  const [city, setCity] = useState(String(initialProvider?.base_city || ''));
  const [country, setCountry] = useState(String(initialProvider?.country_code || ''));
  const [duration, setDuration] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [isFreeTour, setIsFreeTour] = useState(false);
  const [createdTour, setCreatedTour] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedStatus = normalizeProviderStatus(provider || { status: providerStatus });
  const normalizedLevel = String(provider?.verified_level || '').toLowerCase();
  const formReady = Boolean(title.trim() && city.trim() && country.trim() && (isFreeTour || priceFrom.trim()));
  const parsedPrice = Number(priceFrom || 0);
  const hostPayout = !isFreeTour && Number.isFinite(parsedPrice) && parsedPrice > 0 ? (parsedPrice * 0.85).toFixed(2) : '';

  const statusMeta = useMemo(() => {
    if (providerLoading) {
      return { title: 'Checking tour guide status', copy: 'Loading your provider account before opening the editor.', tone: styles.statusPending };
    }
    if (!provider) {
      return { title: 'Tour guide account required', copy: 'Create your tour guide or operator account first. Publishing stays locked until you apply and get approved.', tone: styles.statusNeutral };
    }
    if (normalizedStatus === 'approved') {
      return {
        title: normalizedLevel === 'licensed' ? 'Approved: Verified licensed tour guide' : 'Approved: Community tour guide',
        copy: 'You can publish, update, and delete tours from here.',
        tone: styles.statusApproved,
      };
    }
    if (normalizedStatus === 'rejected') {
      return { title: 'Rejected: update application', copy: 'Fix the application first, then come back to publish tours.', tone: styles.statusRejected };
    }
    return { title: 'Pending review', copy: 'Your tour guide application is still under review. Publishing is locked until approval.', tone: styles.statusPending };
  }, [provider, providerLoading, normalizedStatus, normalizedLevel]);

  const parseListingId = (input) => {
    const raw = String(input || '').trim();
    if (!raw) return '';
    const cleaned = raw.split('?')[0].split('#')[0];
    const parts = cleaned.split('/');
    return String(parts[parts.length - 1] || '').trim();
  };

  const resetForm = () => {
    setEditingId('');
    setEditLookup('');
    setTitle('');
    setDescription('');
    setCategory('tour');
    setCity(String(provider?.base_city || initialProvider?.base_city || ''));
    setCountry(String(provider?.country_code || initialProvider?.country_code || ''));
    setDuration('');
    setPriceFrom('');
    setCurrency('USD');
    setCoverImageUrl('');
    setStartDate('');
    setEndDate('');
    setTags('');
    setIsFreeTour(false);
    setCreatedTour(null);
  };

  const fetchProvider = async (id) => {
    if (!id) return;
    try {
      const p = await getProvider(String(id));
      setProvider(p);
      setProviderStatus(normalizeProviderStatus(p));
      if (!city) setCity(String(p?.base_city || ''));
      if (!country) setCountry(String(p?.country_code || ''));
    } catch {
      setProviderError('Could not load tour guide status');
    }
  };

  const resolveProvider = async () => {
    setProviderError('');
    setProviderLoading(true);
    try {
      const p = await getCurrentProvider(user?.email || '');
      setProvider(p || null);
      setProviderStatus(normalizeProviderStatus(p));
      if (!city) setCity(String(p?.base_city || ''));
      if (!country) setCountry(String(p?.country_code || ''));
    } catch (e) {
      if (e?.status === 404 || /Provider account not found/i.test(String(e?.message || ''))) {
        setProvider(null);
        setProviderStatus('');
      } else {
        setProviderError('Could not load tour guide status');
      }
    } finally {
      setProviderLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (initialProvider?.id) {
        await fetchProvider(initialProvider.id);
        return;
      }
      if (user?.uid) {
        await resolveProvider();
      }
    })();
  }, [initialProvider?.id, user?.uid]);

  const onLoadListing = async () => {
    const id = parseListingId(editLookup);
    if (!id) {
      Alert.alert(t('error', 'Error'), 'Enter a tour ID or link');
      return;
    }
    setSubmitting(true);
    try {
      const res = await getListing(id);
      if (!res?.id) {
        Alert.alert(t('error', 'Error'), 'Tour not found');
        return;
      }
      setEditingId(String(res.id));
      setTitle(String(res.title || ''));
      setDescription(String(res.description || ''));
      setCategory(String(res.category || 'tour'));
      setCity(String(res.city || provider?.base_city || ''));
      setCountry(String(res.country_code || provider?.country_code || ''));
      setDuration(res.duration_minutes ? String(res.duration_minutes) : '');
      setPriceFrom(res.price_from ? String(res.price_from) : '');
      setCurrency(String(res.currency || 'USD'));
      setCoverImageUrl(String(res.cover_image_url || res.coverImageUrl || ''));
      setStartDate(res.startDate ? String(res.startDate) : '');
      setEndDate(res.endDate ? String(res.endDate) : '');
      const loadedTags = Array.isArray(res.tags) ? res.tags : String(res.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
      setIsFreeTour(loadedTags.includes('free_tour'));
      setTags(loadedTags.filter((tag) => tag !== 'free_tour').join(','));
      setCreatedTour(null);
      Alert.alert('Loaded', 'Tour loaded. You can update, publish, or delete it.');
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const buildPayload = () => {
    const cleanTags = (tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : []).filter((tag) => tag !== 'free_tour');
    if (isFreeTour) cleanTags.push('free_tour');
    return {
      title: title.trim(),
      description: description.trim() ? description.trim() : undefined,
      category: category.trim(),
      city: city.trim(),
      country_code: country.trim().toUpperCase(),
      duration_minutes: duration ? Number(duration) : undefined,
      price_from: isFreeTour ? null : (priceFrom ? Number(priceFrom) : undefined),
      currency: isFreeTour ? null : (currency.trim() || 'USD'),
      cover_image_url: coverImageUrl.trim() ? coverImageUrl.trim() : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      tags: cleanTags,
    };
  };

  const validateBeforePublish = async () => {
    if (!provider?.id) {
      Alert.alert(t('error', 'Error'), 'Create a tour guide account before publishing tours');
      return false;
    }
    try {
      const latestProvider = await getCurrentProvider(user?.email || '');
      const latestStatus = normalizeProviderStatus(latestProvider);
      setProvider(latestProvider || provider);
      setProviderStatus(latestStatus || providerStatus);
      if (latestStatus !== 'approved') {
        Alert.alert(t('error', 'Error'), 'Your tour guide account is under review. You can publish tours once approved.');
        return false;
      }
    } catch {
      Alert.alert(t('error', 'Error'), 'Could not validate provider');
      return false;
    }
    if (!title.trim() || !category.trim() || !city.trim() || !country.trim() || (!isFreeTour && !priceFrom.trim())) {
      Alert.alert(t('error', 'Error'), t('listing.missing_fields', 'Complete the required fields'));
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    const ok = await validateBeforePublish();
    if (!ok) return;
    setSubmitting(true);
    try {
      const body = { ...buildPayload(), status: 'published' };
      const created = await createListing(body);
      setCreatedTour(created || null);
      setEditingId(String(created?.id || ''));
      setEditLookup(buildPublicTourUrl(created || body));
      Alert.alert(
        String(created?.status || '').toLowerCase() === 'published' ? 'Tour published' : 'Tour saved',
        String(created?.status || '').toLowerCase() === 'published'
          ? 'Your public tour link is ready to share.'
          : 'Your tour was saved, but it is not public yet.'
      );
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async () => {
    if (!editingId) return;
    const ok = await validateBeforePublish();
    if (!ok) return;
    setSubmitting(true);
    try {
      const updated = await updateListing(String(editingId), buildPayload());
      setCreatedTour(updated || { id: editingId, title, city, status: isFreeTour ? 'published' : 'published' });
      Alert.alert('Updated', 'Your tour has been updated');
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!editingId) return;
    Alert.alert('Delete tour', 'Are you sure you want to delete this tour?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await deleteListing(String(editingId));
            Alert.alert('Deleted', 'Tour removed');
            resetForm();
          } catch (e) {
            Alert.alert(t('error', 'Error'), String(e?.message || e));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const canPublish = provider && normalizedStatus === 'approved';

  const publicTourUrl = createdTour ? buildPublicTourUrl(createdTour) : '';
  const createdTourStatus = String(createdTour?.status || '').toLowerCase();

  const onOpenPublicTour = async () => {
    if (!publicTourUrl) return;
    try {
      await Linking.openURL(publicTourUrl);
    } catch {
      Alert.alert('Link error', 'Could not open the public tour link.');
    }
  };

  const onSharePublicTour = async () => {
    if (!publicTourUrl) return;
    try {
      await Share.share({ message: publicTourUrl, url: publicTourUrl, title: createdTour?.title || 'WadaTrip tour' });
    } catch {
      Alert.alert('Share error', 'Could not share the public tour link.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BrandHeader title="Create Tour" subtitle="Build one clear offer, publish it fast, and start getting traveler bookings." />

      <BrandCard style={styles.statusCard}>
        <View style={[styles.statusBadge, statusMeta.tone]}>
          <Text style={styles.statusBadgeText}>{statusMeta.title}</Text>
        </View>
        <Text style={styles.statusText}>{statusMeta.copy}</Text>
        {!!providerError ? <Text style={styles.errorText}>{providerError}</Text> : null}
        {!!provider?.id ? <Text style={styles.metaText}>Host account linked to your signed-in profile</Text> : null}
        {canPublish ? (
          <Text style={styles.metaText}>{normalizedLevel === 'licensed' ? 'Verified licensed tour guide' : 'Community tour guide'}</Text>
        ) : null}
      </BrandCard>

      {!provider ? (
        <BrandCard style={styles.lockCard}>
          <Text style={styles.lockTitle}>You need a tour guide account first</Text>
          <Text style={styles.lockText}>Apply as a tour guide or tour operator, wait for approval, then return here to publish tours.</Text>
          <BrandButton title="Become a tour guide" onPress={() => navigation.navigate('ProviderSignup')} style={styles.primaryButton} />
        </BrandCard>
      ) : null}

      {provider && normalizedStatus === 'rejected' ? (
        <BrandCard style={styles.lockCard}>
          <Text style={styles.lockTitle}>Your application needs changes</Text>
          <Text style={styles.lockText}>Update the application first. Publishing stays locked until the new submission is approved.</Text>
          <BrandButton title="Update Application" onPress={() => navigation.navigate('ProviderSignup', { provider })} style={styles.secondaryButton} />
        </BrandCard>
      ) : null}

      {provider && normalizedStatus && normalizedStatus !== 'approved' && normalizedStatus !== 'rejected' ? (
        <BrandCard style={styles.lockCard}>
          <Text style={styles.lockTitle}>Publishing is locked for now</Text>
          <Text style={styles.lockText}>You can prepare the details mentally, but the actual tour form only opens after approval.</Text>
          <BrandButton title="Refresh Status" onPress={resolveProvider} style={styles.secondaryButton} />
        </BrandCard>
      ) : null}

      {canPublish ? (
        <>
          <BrandCard style={styles.workflowCard}>
            <Text style={styles.workflowEyebrow}>Tour guide workspace</Text>
            <Text style={styles.workflowTitle}>{editingId ? 'You are editing a live offer' : 'Start with one strong tour, not a giant catalog'}</Text>
            <Text style={styles.workflowText}>
              Travelers scan fast. Lead with one city, one clear promise, one visible starting price, and what they actually get.
            </Text>
            <View style={styles.workflowSteps}>
              <View style={styles.workflowStep}>
                <View style={[styles.workflowDot, styles.workflowDotWarm]} />
                <Text style={styles.workflowStepText}>Step 1: Basics</Text>
              </View>
              <View style={styles.workflowStep}>
                <View style={[styles.workflowDot, styles.workflowDotMint]} />
                <Text style={styles.workflowStepText}>Step 2: Price and timing</Text>
              </View>
              <View style={styles.workflowStep}>
                <View style={[styles.workflowDot, styles.workflowDotBerry]} />
                <Text style={styles.workflowStepText}>Step 3: Publish safely</Text>
              </View>
            </View>
          </BrandCard>

          <BrandCard style={styles.earningsCard}>
            <Text style={styles.sectionEyebrow}>Host economics</Text>
            <Text style={styles.sectionTitle}>Price it so travelers understand it fast.</Text>
            <Text style={styles.sectionText}>WadaTrip takes 15%. Keep the visible price simple and think in take-home earnings, not hidden complexity.</Text>
            <View style={styles.earningsGrid}>
              <View style={styles.earningsPill}>
                <Text style={styles.previewLabel}>Traveler pays</Text>
                <Text style={styles.previewValue}>{isFreeTour ? 'Pay what you want' : (priceFrom.trim() ? `${String(currency || 'USD').toUpperCase()} ${priceFrom.trim()}` : 'Set price')}</Text>
              </View>
              <View style={styles.earningsPill}>
                <Text style={styles.previewLabel}>You keep</Text>
                <Text style={styles.previewValue}>{isFreeTour ? 'No checkout first' : (hostPayout ? `${String(currency || 'USD').toUpperCase()} ${hostPayout}` : 'Set price')}</Text>
              </View>
              <View style={styles.earningsPill}>
                <Text style={styles.previewLabel}>Marketplace fee</Text>
                <Text style={styles.previewValue}>15%</Text>
              </View>
            </View>
          </BrandCard>

          <BrandCard style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Optional</Text>
            <Text style={styles.sectionTitle}>Load an existing tour</Text>
            <Text style={styles.sectionText}>Paste a tour ID or public link to update or delete that listing.</Text>
            <BrandInput style={styles.input} value={editLookup} onChangeText={setEditLookup} placeholder="Tour ID or link" autoCapitalize="none" />
            <BrandButton title={submitting ? 'Loading...' : 'Load tour'} onPress={onLoadListing} disabled={submitting} style={styles.secondaryButton} />
          </BrandCard>

          <BrandCard style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Step 1</Text>
            <Text style={styles.sectionTitle}>{editingId ? 'Update the essentials' : 'Write the sellable basics first'}</Text>
            <Text style={styles.sectionText}>A good title plus one specific description beats a long vague form. Travelers should understand the offer in seconds.</Text>

            <Text style={styles.label}>{t('listing.title', 'Tour title')}</Text>
            <BrandInput style={styles.input} value={title} onChangeText={setTitle} placeholder="City walking tour" />

            <Text style={styles.label}>{t('listing.description', 'Description')}</Text>
            <BrandInput style={[styles.input, styles.multiInput]} value={description} onChangeText={setDescription} placeholder="Describe your experience" multiline />

            <Text style={styles.label}>{t('listing.category', 'Category')}</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((item) => (
                <TouchableOpacity key={item} style={[styles.categoryChip, category === item && styles.categoryChipActive]} onPress={() => setCategory(item)}>
                  <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('listing.city', 'City')}</Text>
            <BrandInput style={styles.input} value={city} onChangeText={setCity} placeholder="Cancun" />

            <Text style={styles.label}>{t('listing.country', 'Country (ISO-2)')}</Text>
            <BrandInput style={styles.input} value={country} onChangeText={setCountry} placeholder="US" autoCapitalize="characters" maxLength={2} />
          </BrandCard>

          <BrandCard style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Step 2</Text>
            <Text style={styles.sectionTitle}>Set the offer and schedule</Text>
            <Text style={styles.sectionText}>Use real availability and a clean starting price. If the price feels confusing, travelers leave.</Text>

            <Text style={styles.label}>Tour type</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.categoryChip, !isFreeTour && styles.categoryChipActive]} onPress={() => setIsFreeTour(false)}>
                <Text style={[styles.categoryChipText, !isFreeTour && styles.categoryChipTextActive]}>Paid experience</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.categoryChip, isFreeTour && styles.categoryChipActive]} onPress={() => setIsFreeTour(true)}>
                <Text style={[styles.categoryChipText, isFreeTour && styles.categoryChipTextActive]}>Free walking tour</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helper}>
              {isFreeTour
                ? 'Travelers will see a join flow instead of checkout. Use this for pay-what-you-want experiences.'
                : 'Travelers will pay online from the public tour page.'}
            </Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>{t('listing.duration', 'Duration (minutes)')}</Text>
                <BrandInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="120" keyboardType="numeric" />
              </View>
              {!isFreeTour ? (
                <View style={styles.col}>
                  <Text style={styles.label}>{t('listing.price_min', 'Minimum price')}</Text>
                  <BrandInput style={styles.input} value={priceFrom} onChangeText={setPriceFrom} placeholder="39" keyboardType="numeric" />
                </View>
              ) : null}
            </View>

            {!isFreeTour ? (
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>{t('listing.currency', 'Currency')}</Text>
                  <BrandInput style={styles.input} value={currency} onChangeText={setCurrency} placeholder="USD" autoCapitalize="characters" />
                </View>
              </View>
            ) : null}
            <Text style={styles.helper}>This tour is linked to your approved guide account automatically. No internal code needed.</Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>{t('listing.start_date', 'Start date')}</Text>
                <BrandInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>{t('listing.end_date', 'End date')}</Text>
                <BrandInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>

            <Text style={styles.label}>{t('listing.tags', 'Tags')}</Text>
            <BrandInput style={styles.input} value={tags} onChangeText={setTags} placeholder="history,nature,food" />

            <Text style={styles.label}>Cover image URL (optional)</Text>
            <BrandInput style={styles.input} value={coverImageUrl} onChangeText={setCoverImageUrl} placeholder="https://..." autoCapitalize="none" />
            <Text style={styles.helper}>Use a public image URL for the main tour cover. If you skip this, travelers may see the destination cover instead.</Text>
          </BrandCard>

          {createdTour ? (
            <BrandCard style={styles.publishCard}>
              <Text style={styles.sectionEyebrow}>Tour status</Text>
              <Text style={styles.sectionTitle}>{createdTourStatus === 'published' ? 'Tour published successfully' : 'Tour saved for more work'}</Text>
              <Text style={styles.sectionText}>
                {createdTourStatus === 'published'
                  ? 'This is the public link travelers should open and share.'
                  : 'The listing is saved, but it is not live yet. Keep editing until it is ready to publish.'}
              </Text>
              {publicTourUrl ? (
                <View style={styles.previewPill}>
                  <Text style={styles.previewLabel}>Public tour link</Text>
                  <Text style={styles.publicLinkText}>{publicTourUrl}</Text>
                </View>
              ) : null}
              {createdTourStatus === 'published' ? (
                <>
                  <BrandButton title="Open public tour" onPress={onOpenPublicTour} style={styles.primaryButton} />
                  <BrandButton title="Share public link" onPress={onSharePublicTour} style={styles.secondaryButton} />
                </>
              ) : null}
              <BrandButton title="Create another tour" onPress={resetForm} style={styles.secondaryButton} />
            </BrandCard>
          ) : null}

          <BrandCard style={styles.publishCard}>
            <Text style={styles.sectionEyebrow}>Step 3</Text>
            <Text style={styles.sectionTitle}>{editingId ? 'Save or remove this tour' : 'Review and publish'}</Text>
            <Text style={styles.sectionText}>
              {formReady
                ? 'Your core fields are filled. Publish only when the title, city and price match exactly what you want travelers to book.'
                : 'Fill the title, city, country and minimum price before publishing.'}
            </Text>
            <View style={styles.previewRail}>
              <View style={styles.previewPill}>
                <Text style={styles.previewLabel}>Title</Text>
                <Text style={styles.previewValue}>{title.trim() || 'Not set'}</Text>
              </View>
              <View style={styles.previewPill}>
                <Text style={styles.previewLabel}>City</Text>
                <Text style={styles.previewValue}>{city.trim() || 'Not set'}</Text>
              </View>
              <View style={styles.previewPill}>
                <Text style={styles.previewLabel}>From</Text>
                <Text style={styles.previewValue}>
                  {isFreeTour ? 'Pay what you want' : (priceFrom.trim() ? `${String(currency || 'USD').toUpperCase()} ${priceFrom.trim()}` : 'Not set')}
                </Text>
              </View>
            </View>

            {editingId ? (
              <>
                <BrandButton title={submitting ? 'Updating...' : 'Update tour'} onPress={onUpdate} disabled={submitting} style={styles.primaryButton} />
                <BrandButton title="Delete tour" onPress={onDelete} disabled={submitting} style={styles.dangerButton} />
                <BrandButton title="Cancel edit" onPress={resetForm} disabled={submitting} style={styles.secondaryButton} />
              </>
            ) : (
              <BrandButton title={submitting ? t('listing.publishing', 'Publishing...') : (isFreeTour ? 'Publish free tour' : 'Publish to travelers')} onPress={onSubmit} disabled={submitting} style={styles.primaryButton} />
            )}
          </BrandCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dff3f1' },
  content: { paddingBottom: 40 },
  statusCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 24 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  statusBadgeText: { fontSize: 13, fontFamily: brand.typography.heading },
  statusText: { color: brand.colors.textMuted, marginTop: 10, lineHeight: 20, fontFamily: brand.typography.body },
  statusApproved: { backgroundColor: '#ccfbf1' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusRejected: { backgroundColor: '#fee2e2' },
  statusNeutral: { backgroundColor: '#e0f2fe' },
  errorText: { color: '#b02a37', marginTop: 8, fontFamily: brand.typography.heading },
  metaText: { color: brand.colors.textMuted, marginTop: 8, fontFamily: brand.typography.heading },
  workflowCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: '#fff8fc', borderColor: '#ebd4e2' },
  workflowEyebrow: { color: brand.colors.secondary, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  workflowTitle: { color: brand.colors.deep, fontSize: 22, lineHeight: 28, marginTop: 6, letterSpacing: -0.4, fontFamily: brand.typography.display },
  workflowText: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  workflowSteps: { marginTop: 14, gap: 10 },
  workflowStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workflowDot: { width: 10, height: 10, borderRadius: 999 },
  workflowDotWarm: { backgroundColor: brand.colors.accent },
  workflowDotMint: { backgroundColor: brand.colors.primary },
  workflowDotBerry: { backgroundColor: brand.colors.secondary },
  workflowStepText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  earningsCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: '#fff8f1', borderColor: '#f3dfcd' },
  earningsGrid: { gap: 10, marginTop: 14 },
  earningsPill: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#f0dcc8' },
  lockCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  lockTitle: { color: brand.colors.deep, fontSize: 20, fontFamily: brand.typography.heading },
  lockText: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  sectionCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  publishCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: '#fffaf5', borderColor: '#f0dcc8' },
  sectionEyebrow: { color: '#0f766e', fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: brand.typography.heading },
  sectionTitle: { color: brand.colors.deep, fontSize: 22, lineHeight: 28, marginTop: 6, fontFamily: brand.typography.display },
  sectionText: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  label: { color: brand.colors.deep, marginTop: 14, marginBottom: 6, fontFamily: brand.typography.heading },
  input: { marginBottom: 0 },
  helper: { color: brand.colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18, fontFamily: brand.typography.body },
  multiInput: { minHeight: 104, textAlignVertical: 'top', paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#dbe5ef' },
  categoryChipActive: { backgroundColor: '#ccfbf1', borderColor: '#5eead4' },
  categoryChipText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  categoryChipTextActive: { color: '#0f766e' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  previewRail: { gap: 10, marginTop: 14 },
  previewPill: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#f0dcc8' },
  previewLabel: { color: brand.colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: brand.typography.heading },
  previewValue: { color: brand.colors.deep, marginTop: 4, fontFamily: brand.typography.heading },
  publicLinkText: { color: brand.colors.deep, marginTop: 6, lineHeight: 20, fontFamily: brand.typography.body },
  primaryButton: { marginTop: 18, borderRadius: 16, backgroundColor: brand.colors.primary },
  secondaryButton: { marginTop: 14, borderRadius: 16, backgroundColor: brand.colors.accent },
  dangerButton: { marginTop: 14, borderRadius: 16, backgroundColor: brand.colors.secondary },
});
