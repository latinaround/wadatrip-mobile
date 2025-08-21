import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { getLocationsOverview } from '../services/communityAnalyticsApi';

let MapView;
let Marker;
try {
  // Lazy require to avoid crash if react-native-maps not installed
  // eslint-disable-next-line global-require
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
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

  // Center map roughly; if points exist with coords, center on first
  const points = (data && data.points) ? data.points.filter(p => p.lat && p.lng) : [];
  const center = points.length ? { latitude: points[0].lat, longitude: points[0].lng } : { latitude: 35.6762, longitude: 139.6503 };
  const region = { latitude: center.latitude, longitude: center.longitude, latitudeDelta: 30, longitudeDelta: 30 };

  // Simple color by dominant sentiment
  const markerColor = (senti) => {
    const pos = (senti?.positive || 0);
    const neg = (senti?.negative || 0);
    const neu = (senti?.neutral || 0);
    if (pos >= neg && pos >= neu) return '#22c55e';
    if (neg >= pos && neg >= neu) return '#e63946';
    return '#f59e0b';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community Map</Text>
      <MapView style={styles.map} initialRegion={region}>
        {points.map((p) => (
          <Marker key={p.location} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.location} description={`Count: ${p.count}`} pinColor={markerColor(p.sentiments)} />
        ))}
      </MapView>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Positive</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Neutral</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#e63946' }]} /><Text style={styles.legendText}>Negative</Text></View>
      </View>
      <Text style={styles.meta}>Tip: add lat/lng to messages to display markers by location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginBottom: 8 },
  map: { height: 360, marginHorizontal: 16, borderRadius: 10 },
  meta: { color: '#6c757d', paddingHorizontal: 16, marginTop: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#6c757d' },
  row: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  loc: { fontWeight: '800', color: '#1d3557' },
});
