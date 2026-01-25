import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createProvider } from '../lib/api';

export default function ProviderSignupScreen({ navigation }) {
  const { t } = useTranslation();
  const [type, setType] = useState('guide'); // 'guide' | 'operator'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [baseCity, setBaseCity] = useState('');
  const [country, setCountry] = useState('');
  const [languages, setLanguages] = useState(''); // comma-separated
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const onSubmit = async () => {
    if (!type || !name || !email || !baseCity || !country) {
      Alert.alert(t('error', 'Error'), t('provider.missing_fields', 'Please fill required fields'));
      return;
    }
    if (!accessCode.trim()) {
      Alert.alert(t('error', 'Error'), t('provider.access_code_required', 'Access code is required'));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        type: type === 'operator' ? 'operator' : 'guide',
        name: name.trim(),
        email: email.trim(),
        phone: phone ? String(phone).trim() : null,
        languages: languages ? languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
        base_city: baseCity.trim(),
        country_code: country.trim().toUpperCase(),
        access_code: accessCode.trim(),
      };
      const res = await createProvider(body);
      setCreated(res);
      Alert.alert(t('provider.submitted', 'Submitted'), t('provider.created_ok', 'Your profile was created. Pending verification.'));
    } catch (e) {
      Alert.alert(t('error', 'Error'), String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
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
      <Text style={styles.title}>{t('provider.title', 'Become a guide')}</Text>
      <Text style={styles.subtitle}>{t('provider.subtitle', 'Create your operator profile to start publishing tours.')}</Text>

      <Text style={styles.label}>{t('provider.type', 'Account type')}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.chip, type === 'guide' && styles.chipActive]} onPress={() => setType('guide')}>
          <Text style={[styles.chipText, type === 'guide' && styles.chipTextActive]}>{t('provider.guide', 'Guide')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, type === 'operator' && styles.chipActive]} onPress={() => setType('operator')}>
          <Text style={[styles.chipText, type === 'operator' && styles.chipTextActive]}>{t('provider.operator', 'Operator')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{t('provider.name', 'Display name')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('provider.name', 'Your brand or guide name')} />

      <Text style={styles.label}>{t('provider.email', 'Email')}</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@domain.com" keyboardType="email-address" autoCapitalize='none' />

      <Text style={styles.label}>{t('provider.phone_optional', 'Phone (optional)')}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555 123 4567" keyboardType='phone-pad' />

      <Text style={styles.label}>{t('provider.base_city', 'Base city')}</Text>
      <TextInput style={styles.input} value={baseCity} onChangeText={setBaseCity} placeholder="Lima" />

      <Text style={styles.label}>{t('provider.country', 'Country (ISO-2)')}</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="US, MX, CL..." autoCapitalize='characters' maxLength={2} />

      <Text style={styles.label}>{t('provider.languages', 'Languages (optional)')}</Text>
      <TextInput style={styles.input} value={languages} onChangeText={setLanguages} placeholder="en, es, fr" />

      <Text style={styles.label}>{t('provider.access_code', 'Access code')}</Text>
      <TextInput
        style={styles.input}
        value={accessCode}
        onChangeText={setAccessCode}
        placeholder="WADA2026"
        autoCapitalize="characters"
      />
      <Text style={styles.helper}>{t('provider.access_code_hint', 'Use the code provided by Wadatrip to submit your profile.')}</Text>

      <TouchableOpacity style={[styles.button, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? t('provider.submit', 'Submit') : t('provider.submit', 'Submit')}</Text>
      </TouchableOpacity>

      {created ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('provider.created_title', 'Registration created')}</Text>
          <Text style={styles.resultText}>{t('provider.created_id', 'ID')}: {String(created.id)}</Text>
          <Text style={styles.resultText}>{t('provider.created_status', 'Status')}: {String(created.status)}</Text>
          <Text style={styles.resultHint}>{t('provider.created_hint', 'We will verify your profile. Once approved, you can publish tours.')}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#2a9d8f', marginTop: 8 }]} onPress={() => navigation.navigate('CreateListing', { provider: created })}>
            <Text style={styles.buttonText}>{t('provider.create_first_tour', 'Create my first tour')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8f9fa' },
  title: { fontSize: 22, fontWeight: '800', color: '#1d3557', marginBottom: 4 },
  subtitle: { color: '#6c757d', marginBottom: 12 },
  label: { fontWeight: '700', color: '#1d3557', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, padding: 10 },
  helper: { color: '#6c757d', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef2f7' },
  chipActive: { backgroundColor: '#2a9d8f' },
  chipText: { color: '#1d3557', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: '#e63946', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '700' },
  resultBox: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', padding: 12, marginTop: 16 },
  resultTitle: { fontWeight: '800', color: '#1d3557', marginBottom: 6 },
  resultText: { color: '#495057' },
  resultHint: { color: '#6c757d', marginTop: 4 },
});
