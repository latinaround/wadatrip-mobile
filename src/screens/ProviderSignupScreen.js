import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createProvider, normalizeProviderStatus } from '../lib/api';
import { auth } from '../services/firebase';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import BrandInput from '../components/brand/BrandInput';
import { brand } from '../theme/brand';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
];

const CITY_OPTIONS = [
  'New York',
  'Los Angeles',
  'Miami',
  'Mexico City',
  'Cancun',
  'Lima',
  'Bogota',
  'Madrid',
  'Barcelona',
  'Paris',
  'Rome',
  'Tokyo',
];

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'MX', name: 'Mexico' },
  { code: 'PE', name: 'Peru' },
  { code: 'CO', name: 'Colombia' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
];

export default function ProviderSignupScreen({ navigation, route }) {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const initialProvider = route?.params?.provider || null;
  const [type, setType] = useState(initialProvider?.type === 'operator' ? 'operator' : 'guide');
  const [name, setName] = useState(String(initialProvider?.name || ''));
  const [email, setEmail] = useState(String(initialProvider?.email || user?.email || ''));
  const [phone, setPhone] = useState(String(initialProvider?.phone || ''));
  const [instagramHandle, setInstagramHandle] = useState(String(initialProvider?.instagram_handle || ''));
  const [bioShort, setBioShort] = useState(String(initialProvider?.bio_short || ''));
  const [photoUrl, setPhotoUrl] = useState(String(initialProvider?.photo_url || user?.photoURL || ''));
  const [baseCity, setBaseCity] = useState(String(initialProvider?.base_city || ''));
  const [cityQuery, setCityQuery] = useState(String(initialProvider?.base_city || ''));
  const [country, setCountry] = useState(String(initialProvider?.country_code || ''));
  const [countryQuery, setCountryQuery] = useState(String(initialProvider?.country_code || ''));
  const [languages, setLanguages] = useState(Array.isArray(initialProvider?.languages) ? initialProvider.languages : []);
  const [languageQuery, setLanguageQuery] = useState('');
  const [licenseUrl, setLicenseUrl] = useState(String(initialProvider?.license_url || ''));
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(initialProvider);

  const languageSuggestions = useMemo(() => {
    const q = String(languageQuery || '').trim().toLowerCase();
    if (!q) return [];
    return LANGUAGE_OPTIONS.filter((item) => {
      const searchable = `${item.label} ${item.code}`.toLowerCase();
      return searchable.includes(q) && !languages.includes(item.code);
    }).slice(0, 6);
  }, [languageQuery, languages]);

  const citySuggestions = useMemo(() => {
    const q = String(cityQuery || baseCity || '').trim().toLowerCase();
    if (!q) return [];
    return CITY_OPTIONS.filter((item) => item.toLowerCase().includes(q) && item.toLowerCase() !== String(baseCity || '').trim().toLowerCase()).slice(0, 6);
  }, [cityQuery, baseCity]);

  const countrySuggestions = useMemo(() => {
    const q = String(countryQuery || country || '').trim().toLowerCase();
    if (!q) return [];
    return COUNTRY_OPTIONS.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q)).slice(0, 6);
  }, [countryQuery, country]);

  const isValidUrl = (value) => {
    if (!value) return true;
    return /^https?:\/\/\S+$/i.test(String(value).trim());
  };

  const addLanguage = (code) => {
    setLanguages((prev) => (prev.includes(code) ? prev : [...prev, code]));
    setLanguageQuery('');
  };

  const removeLanguage = (code) => setLanguages((prev) => prev.filter((item) => item !== code));

  const onSubmit = async () => {
    if (!type || !name.trim() || !email.trim() || !baseCity.trim() || !country.trim()) {
      Alert.alert(t('error', 'Error'), t('provider.missing_fields', 'Please fill required fields'));
      return;
    }
    if (!isValidUrl(licenseUrl) || !isValidUrl(attachmentUrl)) {
      Alert.alert(t('error', 'Error'), 'Use a valid URL starting with http:// or https://');
      return;
    }

    setSubmitting(true);
    try {
      const documents = [];
      if (licenseUrl.trim()) documents.push({ doc_type: 'license', url: licenseUrl.trim() });
      if (attachmentUrl.trim()) documents.push({ doc_type: 'attachment', url: attachmentUrl.trim() });

      const body = {
        type: type === 'operator' ? 'operator' : 'guide',
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        instagram_handle: instagramHandle.trim() ? instagramHandle.trim().replace(/^@+/, '') : null,
        bio_short: bioShort.trim() ? bioShort.trim() : null,
        photo_url: photoUrl.trim() ? photoUrl.trim() : null,
        languages,
        base_city: baseCity.trim(),
        country_code: country.trim().toUpperCase(),
        status: 'pending',
        verified_level: 'community',
        license_url: licenseUrl.trim() ? licenseUrl.trim() : null,
        documents,
      };

      const res = await createProvider(body);
      setCreated(res);
      Alert.alert(
        t('provider.submitted', 'Submitted'),
        t('provider.created_ok', 'Your profile was created. Pending verification.')
      );
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const statusText = created?.status ? String(created.status) : initialProvider?.status ? String(initialProvider.status) : 'pending';
  const normalizedCreatedStatus = normalizeProviderStatus(created || initialProvider);
  const isResubmission = Boolean(initialProvider?.id);
  const guideLabel = type === 'operator' ? 'tour operator' : 'tour guide';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BrandHeader title="Host on WadaTrip" subtitle="Apply once, get reviewed, then start selling tours to travelers." />

      <BrandCard style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Host earnings</Text>
        <Text style={styles.heroTitle}>Publish tours, reach travelers, and keep 85% of each booking.</Text>
        <Text style={styles.heroText}>WadaTrip reviews every host before publishing. That keeps traveler trust high and gives approved hosts a cleaner marketplace to sell in.</Text>
      </BrandCard>

      <BrandCard style={styles.infoCard}>
        <Text style={styles.sectionEyebrow}>How it works</Text>
        <Text style={styles.infoTitle}>You do not need a giant setup to start.</Text>
        <View style={styles.infoSteps}>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>1</Text>
            <View style={styles.infoStepCopy}>
              <Text style={styles.infoStepTitle}>Apply as a host</Text>
              <Text style={styles.infoStepText}>Tell us who you are, where you operate, and how travelers can reach you.</Text>
            </View>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>2</Text>
            <View style={styles.infoStepCopy}>
              <Text style={styles.infoStepTitle}>Get reviewed</Text>
              <Text style={styles.infoStepText}>We manually review hosts so travelers only see trusted tour guides and operators.</Text>
            </View>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>3</Text>
            <View style={styles.infoStepCopy}>
              <Text style={styles.infoStepTitle}>Publish and earn</Text>
              <Text style={styles.infoStepText}>Once approved, you can publish tours, get bookings, and manage them from the same account.</Text>
            </View>
          </View>
        </View>
      </BrandCard>

      <BrandCard style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Step 1</Text>
        <Text style={styles.sectionTitle}>Choose how you host</Text>
        <Text style={styles.sectionText}>Pick the role that matches how you sell experiences today. You can still start small and add more later.</Text>

        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.typeChip, type === 'guide' && styles.typeChipActive]} onPress={() => setType('guide')}>
            <Text style={[styles.typeChipText, type === 'guide' && styles.typeChipTextActive]}>{t('provider.guide', 'Tour guide')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeChip, type === 'operator' && styles.typeChipActive]} onPress={() => setType('operator')}>
            <Text style={[styles.typeChipText, type === 'operator' && styles.typeChipTextActive]}>{t('provider.operator', 'Tour operator')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{type === 'guide' ? 'Tour guide name' : 'Tour operator name'}</Text>
        <BrandInput style={styles.input} value={name} onChangeText={setName} placeholder={type === 'guide' ? 'How travelers will know you' : 'How travelers will know your brand'} />

        <Text style={styles.label}>{t('provider.email', 'Email')}</Text>
        <BrandInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@domain.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.helper}>This is linked to your signed-in account. Use the contact details you want WadaTrip to use during review.</Text>

        <Text style={styles.label}>{t('provider.phone_optional', 'Phone (optional)')}</Text>
        <BrandInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555 123 4567" keyboardType="phone-pad" />

        <Text style={styles.label}>Instagram (optional)</Text>
        <BrandInput style={styles.input} value={instagramHandle} onChangeText={setInstagramHandle} placeholder="@yourhandle" autoCapitalize="none" />

        <Text style={styles.label}>Guide photo URL (optional)</Text>
        <BrandInput style={styles.input} value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." autoCapitalize="none" />
        <Text style={styles.helper}>Use a public photo URL. If you signed in with Google, your current profile photo can work here too.</Text>

        <Text style={styles.label}>Short bio (optional)</Text>
        <BrandInput style={styles.input} value={bioShort} onChangeText={setBioShort} placeholder="Why travelers should book with you" multiline />
      </BrandCard>

      <BrandCard style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Step 2</Text>
        <Text style={styles.sectionTitle}>Where you host and who you serve</Text>
        <Text style={styles.sectionText}>Travelers decide fast. Your city, country, and languages help them trust that your tours are relevant and bookable.</Text>

        <Text style={styles.label}>{t('provider.base_city', 'Base city')}</Text>
        <BrandInput
          style={styles.input}
          value={baseCity}
          onChangeText={(text) => {
            setBaseCity(text);
            setCityQuery(text);
          }}
          placeholder="Lima"
        />
        {citySuggestions.length ? (
          <View style={styles.suggestionsBox}>
            {citySuggestions.map((item) => (
              <TouchableOpacity key={`city-${item}`} style={styles.suggestionItem} onPress={() => { setBaseCity(item); setCityQuery(item); }}>
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>{t('provider.country', 'Country (ISO-2)')}</Text>
        <BrandInput
          style={styles.input}
          value={countryQuery || country}
          onChangeText={(text) => {
            setCountryQuery(text);
            const upper = text.trim().toUpperCase();
            if (upper.length === 2) setCountry(upper);
          }}
          placeholder="Type country or code"
          autoCapitalize="words"
        />
        {countrySuggestions.length ? (
          <View style={styles.suggestionsBox}>
            {countrySuggestions.map((item) => (
              <TouchableOpacity key={`country-${item.code}`} style={styles.suggestionItem} onPress={() => { setCountry(item.code); setCountryQuery(`${item.name} (${item.code})`); }}>
                <Text style={styles.suggestionText}>{item.name} ({item.code})</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <Text style={styles.helper}>Selected country code: {country || '-'}</Text>

        <Text style={styles.label}>{t('provider.languages', 'Languages (optional)')}</Text>
        <BrandInput style={styles.input} value={languageQuery} onChangeText={setLanguageQuery} placeholder="Type a language or code" autoCapitalize="none" />
        {languageSuggestions.length ? (
          <View style={styles.suggestionsBox}>
            {languageSuggestions.map((item) => (
              <TouchableOpacity key={`lang-${item.code}`} style={styles.suggestionItem} onPress={() => addLanguage(item.code)}>
                <Text style={styles.suggestionText}>{item.label} ({item.code})</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={styles.tagWrap}>
          {languages.map((code) => (
            <TouchableOpacity key={`selected-${code}`} style={styles.selectedTag} onPress={() => removeLanguage(code)}>
              <Text style={styles.selectedTagText}>{code.toUpperCase()} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BrandCard>

      <BrandCard style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Step 3</Text>
        <Text style={styles.sectionTitle}>Trust details</Text>
        <Text style={styles.sectionText}>Add supporting links if you already have them. Do not get blocked here. Manual review still decides approval, so no internal code is needed.</Text>

        <Text style={styles.label}>License URL (optional)</Text>
        <BrandInput style={styles.input} value={licenseUrl} onChangeText={setLicenseUrl} placeholder="https://..." autoCapitalize="none" />

        <Text style={styles.label}>Attachment URL (optional)</Text>
        <BrandInput style={styles.input} value={attachmentUrl} onChangeText={setAttachmentUrl} placeholder="https://..." autoCapitalize="none" />
        <Text style={styles.helper}>What matters most is that your profile is accurate enough for review.</Text>

        <BrandButton title={submitting ? 'Submitting...' : isResubmission ? 'Resubmit host profile' : 'Apply as a host'} onPress={onSubmit} disabled={submitting} style={styles.primaryButton} />
      </BrandCard>

      {created ? (
        <BrandCard style={styles.resultCard}>
          <Text style={styles.resultEyebrow}>Host profile saved</Text>
          <Text style={styles.resultTitle}>Status: {statusText}</Text>
          <Text style={styles.resultText}>Provider ID: {String(created.id || initialProvider?.id || '-')}</Text>
          <Text style={styles.resultHint}>
            {normalizedCreatedStatus === 'approved'
              ? `Your ${guideLabel} account is approved. You can publish tours now.`
              : normalizedCreatedStatus === 'rejected'
                ? `Your ${guideLabel} application needs changes before you can publish tours.`
                : `Use Profile to track review. Create Tour stays locked until your ${guideLabel} account is approved.`}
          </Text>
          <BrandButton
            title={normalizedCreatedStatus === 'approved' ? 'Create my first tour' : 'Go to Profile'}
            onPress={() => navigation.navigate(normalizedCreatedStatus === 'approved' ? 'CreateListing' : 'Profile', normalizedCreatedStatus === 'approved' ? { provider: created } : undefined)}
            style={styles.secondaryButton}
          />
        </BrandCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dff3f1' },
  content: { paddingBottom: 40 },
  heroCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, backgroundColor: '#0f172a', borderColor: '#1e293b' },
  heroEyebrow: { color: '#67e8f9', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '800', marginTop: 8 },
  heroText: { color: '#cbd5e1', marginTop: 10, lineHeight: 21 },
  infoCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: '#fff8f1', borderColor: '#f3dfcd' },
  infoTitle: { color: brand.colors.deep, fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 6 },
  infoSteps: { marginTop: 14, gap: 12 },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoStepNumber: { width: 28, height: 28, borderRadius: 999, overflow: 'hidden', textAlign: 'center', lineHeight: 28, backgroundColor: brand.colors.accent, color: '#fff', fontWeight: '800' },
  infoStepCopy: { flex: 1 },
  infoStepTitle: { color: brand.colors.deep, fontWeight: '700' },
  infoStepText: { color: brand.colors.textMuted, marginTop: 4, lineHeight: 19 },
  sectionCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  sectionEyebrow: { color: '#0f766e', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionTitle: { color: brand.colors.deep, fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 6 },
  sectionText: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20 },
  label: { color: brand.colors.deep, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { marginBottom: 0 },
  helper: { color: brand.colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbe5ef',
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#ccfbf1', borderColor: '#5eead4' },
  typeChipText: { color: brand.colors.deep, fontWeight: '700' },
  typeChipTextActive: { color: '#0f766e' },
  suggestionsBox: { marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionText: { color: brand.colors.deep, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  selectedTag: { backgroundColor: '#0f766e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  selectedTagText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  primaryButton: { marginTop: 18, borderRadius: 16, backgroundColor: brand.colors.primary },
  resultCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: '#effcf7', borderColor: '#a7f3d0' },
  resultEyebrow: { color: '#0f766e', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  resultTitle: { color: brand.colors.deep, fontSize: 20, fontWeight: '800', marginTop: 6 },
  resultText: { color: brand.colors.deep, marginTop: 8, fontWeight: '600' },
  resultHint: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20 },
  secondaryButton: { marginTop: 16, borderRadius: 16, backgroundColor: brand.colors.accent },
});
