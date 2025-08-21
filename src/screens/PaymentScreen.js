import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { CardField, useStripe, initStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { auth } from '../services/firebase';

const publishableKey = (Constants?.expoConfig?.extra?.stripe?.publishableKey) || 'pk_test_REPLACE_ME';

export default function PaymentScreen({ route, navigation }) {
  const { amount = 1000, currency = 'usd', description = 'Tour booking' } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  const { confirmPayment } = useStripe();

  useEffect(() => {
    initStripe({ publishableKey });
  }, []);

  const backend = process.env.EXPO_PUBLIC_COMMUNITY_API || 'http://localhost:8082';

  const pay = async () => {
    if (!name || !email) return Alert.alert('Missing info', 'Enter name and email');
    setLoading(true);
    try {
      const res = await fetch(`${backend}/payments/create-intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency, description }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || 'Failed');
      const clientSecret = json.clientSecret;
      const { error, paymentIntent } = await confirmPayment(clientSecret, { paymentMethodType: 'Card', paymentMethodData: { billingDetails: { name, email } } });
      if (error) throw new Error(error.message);
      Alert.alert('Success', 'Payment confirmed');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pay for Tour</Text>
      <Text style={styles.meta}>Amount: ${(amount/100).toFixed(2)} {currency.toUpperCase()}</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <CardField postalCodeEnabled={false} placeholders={{ number: '4242 4242 4242 4242' }} cardStyle={{ backgroundColor: '#fff', textColor: '#000' }} style={styles.card} />
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={pay} disabled={loading}><Text style={styles.buttonText}>{loading ? 'Processing…' : 'Pay'}</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557' },
  meta: { color: '#6c757d', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  card: { width: '100%', height: 50, marginVertical: 12 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primary: { backgroundColor: '#2a9d8f' },
  buttonText: { color: '#fff', fontWeight: '800' },
});

