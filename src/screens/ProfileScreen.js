import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { auth } from '../services/firebase';
import { ensureUserProfile, getUserProfile } from '../services/userProfile';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { searchListings } from '../lib/api';

export default function ProfileScreen({ navigation }) {
  const { i18n } = useTranslation();
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [providerId, setProviderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [tours, setTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [toursError, setToursError] = useState('');

  useEffect(() => {
    (async () => {
      if (user?.uid) {
        const p = await getUserProfile(user.uid);
        if (p) {
          if (p.displayName && !displayName) setDisplayName(p.displayName);
          if (p.photoURL && !photoURL) setPhotoURL(p.photoURL);
          if (p.providerId) setProviderId(String(p.providerId));
        }
      }
    })();
  }, []);

  const loadMyTours = async (id) => {
    const pid = String(id || '').trim();
    if (!pid) {
      setTours([]);
      return;
    }
    setLoadingTours(true);
    setToursError('');
    try {
      const items = await searchListings({ provider_id: pid, status: 'published', limit: 50 });
      setTours(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error('Load tours error', e);
      setToursError('Could not load tours');
    } finally {
      setLoadingTours(false);
    }
  };

  const onSave = async () => {
    if (!user) return;
    if (!displayName) return Alert.alert('Name required', 'Please enter a display name');
    setSaving(true);
    try {
      await updateProfile(user, { displayName, photoURL: photoURL || null });
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || null,
        displayName,
        photoURL: photoURL || null,
        providerId: providerId ? String(providerId).trim() : null,
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
        setPhotoURL(result.assets[0].uri);
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
      <Text style={styles.header}>My Profile</Text>
      <View style={styles.avatarRow}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{(displayName || 'U').charAt(0).toUpperCase()}</Text></View>
        )}
      </View>

      <Text style={styles.label}>Guide name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your guide name" />
      <Text style={styles.label}>Photo URL</Text>
      <TextInput style={styles.input} value={photoURL} onChangeText={setPhotoURL} placeholder="https://..." autoCapitalize="none" />
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onPickImage}>
        <Text style={styles.buttonText}>Choose photo</Text>
      </TouchableOpacity>
      <Text style={styles.helperText}>Local image only. Use a URL for cross-device sharing.</Text>
      <Text style={styles.label}>Provider ID</Text>
      <TextInput style={styles.input} value={providerId} onChangeText={setProviderId} placeholder="cmk..." autoCapitalize="none" />
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => loadMyTours(providerId)} disabled={loadingTours}>
        <Text style={styles.buttonText}>{loadingTours ? 'Loading...' : 'Load my tours'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Language</Text>
      <View style={styles.langRow}>
        {[
          { code: 'en', label: 'English' },
          { code: 'es', label: 'Español' },
          { code: 'fr', label: 'Français' },
          { code: 'zh', label: '中文' },
        ].map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langChip, i18n.language === lang.code && styles.langChipActive]}
            onPress={() => i18n.changeLanguage(lang.code)}
          >
            <Text style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving.' : 'Save'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My tours</Text>
      {loadingTours ? (
        <ActivityIndicator style={{ marginTop: 8 }} />
      ) : toursError ? (
        <Text style={styles.errorText}>{toursError}</Text>
      ) : tours.length ? (
        tours.map((tour) => (
          <View key={tour.id} style={styles.tourCard}>
            <Text style={styles.tourTitle}>{tour.title}</Text>
            <Text style={styles.tourMeta}>{tour.city} · {tour.currency || 'USD'} {tour.price_from || ''}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.helperText}>No tours loaded yet.</Text>
      )}

      {/* Quick test payment entry */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#ff2aa1' }]}
        onPress={() => navigation.navigate('Payment', { amount: 1999, currency: 'usd', description: 'Test tour booking' })}
      >
        <Text style={styles.buttonText}>Test Payment ($19.99)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', marginBottom: 12 },
  label: { color: '#1d3557', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  primary: { backgroundColor: '#00b8b8' },
  secondary: { backgroundColor: '#ff8a3d' },
  buttonText: { color: '#fff', fontWeight: '800' },
  avatarRow: { alignItems: 'center', marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: '#ced4da', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  sectionTitle: { marginTop: 16, fontWeight: '800', color: '#1d3557' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  langChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#eef2f7' },
  langChipActive: { backgroundColor: '#00b8b8' },
  langText: { color: '#1d3557', fontWeight: '700' },
  langTextActive: { color: '#fff' },
  tourCard: { marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: '#fff' },
  tourTitle: { fontWeight: '800', color: '#1d3557' },
  tourMeta: { color: '#6c757d', marginTop: 4 },
  helperText: { color: '#6c757d', marginTop: 8 },
  errorText: { color: '#b02a37', marginTop: 8 },
});

