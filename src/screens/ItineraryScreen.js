import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const ItineraryScreen = () => {
  const { t } = useTranslation();
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');

  const handleCreateAlert = () => {
    if (!location || !email) {
      Alert.alert(
        t('error', 'Error'),
        t('fill_all_fields', 'Please fill in all fields.')
      );
      return;
    }
    // Lógica para crear la alerta aquí
    Alert.alert(
      t('success', 'Success'),
      t('alert_created_message', 'Alert for {{location}} will be sent to {{email}}.', { location, email })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('itinerary.title', 'Itinerary')}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.promoText}>
          {t('itinerary_promo', 'Create an alert for the best itinerary deals!')}
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('location', 'Location')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('enter_location', 'Enter a location')}
            value={location}
            onChangeText={setLocation}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('email', 'Email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('enter_email', 'Enter your email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleCreateAlert}>
          <Text style={styles.buttonText}>{t('create_alert', 'Create Alert')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#457b9d',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  promoText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#1d3557',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d3557',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#e63946',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ItineraryScreen;