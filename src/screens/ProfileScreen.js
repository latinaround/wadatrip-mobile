import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { auth } from '../services/firebase';
import { ensureUserProfile, getUserProfile } from '../services/userProfile';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (user?.uid) {
        const p = await getUserProfile(user.uid);
        if (p) {
          if (p.displayName && !displayName) setDisplayName(p.displayName);
          if (p.photoURL && !photoURL) setPhotoURL(p.photoURL);
        }
      }
    })();
  }, []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Profile</Text>
      <View style={styles.avatarRow}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{(displayName || 'U').charAt(0).toUpperCase()}</Text></View>
        )}
      </View>

      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <Text style={styles.label}>Photo URL</Text>
      <TextInput style={styles.input} value={photoURL} onChangeText={setPhotoURL} placeholder="https://..." autoCapitalize="none" />

      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>

      {/* Quick test payment entry */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#3a86ff' }]}
        onPress={() => navigation.navigate('Payment', { amount: 1999, currency: 'usd', description: 'Test tour booking' })}
      >
        <Text style={styles.buttonText}>Test Payment ($19.99)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', marginBottom: 12 },
  label: { color: '#1d3557', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  primary: { backgroundColor: '#2a9d8f' },
  buttonText: { color: '#fff', fontWeight: '800' },
  avatarRow: { alignItems: 'center', marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: '#ced4da', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
});
