import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Image } from 'react-native';
import { auth, db } from '../services/firebase';
import { addDoc, collection, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getUserProfile } from '../services/userProfile';

export default function CommunityScreen() {
  const [location, setLocation] = useState('Tokyo');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (u?.uid) setProfile((await getUserProfile(u.uid)) || { displayName: u.displayName, photoURL: u.photoURL });
    })();
    if (!location) return;
    const q = query(
      collection(db, 'communityMessages'),
      where('location', '==', location),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setMessages(rows);
    });
    return () => unsub();
  }, [location]);

  const send = async () => {
    const user = auth.currentUser;
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'communityMessages'), {
        uid: user?.uid || null,
        displayName: profile?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'traveler'),
        photoURL: profile?.photoURL || user?.photoURL || null,
        location,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (e) {
      console.error('Error enviando mensaje', e);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community by location</Text>
      <TextInput style={styles.input} placeholder="Location (e.g. Tokyo)" value={location} onChangeText={setLocation} />

      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.msgAvatar} />
            ) : (
              <View style={[styles.msgAvatar, styles.msgAvatarPlaceholder]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{(item.displayName || 'U').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.msg}>
              <Text style={styles.msgFrom}>{item.displayName}</Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Be the first!</Text>}
        contentContainerStyle={messages.length ? styles.list : styles.listEmpty}
      />

      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Write a message" value={text} onChangeText={setText} />
        <TouchableOpacity style={styles.send} onPress={send}><Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1d3557', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  list: { paddingVertical: 8 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#6c757d' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  msgAvatarPlaceholder: { backgroundColor: '#adb5bd', alignItems: 'center', justifyContent: 'center' },
  msg: { backgroundColor: '#fff', padding: 10, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1, flex: 1 },
  msgFrom: { fontWeight: '700', color: '#1d3557', marginBottom: 2 },
  msgText: { color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center' },
  send: { backgroundColor: '#457b9d', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginLeft: 8 },
});
