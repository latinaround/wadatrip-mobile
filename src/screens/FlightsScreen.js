import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import flightPriceMonitor from '../services/flightPriceMonitor';

export default function FlightsScreen() {
  const [origin, setOrigin] = useState('San Francisco');
  const [destination, setDestination] = useState('Tokyo');
  const [budget, setBudget] = useState('500');
  const [date, setDate] = useState(''); // opcional
  const [flexHours, setFlexHours] = useState('168'); // 1 semana por defecto

  const parseNumber = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const onCreateAlert = async () => {
    const user = auth.currentUser;
    if (!origin || !destination) return Alert.alert('Missing fields', 'Origin and destination are required');
    const b = parseNumber(budget);
    if (b == null || b <= 0) return Alert.alert('Budget', 'Enter a valid budget');
    const hours = parseNumber(flexHours) || 168;

    try {
      // Guardar en Firestore para persistencia
      await addDoc(collection(db, 'flightAlerts'), {
        uid: user?.uid || null,
        origin,
        destination,
        budget: b,
        maxWaitHours: hours,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // (Opcional) activar monitor local simulado
      try {
        await flightPriceMonitor.createPriceMonitor({
          origin,
          destination,
          budget: b,
          maxWaitTime: hours / 24, // servicio usa días aprox
          userEmail: user?.email || 'user@wadatrip.com',
        });
      } catch (e) {
        // Ignorar si falla el mock
      }

      Alert.alert('Done', 'Your flight alert has been created');
    } catch (e) {
      console.error('Error creating flight alert', e);
      Alert.alert('Error', 'Could not create the alert');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Itineraries — Flight Alerts</Text>
      <Text style={styles.label}>Location From</Text>
      <TextInput style={styles.input} placeholder="Origin city / airport" value={origin} onChangeText={setOrigin} />
      <Text style={styles.label}>To</Text>
      <TextInput style={styles.input} placeholder="Destination city / airport" value={destination} onChangeText={setDestination} />
      <Text style={styles.label}>Budget (USD)</Text>
      <TextInput style={styles.input} placeholder="$500" keyboardType="numeric" value={budget} onChangeText={setBudget} />
      <Text style={styles.label}>Date (optional)</Text>
      <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />

      <Text style={styles.label}>Flexibility time to find</Text>
      <View style={styles.flexGrid}>
        <TouchableOpacity style={[styles.flexBtn, flexHours === '24' && styles.flexBtnActive]} onPress={() => setFlexHours('24')}><Text style={[styles.flexBtnText, flexHours === '24' && styles.flexBtnTextActive]}>1 hr – 24 hrs</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.flexBtn, flexHours === '72' && styles.flexBtnActive]} onPress={() => setFlexHours('72')}><Text style={[styles.flexBtnText, flexHours === '72' && styles.flexBtnTextActive]}>1 day – 3 days</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.flexBtn, flexHours === '168' && styles.flexBtnActive]} onPress={() => setFlexHours('168')}><Text style={[styles.flexBtnText, flexHours === '168' && styles.flexBtnTextActive]}>3 days – 1 week</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.flexBtn, flexHours === '720' && styles.flexBtnActive]} onPress={() => setFlexHours('720')}><Text style={[styles.flexBtnText, flexHours === '720' && styles.flexBtnTextActive]}>1 month</Text></TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Search hours (custom)" keyboardType="numeric" value={flexHours} onChangeText={setFlexHours} />

      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onCreateAlert}>
        <Text style={styles.buttonText}>Create alert</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1d3557', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  label: { color: '#1d3557', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  flexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  flexBtn: { backgroundColor: '#eef2f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  flexBtnActive: { backgroundColor: '#2a9d8f' },
  flexBtnText: { color: '#1d3557', fontWeight: '600' },
  flexBtnTextActive: { color: '#fff' },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primary: { backgroundColor: '#2a9d8f' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
