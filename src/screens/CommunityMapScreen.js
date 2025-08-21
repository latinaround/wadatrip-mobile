import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { getLocationsOverview } from '../services/communityAnalyticsApi';

let MapView;
try {
  // Lazy require to avoid crash if react-native-maps not installed
  // eslint-disable-next-line global-require
  MapView = require('react-native-maps').default;
} catch (e) {
  MapView = null;
}

export default function CommunityMapScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getLocationsOverview(7);
        setData(res.locations || {});
      } catch (e) {
        setData({});
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <View style={styles.container}><ActivityIndicator /></View>;

  // Fallback list when MapView is unavailable
  if (!MapView) {
    const rows = Object.entries(data || {}).map(([loc, sentiments]) => ({ loc, sentiments }));
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Community Map (List Fallback)</Text>
        {rows.length ? rows.map((r) => (
          <View key={r.loc} style={styles.row}> 
            <Text style={styles.loc}>{r.loc}</Text>
            <Text style={styles.meta}>{JSON.stringify(r.sentiments)}</Text>
          </View>
        )) : <Text style={styles.meta}>No data</Text>}
      </View>
    );
  }

  // Simple static region (Tokyo as center) — enhance with geocoding if needed
  const region = { latitude: 35.6762, longitude: 139.6503, latitudeDelta: 30, longitudeDelta: 30 };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community Map</Text>
      <MapView style={styles.map} initialRegion={region}>
        {/* Without geocoding, we cannot place exact markers. Future step: store lat/lng in messages. */}
      </MapView>
      <Text style={styles.meta}>Tip: add lat/lng to messages to display markers by location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginBottom: 8 },
  map: { height: 360, marginHorizontal: 16, borderRadius: 10 },
  meta: { color: '#6c757d', paddingHorizontal: 16, marginTop: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  loc: { fontWeight: '800', color: '#1d3557' },
});

