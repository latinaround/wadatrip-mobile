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
          <LinearGradient colors={["#00c6c6", "#ff2aa1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.brandRow}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>WadaTrip</Text>
        </View>
        <Text style={styles.headerSubtitle}>Plan, alert, and explore smarter</Text>
        <View style={styles.modeRow}>
          <View style={styles.langIcon}>
            {Ionicons ? <Ionicons name="globe-outline" size={14} color="#fff" /> : null}
          </View>
          <View style={styles.modeChip}>
            <Text style={styles.modeText}>{String(((Constants && Constants.expoConfig && Constants.expoConfig.extra) || {}).API_MODE || (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_MODE : '') || 'live').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.baseHint} numberOfLines={1}>API: {resolvedApiBase()}</Text>
      </View>
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.tile, styles.c1]} onPress={() => navigation.navigate('Flights')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="airplane" size={20} color="#00b8b8" /> : null}
            <Text style={styles.tileTitle}>Flights</Text>
          </View>
          <Text style={styles.tileText}>Search & alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c2]} onPress={() => navigation.navigate('ToursDeals')}>
          <View style={styles.iconRow}>
            {MaterialCommunityIcons ? <MaterialCommunityIcons name="ticket-percent" size={20} color="#ff8a3d" /> : null}
            <Text style={styles.tileTitle}>Tours & Deals</Text>
          </View>
          <Text style={styles.tileText}>Best offers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c3]} onPress={() => navigation.navigate('MyAlerts')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="notifications" size={20} color="#ff2aa1" /> : null}
            <Text style={styles.tileTitle}>Price Alerts</Text>
          </View>
          <Text style={styles.tileText}>Track prices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c4]} onPress={() => navigation.navigate('Itinerary')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="map" size={20} color="#00b8b8" /> : null}
            <Text style={styles.tileTitle}>Itinerary</Text>
          </View>
          <Text style={styles.tileText}>Plan your trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c5]} onPress={() => navigation.navigate('Community')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="people" size={20} color="#ff8a3d" /> : null}
            <Text style={styles.tileTitle}>Community</Text>
          </View>
          <Text style={styles.tileText}>Tips & posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.c6]} onPress={() => navigation.navigate('MyAlerts')}>
          <View style={styles.iconRow}>
            {Ionicons ? <Ionicons name="list" size={20} color="#00b8b8" /> : null}
            <Text style={styles.tileTitle}>My Alerts</Text>
          </View>
          <Text style={styles.tileText}>Manage alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, styles.c7]} onPress={() => navigation.navigate('ProviderSignup')}>
          <View style={styles.iconRow}>
            {MaterialCommunityIcons ? <MaterialCommunityIcons name="account-plus" size={20} color="#ff2aa1" /> : null}
            <Text style={styles.tileTitle}>{t('home.become_provider', 'Become a guide / operator')}</Text>
          </View>
          <Text style={styles.tileText}>{t('home.become_provider_sub', 'Sign up and publish tours')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fbfc' },
  header: { backgroundColor: '#00c6c6', paddingTop: 36, paddingBottom: 26, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30 },
  headerTitle: { color: '#ffffff', fontWeight: '800', fontSize: 24, letterSpacing: 0.2 },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  modeRow: { position: 'absolute', right: 12, top: 34, flexDirection: 'row', alignItems: 'center', gap: 6 },
  langIcon: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  modeChip: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  modeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  baseHint: { position: 'absolute', left: 12, top: 36, color: 'rgba(255,255,255,0.85)', fontSize: 10, maxWidth: '60%' },
  grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', height: 120, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#edf2f7', borderRadius: 14, padding: 14, marginBottom: 12, justifyContent: 'center', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileTitle: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  tileText: { color: '#4b5563', marginTop: 4 },
  c1: { borderLeftWidth: 3, borderLeftColor: '#00b8b8' },
  c2: { borderLeftWidth: 3, borderLeftColor: '#ff8a3d' },
  c3: { borderLeftWidth: 3, borderLeftColor: '#ff2aa1' },
  c4: { borderLeftWidth: 3, borderLeftColor: '#00b8b8' },
  c5: { borderLeftWidth: 3, borderLeftColor: '#ff8a3d' },
  c6: { borderLeftWidth: 3, borderLeftColor: '#00b8b8' },
  c7: { borderLeftWidth: 3, borderLeftColor: '#ff2aa1' },
});
