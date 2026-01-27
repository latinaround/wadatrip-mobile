import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createListing, getProvider, getListing, updateListing, deleteListing } from '../lib/api';

export default function CreateListingScreen({ route, navigation }) {
  const { t } = useTranslation();
  const initialProvider = (route?.params && route.params.provider) || null;
  const [providerId, setProviderId] = useState(String(initialProvider?.id || ''));
  const [providerStatus, setProviderStatus] = useState(String(initialProvider?.status || ''));
  const [accessCode, setAccessCode] = useState('');
  const [editLookup, setEditLookup] = useState('');
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tour'); // tour|activity|transfer|custom
  const [city, setCity] = useState(String(initialProvider?.base_city || ''));
  const [country, setCountry] = useState(String(initialProvider?.country_code || ''));
  const [duration, setDuration] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parseListingId = (input) => {
    const raw = String(input || '').trim();
    if (!raw) return '';
    const cleaned = raw.split('?')[0].split('#')[0];
    const parts = cleaned.split('/');
    const last = parts[parts.length - 1] || '';
    return last.trim();
  };

  const resetForm = () => {
    setEditingId('');
    setEditLookup('');
    setTitle('');
    setDescription('');
    setCategory('tour');
    setCity(String(initialProvider?.base_city || ''));
    setCountry(String(initialProvider?.country_code || ''));
    setDuration('');
    setPriceFrom('');
    setCurrency('USD');
    setStartDate('');
    setEndDate('');
    setTags('');
  };

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
      if (res.provider_id) setProviderId(String(res.provider_id));
      setTitle(String(res.title || ''));
      setDescription(String(res.description || ''));
      setCategory(String(res.category || 'tour'));
      setCity(String(res.city || ''));
      setCountry(String(res.country_code || ''));
      setDuration(res.duration_minutes ? String(res.duration_minutes) : '');
      setPriceFrom(res.price_from ? String(res.price_from) : '');
      setCurrency(String(res.currency || 'USD'));
      setStartDate(res.startDate ? String(res.startDate) : '');
      setEndDate(res.endDate ? String(res.endDate) : '');
      setTags(Array.isArray(res.tags) ? res.tags.join(',') : String(res.tags || ''));
      Alert.alert('Loaded', 'Tour loaded. You can update or delete it.');
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async () => {
    if (!editingId) return;
    if (!accessCode.trim()) {
      Alert.alert(t('error', 'Error'), t('listing.access_code_required', 'Access code is required'));
      return;
    }
    if (!title || !category || !city || !country) {
      Alert.alert(t('error', 'Error'), t('listing.missing_fields', 'Complete the required fields'));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        provider_id: String(providerId),
        title: title.trim(),
        description: description ? description.trim() : undefined,
        category: category.trim(),
        city: city.trim(),
        country_code: country.trim().toUpperCase(),
        duration_minutes: duration ? Number(duration) : undefined,
        price_from: priceFrom ? Number(priceFrom) : undefined,
        currency: currency.trim() || 'USD',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tags: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        access_code: accessCode.trim(),
      };
      await updateListing(String(editingId), body);
      Alert.alert('Updated', 'Your tour has been updated');
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!editingId) return;
    if (!accessCode.trim()) {
      Alert.alert(t('error', 'Error'), t('listing.access_code_required', 'Access code is required'));
      return;
    }
    Alert.alert('Delete tour', 'Are you sure you want to delete this tour?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await deleteListing(String(editingId), accessCode.trim());
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

  const fetchProvider = async (id) => {
    if (!id) return;
    try {
      const p = await getProvider(String(id));
      setProviderStatus(String(p.status || ''));
      if (!city) setCity(String(p.base_city || ''));
      if (!country) setCountry(String(p.country_code || ''));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { if (providerId && !providerStatus) fetchProvider(providerId); }, []);

  const onSubmit = async () => {
    if (!accessCode.trim()) {
      Alert.alert(t('error', 'Error'), t('listing.access_code_required', 'Access code is required'));
      return;
    }
    if (!providerId) { Alert.alert(t('error', 'Error'), t('listing.enter_provider_id', 'Enter your Provider ID')); return; }
    try {
      const p = await getProvider(String(providerId));
      const status = String(p.status || '');
      if (status !== 'verified') {
        Alert.alert(t('error', 'Error'), t('listing.must_verified', 'Your account must be verified by an admin before publishing tours.'));
        return;
      }
    } catch (e) {
      Alert.alert(t('error', 'Error'), 'Could not validate provider');
      return;
    }
    if (!title || !category || !city || !country) { Alert.alert(t('error', 'Error'), t('listing.missing_fields', 'Complete the required fields')); return; }
    setSubmitting(true);
    try {
      const body = {
        provider_id: String(providerId),
        title: title.trim(),
        description: description ? description.trim() : undefined,
        category: category.trim(),
        city: city.trim(),
        country_code: country.trim().toUpperCase(),
        duration_minutes: duration ? Number(duration) : undefined,
        price_from: priceFrom ? Number(priceFrom) : undefined,
        currency: currency.trim() || 'USD',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tags: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        status: 'published',
        access_code: accessCode.trim(),
      };
      const res = await createListing(body);
      Alert.alert(t('success', 'Success'), t('listing.published_ok', 'Your tour has been created'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.container, { paddingBottom: 160, minHeight: '100%' }]}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
      keyboardShouldPersistTaps="handled"
      overScrollMode="always"
    >
      <Text style={styles.title}>{t('listing.create_title', 'Create a tour')}</Text>
      <Text style={styles.subtitle}>{t('listing.subtitle', 'Publish a new experience for travelers. Required fields are marked.')}</Text>

      <Text style={styles.sectionTitle}>Edit existing tour (optional)</Text>
      <Text style={styles.helper}>Paste a tour ID or link, then load it to update.</Text>
      <TextInput style={styles.input} value={editLookup} onChangeText={setEditLookup} placeholder="Tour ID or link" autoCapitalize='none' />
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onLoadListing} disabled={submitting}>
        <Text style={styles.buttonText}>Load tour</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{t('listing.provider_id', 'Provider ID')}</Text>
      <TextInput style={styles.input} value={providerId} onChangeText={setProviderId} placeholder="prov_..." autoCapitalize='none' editable={!editingId} />
      {!!providerStatus && (
        <Text style={[styles.hint, providerStatus === 'verified' ? styles.verified : styles.pending]}>{t('listing.status', 'Status')}: {providerStatus}</Text>
      )}

      <Text style={styles.label}>{t('listing.access_code', 'Access code')}</Text>
      <TextInput style={styles.input} value={accessCode} onChangeText={setAccessCode} placeholder="WADA2026" autoCapitalize='characters' />
      <Text style={styles.helper}>{t('listing.access_code_hint', 'Use the code provided by Wadatrip to publish tours.')}</Text>

      <Text style={styles.label}>{t('listing.title', 'Tour title')}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="City walking tour" />

      <Text style={styles.label}>{t('listing.description', 'Description')}</Text>
      <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} placeholder="Describe your experience" multiline />

      <Text style={styles.label}>{t('listing.category', 'Category')}</Text>
      <View style={styles.row}>
        {['tour','activity','transfer','custom'].map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('listing.city', 'City')}</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Cancun" />

      <Text style={styles.label}>{t('listing.country', 'Country (ISO-2)')}</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="US" autoCapitalize='characters' maxLength={2} />

      <Text style={styles.label}>{t('listing.duration', 'Duration (minutes)')}</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="120" keyboardType='numeric' />

      <Text style={styles.label}>{t('listing.price_min', 'Minimum price')}</Text>
      <TextInput style={styles.input} value={priceFrom} onChangeText={setPriceFrom} placeholder="39" keyboardType='numeric' />

      <Text style={styles.label}>{t('listing.currency', 'Currency')}</Text>
      <TextInput style={styles.input} value={currency} onChangeText={setCurrency} placeholder="USD" autoCapitalize='characters' />

      <Text style={styles.label}>{t('listing.start_date', 'Start date (optional)')}</Text>
      <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>{t('listing.end_date', 'End date (optional)')}</Text>
      <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>{t('listing.tags', 'Tags (comma)')}</Text>
      <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="history,nature" />

      {editingId ? (
        <>
          <TouchableOpacity style={[styles.button, styles.primary, submitting && { opacity: 0.6 }]} onPress={onUpdate} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? 'Updating...' : 'Update tour'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.danger, submitting && { opacity: 0.6 }]} onPress={onDelete} disabled={submitting}>
            <Text style={styles.buttonText}>Delete tour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={resetForm} disabled={submitting}>
            <Text style={styles.buttonText}>Cancel edit</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={[styles.button, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? t('listing.publishing', 'Publishing...') : t('listing.publish', 'Publish tour')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fbfc' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { color: '#6c757d', marginBottom: 12 },
  sectionTitle: { fontWeight: '800', color: '#1d3557', marginTop: 8, marginBottom: 4 },
  label: { fontWeight: '700', color: '#0f172a', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, padding: 10 },
  helper: { color: '#6c757d', fontSize: 12, marginTop: 4 },
  hint: { marginTop: 4 },
  verified: { color: '#2a9d8f' },
  pending: { color: '#e67e22' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef2f7' },
  chipActive: { backgroundColor: '#00b8b8' },
  chipText: { color: '#1d3557', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: '#00b8b8', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  secondary: { backgroundColor: '#ff8a3d' },
  danger: { backgroundColor: '#ff2aa1' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
