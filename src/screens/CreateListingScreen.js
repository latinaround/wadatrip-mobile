import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createListing, getProvider } from '../lib/api';

export default function CreateListingScreen({ route, navigation }) {
  const { t } = useTranslation();
  const initialProvider = (route?.params && route.params.provider) || null;
  const [providerId, setProviderId] = useState(String(initialProvider?.id || ''));
  const [providerStatus, setProviderStatus] = useState(String(initialProvider?.status || ''));
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
      <Text style={styles.title}>{t('listing.create_title', 'Create Tour / Service')}</Text>

      <Text style={styles.label}>{t('listing.provider_id', 'Provider ID')}</Text>
      <TextInput style={styles.input} value={providerId} onChangeText={setProviderId} placeholder="prov_..." autoCapitalize='none' />
      {!!providerStatus && (
        <Text style={[styles.hint, providerStatus === 'verified' ? styles.verified : styles.pending]}>{t('listing.status', 'Status')}: {providerStatus}</Text>
      )}

      <Text style={styles.label}>{t('listing.title', 'Title')}</Text>
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

      <Text style={styles.label}>{t('listing.start_date', 'Start date')}</Text>
      <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>{t('listing.end_date', 'End date')}</Text>
      <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>{t('listing.tags', 'Tags (comma)')}</Text>
      <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="history,nature" />

      <TouchableOpacity style={[styles.button, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? t('listing.publishing', 'Publishing...') : t('listing.publish', 'Publish tour')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: '800', color: '#1d3557', marginBottom: 12 },
  label: { fontWeight: '700', color: '#1d3557', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, padding: 10 },
  hint: { marginTop: 4 },
  verified: { color: '#2a9d8f' },
  pending: { color: '#e67e22' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef2f7' },
  chipActive: { backgroundColor: '#2a9d8f' },
  chipText: { color: '#1d3557', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: '#2a9d8f', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
