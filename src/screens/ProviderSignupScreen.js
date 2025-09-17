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
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const onSubmit = async () => {
    if (!type || !name || !email || !baseCity || !country) {
      Alert.alert(t('error', 'Error'), t('provider.missing_fields', 'Please fill required fields'));
      return;
    }
    setSubmitting(true);
    try {
      const docs = [];
      if (doc1) docs.push({ doc_type: 'other', url: String(doc1) });
      if (doc2) docs.push({ doc_type: 'other', url: String(doc2) });
      const body = {
        type: type === 'operator' ? 'operator' : 'guide',
        name: name.trim(),
        email: email.trim(),
        phone: phone ? String(phone).trim() : null,
        languages: languages ? languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
        base_city: baseCity.trim(),
        country_code: country.trim().toUpperCase(),
        documents: docs.length ? docs : undefined,
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
      <Text style={styles.title}>{t('provider.title', 'Become a guide / operator')}</Text>

      <Text style={styles.label}>{t('provider.type', 'Type')}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.chip, type === 'guide' && styles.chipActive]} onPress={() => setType('guide')}>
          <Text style={[styles.chipText, type === 'guide' && styles.chipTextActive]}>{t('provider.guide', 'Guide')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, type === 'operator' && styles.chipActive]} onPress={() => setType('operator')}>
          <Text style={[styles.chipText, type === 'operator' && styles.chipTextActive]}>{t('provider.operator', 'Operator')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{t('provider.name', 'Operator/Guide name')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('provider.name', 'Operator/Guide name')} />

      <Text style={styles.label}>{t('provider.email', 'Email')}</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@domain.com" keyboardType="email-address" autoCapitalize='none' />

      <Text style={styles.label}>{t('provider.phone_optional', 'Phone (optional)')}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555 123 4567" keyboardType='phone-pad' />

      <Text style={styles.label}>{t('provider.base_city', 'Base city')}</Text>
      <TextInput style={styles.input} value={baseCity} onChangeText={setBaseCity} placeholder="City" />

      <Text style={styles.label}>{t('provider.country', 'Country (ISO-2)')}</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="US, MX, CL..." autoCapitalize='characters' maxLength={2} />

      <Text style={styles.label}>{t('provider.languages', 'Languages (comma separated)')}</Text>
      <TextInput style={styles.input} value={languages} onChangeText={setLanguages} placeholder="en,es,fr" />

      <Text style={styles.label}>{t('provider.documents', 'Documents / certificates (URLs)')}</Text>
      <TextInput style={styles.input} value={doc1} onChangeText={setDoc1} placeholder={t('provider.doc_placeholder1', 'https://... (license, ID, etc.)')} autoCapitalize='none' />
      <TextInput style={styles.input} value={doc2} onChangeText={setDoc2} placeholder={t('provider.doc_placeholder2', 'https://... (optional)')} autoCapitalize='none' />

      <TouchableOpacity style={[styles.button, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? t('provider.submit', 'Submit') : t('provider.submit', 'Submit')}</Text>
      </TouchableOpacity>

      {created ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('provider.created_title', 'Registration created')}</Text>
          <Text style={styles.resultText}>{t('provider.created_id', 'ID')}: {String(created.id)}</Text>
          <Text style={styles.resultText}>{t('provider.created_status', 'Status')}: {String(created.status)}</Text>
          <Text style={styles.resultHint}>{t('provider.created_hint', 'After an admin verifies you, you can publish tours.')}</Text>
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
  title: { fontSize: 20, fontWeight: '800', color: '#1d3557', marginBottom: 12 },
  label: { fontWeight: '700', color: '#1d3557', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 8, padding: 10 },
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
