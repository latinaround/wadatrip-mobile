import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import WadaAgent from '../components/WadaAgent';
import flightPriceMonitor from '../services/flightPriceMonitor';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged en App.js manejará la navegación a Auth
    } catch (e) {
      console.error('Error al cerrar sesión', e);
    }
  };

  useEffect(() => {
    // --- Inicio: Demostración del sistema de alertas de precios ---
    const testPriceAlert = async () => {
      console.log('--- Creando alerta de precios de prueba ---');
      
      const alertData = {
        origin: 'Madrid',
        destination: 'Tokio',
        departureDate: '2024-12-15',
        budget: 750,
        maxWaitTime: 0.1, // Esperar solo 6 minutos para la demostración
        userEmail: 'test@wadatrip.com',
      };

      try {
        const monitorId = await flightPriceMonitor.createPriceMonitor(alertData);
        console.log(`Alerta de prueba creada con ID: ${monitorId}`);
        
        // Opcional: Mostrar alertas activas en la consola
        setTimeout(() => {
          const activeMonitors = flightPriceMonitor.getActiveMonitors();
          console.log('Alertas activas:', activeMonitors);
        }, 2000);
        
      } catch (error) {
        console.error('Error al crear la alerta de prueba:', error);
      }
    };

    // Ejecutar la demostración
    testPriceAlert();
    
    // Limpiar monitores al desmontar el componente (opcional)
    return () => {
      // flightPriceMonitor.cleanup();
    };
    // --- Fin: Demostración del sistema de alertas de precios ---
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>WadaTrip</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>{t('logout', 'Cerrar sesión')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>{t('your_travel_companion', 'Your Travel Companion')}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quick_actions', 'Quick Actions')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Flights')}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#0077b6' }]}> 
                <Text style={styles.quickActionIcon}>✈️</Text>
              </View>
              <Text style={styles.quickActionText}>{t('flights.title', 'Flights')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Tours')}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#f77f00' }]}> 
                <Text style={styles.quickActionIcon}>🧭</Text>
              </View>
              <Text style={styles.quickActionText}>{t('tours.title', 'Tours & Deals')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#fca311' }]}>
                <Text style={styles.quickActionIcon}>🔔</Text>
              </View>
              <Text style={styles.quickActionText}>{t('flightAlert.title', 'Price Alerts')}</Text>
              <Text style={styles.quickActionSubtitle}>{t('flightAlert.active', { count: 0 })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Itinerary')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#2a9d8f' }]}>
                <Text style={styles.quickActionIcon}>📋</Text>
              </View>
              <Text style={styles.quickActionText}>{t('itinerary.title', 'Itinerary')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Community')}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#e76f51' }]}>
                <Text style={styles.quickActionIcon}>🌍</Text>
              </View>
              <Text style={styles.quickActionText}>{t('community.title', 'Explore')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('explore', 'Explore')}</Text>
          <View style={styles.exploreList}>
            <TouchableOpacity style={styles.exploreItem} onPress={() => navigation.navigate('Flights')}>
              <Text style={styles.exploreIcon}>💺</Text>
              <View style={styles.exploreTextContainer}>
                <Text style={styles.exploreTitle}>{t('flightAlert.title', 'Flight Price Alerts')}</Text>
                <Text style={styles.exploreSubtitle}>{t('flightAlert.subtitle', 'Get notifications when prices change')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exploreItem} onPress={() => navigation.navigate('Tours')}>
              <Text style={styles.exploreIcon}>📅</Text>
              <View style={styles.exploreTextContainer}>
                <Text style={styles.exploreTitle}>{t('tours.title', 'Tours & Deals')}</Text>
                <Text style={styles.exploreSubtitle}>{t('tours.subtitle', 'Best-ranked tours for your budget')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exploreItem} onPress={() => navigation.navigate('Itinerary')}>
              <Text style={styles.exploreIcon}>📋</Text>
              <View style={styles.exploreTextContainer}>
                <Text style={styles.exploreTitle}>{t('itinerary.title', 'Itinerary')}</Text>
                <Text style={styles.exploreSubtitle}>{t('itinerary.subtitle', 'Plan and organize your perfect trip')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exploreItem} onPress={() => navigation.navigate('Community')}>
              <Text style={styles.exploreIcon}>👥</Text>
              <View style={styles.exploreTextContainer}>
                <Text style={styles.exploreTitle}>{t('community.title', 'Community')}</Text>
                <Text style={styles.exploreSubtitle}>{t('community.subtitle', 'Connect with fellow travelers')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <WadaAgent />
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
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'left',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d3557',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 20,
  },
  quickActionIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionIcon: {
    fontSize: 30,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d3557',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 3,
  },
  exploreList: {},
  exploreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  exploreIcon: {
    fontSize: 22,
    marginRight: 15,
    color: '#457b9d',
  },
  exploreTextContainer: {
    flex: 1,
  },
  exploreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d3557',
  },
  exploreSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 4,
  },
});

export default HomeScreen;
