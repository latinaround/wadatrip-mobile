import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { resolvedApiBase } from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {LinearGradient ? (
          <LinearGradient colors={["#2a9d8f", "#3a86ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.brandRow}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>WadaTrip</Text>
        </View>
        <Text style={styles.headerSubtitle}>Plan, alert, and explore smarter</Text>
        <View style={styles.modeChip}>
          <Text style={styles.modeText}>{String(((Constants && Constants.expoConfig && Constants.expoConfig.extra) || {}).API_MODE || (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_MODE : '') || 'live').toUpperCase()}</Text>
        </View>
        <Text style={styles.baseHint} numberOfLines={1}>API: {resolvedApiBase()}</Text>
      </View>
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.tile, styles.c1]} onPress={() => navigation.navigate('Flights')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="airplane" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>Flights</Text>
          </View>
          <Text style={styles.tileText}>Search & alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c2]} onPress={() => navigation.navigate('ToursDeals')}>
          <View style={styles.iconRow}>
            {MaterialCommunityIcons ? <MaterialCommunityIcons name="ticket-percent" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>Tours & Deals</Text>
          </View>
          <Text style={styles.tileText}>Best offers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c3]} onPress={() => navigation.navigate('MyAlerts')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="notifications" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>Price Alerts</Text>
          </View>
          <Text style={styles.tileText}>Track prices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c4]} onPress={() => navigation.navigate('Itinerary')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="map" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>Itinerary</Text>
          </View>
          <Text style={styles.tileText}>Plan your trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c5]} onPress={() => navigation.navigate('Community')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="people" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>Community</Text>
          </View>
          <Text style={styles.tileText}>Tips & posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c6]} onPress={() => navigation.navigate('MyAlerts')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="list" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>My Alerts</Text>
          </View>
          <Text style={styles.tileText}>Manage alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, styles.c7]} onPress={() => navigation.navigate('ProviderSignup')}>
          <View style={styles.iconRow}>
            {MaterialCommunityIcons ? <MaterialCommunityIcons name="account-plus" size={20} color="#1d3557" /> : null}
            <Text style={styles.tileTitle}>{t('home.become_provider', 'Become a guide / operator')}</Text>
          </View>
          <Text style={styles.tileText}>{t('home.become_provider_sub', 'Sign up and publish tours')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#457b9d', paddingTop: 30, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 28, height: 28 },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 22 },
  headerSubtitle: { color: '#e9f5ff', marginTop: 4 },
  modeChip: { position: 'absolute', right: 12, top: 30, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  modeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  baseHint: { position: 'absolute', left: 12, top: 32, color: '#e9f5ff', fontSize: 10, maxWidth: '60%' },
  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', height: 120, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12, padding: 12, marginBottom: 12, justifyContent: 'center', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileTitle: { color: '#1d3557', fontWeight: '800', fontSize: 16 },
  tileText: { color: '#6c757d', marginTop: 4 },
  c1: { backgroundColor: '#e3f2fd' },
  c2: { backgroundColor: '#e8f5e9' },
  c3: { backgroundColor: '#fff3e0' },
  c4: { backgroundColor: '#f3e5f5' },
  c5: { backgroundColor: '#e0f7fa' },
  c6: { backgroundColor: '#fce4ec' },
  c7: { backgroundColor: '#e8f0ff' },
});
