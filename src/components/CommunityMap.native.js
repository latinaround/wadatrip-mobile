import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Make react-native-maps optional; show fallback if not installed
let MapView = null;
let Marker = null;
try {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default || RNMaps.MapView || RNMaps;
  Marker = RNMaps.Marker;
} catch (e) {
  MapView = null;
  Marker = null;
}

export default function CommunityMap({ data }) {
  const points = (data && data.points) ? data.points.filter(p => p.lat && p.lng) : [];
  const center = points.length ? { latitude: points[0].lat, longitude: points[0].lng } : { latitude: 35.6762, longitude: 139.6503 };
  const region = { latitude: center.latitude, longitude: center.longitude, latitudeDelta: 30, longitudeDelta: 30 };

  const markerColor = (senti) => {
    const pos = (senti?.positive || 0);
    const neg = (senti?.negative || 0);
    const neu = (senti?.neutral || 0);
    if (pos >= neg && pos >= neu) return '#22c55e';
    if (neg >= pos && neg >= neu) return '#e63946';
    return '#f59e0b';
  };

  if (!MapView || !Marker) {
    // Fallback view when react-native-maps isn't installed
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ fontWeight: '800', color: '#1d3557', marginBottom: 6 }}>Community Map</Text>
        <Text style={{ color: '#6c757d', marginBottom: 8 }}>
          Map preview requires react-native-maps. Showing list instead.
        </Text>
        {points.length ? points.map((p) => (
          <View key={p.location} style={styles.listRow}>
            <Text style={styles.loc}>{p.location}</Text>
            <Text style={styles.meta}>Count: {p.count}</Text>
          </View>
        )) : <Text style={styles.meta}>No data</Text>}
      </View>
    );
  }

  return (
    <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 360, marginHorizontal: 16, borderRadius: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#6c757d' },
  listRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  loc: { fontWeight: '800', color: '#1d3557' },
  meta: { color: '#6c757d' },
});
