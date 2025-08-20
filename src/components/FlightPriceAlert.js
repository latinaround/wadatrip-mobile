import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const FlightPriceAlert = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureDate: new Date(),
    budget: '',
    maxWaitTime: '168', // 1 week in hours
    userEmail: '',
  });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { origin, destination, departureDate, budget, userEmail } = formData;
    if (!origin || !destination || !departureDate || !budget || !userEmail) {
      Alert.alert('Error', t('price_alerts.validation_required_fields'));
      return false;
    }
    if (parseFloat(budget) <= 0) {
      Alert.alert('Error', t('price_alerts.validation_budget_positive'));
      return false;
    }
    return true;
  };

  const handleCreateAlert = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newAlert = {
        id: Date.now().toString(),
        ...formData,
        status: 'active',
        createdAt: new Date(),
      };
      
      setActiveAlerts(prev => [...prev, newAlert]);
      
      // Reset form
      setFormData({
        origin: '',
        destination: '',
        departureDate: new Date(),
        budget: '',
        maxWaitTime: '168',
        userEmail: '',
      });
      
      Alert.alert(
        t('price_alerts.alert_created_success'),
        t('price_alerts.alert_created_success')
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create alert');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAlert = (alertId) => {
    Alert.alert(
      t('price_alerts.cancel_alert_btn'),
      'Are you sure you want to cancel this alert?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
            Alert.alert('Success', t('price_alerts.alert_cancelled_success'));
          },
        },
      ]
    );
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || formData.departureDate;
    setShowDatePicker(Platform.OS === 'ios');
    handleInputChange('departureDate', currentDate);
  };

  const timeOptions = [
    { label: t('price_alerts.time_1_hour'), value: '1' },
    { label: t('price_alerts.time_6_hours'), value: '6' },
    { label: t('price_alerts.time_12_hours'), value: '12' },
    { label: t('price_alerts.time_24_hours'), value: '24' },
    { label: t('price_alerts.time_48_hours'), value: '48' },
    { label: t('price_alerts.time_72_hours'), value: '72' },
    { label: t('price_alerts.time_1_week'), value: '168' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('price_alerts.title')}</Text>
        <Text style={styles.subtitle}>{t('price_alerts.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('price_alerts.origin_label')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('price_alerts.origin_placeholder')}
            value={formData.origin}
            onChangeText={(value) => handleInputChange('origin', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('price_alerts.destination_label')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('price_alerts.destination_placeholder')}
            value={formData.destination}
            onChangeText={(value) => handleInputChange('destination', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('price_alerts.departure_date_label')} *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {formData.departureDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={formData.departureDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('price_alerts.budget_label')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="500"
            value={formData.budget}
            onChangeText={(value) => handleInputChange('budget', value)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('price_alerts.max_wait_time_label')} *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.maxWaitTime}
              style={styles.picker}
              onValueChange={(value) => handleInputChange('maxWaitTime', value)}
            >
              {timeOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('price_alerts.email_label')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('price_alerts.email_placeholder')}
            value={formData.userEmail}
            onChangeText={(value) => handleInputChange('userEmail', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
          onPress={handleCreateAlert}
          disabled={isCreating}
        >
          <Text style={styles.submitButtonText}>
            {isCreating ? t('price_alerts.creating_btn') : t('price_alerts.create_btn')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeAlerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.alertsTitle}>{t('price_alerts.active_alerts_title')}</Text>
          {activeAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertRoute}>
                  {alert.origin} → {alert.destination}
                </Text>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelAlert(alert.id)}
                >
                  <Text style={styles.cancelButtonText}>
                    {t('price_alerts.cancel_alert_btn')}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.alertDetail}>
                {t('price_alerts.budget_label_card')} ${alert.budget}
              </Text>
              <Text style={styles.alertDetail}>
                {t('price_alerts.departure_date_label')}: {new Date(alert.departureDate).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {activeAlerts.length === 0 && (
        <View style={styles.noAlertsContainer}>
          <Text style={styles.noAlertsText}>{t('price_alerts.no_alerts_message')}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertsSection: {
    margin: 10,
  },
  alertsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  alertCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertRoute: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noAlertsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noAlertsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FlightPriceAlert;