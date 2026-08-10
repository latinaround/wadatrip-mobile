import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { brand } from '../theme/brand';

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

function markerColor(sentiments) {
  const pos = sentiments?.positive || 0;
  const neg = sentiments?.negative || 0;
  const neu = sentiments?.neutral || 0;
  if (pos >= neg && pos >= neu) return '#22c55e';
  if (neg >= pos && neg >= neu) return '#e63946';
  return '#f59e0b';
}

function scoreLabel(count) {
  if (count >= 20) return 'Hot';
  if (count >= 10) return 'Rising';
  return 'Early';
}

function normalizePoints(data) {
  const points = (data && data.points) ? data.points.filter((p) => p.lat && p.lng) : [];
  return [...points].sort((a, b) => (b?.count || 0) - (a?.count || 0));
}

function Heatboard({ points, onSelect }) {
  const rows = points.slice(0, 8);
  const maxCount = Math.max(...rows.map((p) => p?.count || 0), 1);
  const totalMentions = rows.reduce((sum, p) => sum + (p?.count || 0), 0);
  const hotDestinations = rows.filter((p) => (p?.count || 0) >= 10).length;
  const lead = rows[0];

  return (
    <View style={styles.boardWrap}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Destinations tracked</Text>
          <Text style={styles.summaryValue}>{rows.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Signals this week</Text>
          <Text style={styles.summaryValue}>{totalMentions}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Hot right now</Text>
          <Text style={styles.summaryValue}>{hotDestinations}</Text>
        </View>
      </View>

      {lead ? (
        <View style={styles.leadCard}>
          <Text style={styles.leadEyebrow}>Most active now</Text>
          <View style={styles.leadRow}>
            <View>
              <Text style={styles.leadTitle}>{lead.location}</Text>
              <Text style={styles.leadMeta}>{lead.count} fresh community tips</Text>
            </View>
            <View style={[styles.signalBadge, { backgroundColor: markerColor(lead.sentiments) }]}>
              <Text style={styles.signalBadgeText}>{scoreLabel(lead.count)}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Destination heatboard</Text>
        <Text style={styles.sectionMeta}>Top 8</Text>
      </View>

      {rows.length ? rows.map((point, index) => {
        const widthPct = `${Math.max(18, Math.round(((point?.count || 0) / maxCount) * 100))}%`;
        return (
          <TouchableOpacity key={point.location} style={styles.row} onPress={() => onSelect?.(point.location)}>
            <View style={styles.rowTop}>
              <View style={styles.rowLeft}>
                <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                <View>
                  <Text style={styles.loc}>{point.location}</Text>
                  <Text style={styles.meta}>{point.count} traveler signals</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <View style={[styles.sentimentDot, { backgroundColor: markerColor(point.sentiments) }]} />
                <Text style={styles.stage}>{scoreLabel(point.count)}</Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: widthPct, backgroundColor: markerColor(point.sentiments) }]} />
            </View>
          </TouchableOpacity>
        );
      }) : <Text style={styles.empty}>No community location data yet.</Text>}
    </View>
  );
}

export default function CommunityMap({ data, onSelect }) {
  const points = normalizePoints(data);
  const center = points.length ? { latitude: points[0].lat, longitude: points[0].lng } : { latitude: 35.6762, longitude: 139.6503 };
  const region = { latitude: center.latitude, longitude: center.longitude, latitudeDelta: 30, longitudeDelta: 30 };
  const shouldUseFallback = Platform.OS === 'android' || !MapView || !Marker;

  if (shouldUseFallback) {
    return <Heatboard points={points} onSelect={onSelect} />;
  }

  return (
    <View>
      <MapView style={styles.map} initialRegion={region}>
        {points.map((p) => (
          <Marker
            key={p.location}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.location}
            description={`Count: ${p.count}`}
            pinColor={markerColor(p.sentiments)}
          />
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
  map: { height: 360, marginHorizontal: 16, borderRadius: 18 },
  boardWrap: { paddingHorizontal: 18, paddingVertical: 18 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff7f1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f2ddcf',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryEyebrow: { color: brand.colors.textMuted, fontFamily: brand.typography.body, fontSize: 11, marginBottom: 4 },
  summaryValue: { color: brand.colors.deep, fontFamily: brand.typography.display, fontSize: 20 },
  leadCard: {
    backgroundColor: '#10253a',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 16,
  },
  leadEyebrow: { color: '#9bc1d9', fontFamily: brand.typography.body, fontSize: 12, marginBottom: 8 },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  leadTitle: { color: '#ffffff', fontFamily: brand.typography.display, fontSize: 22 },
  leadMeta: { color: '#cbd5e1', fontFamily: brand.typography.body, marginTop: 4 },
  signalBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  signalBadgeText: { color: '#ffffff', fontFamily: brand.typography.display, fontSize: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: brand.colors.deep, fontFamily: brand.typography.display, fontSize: 20 },
  sectionMeta: { color: brand.colors.textMuted, fontFamily: brand.typography.body },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: brand.colors.border },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { color: brand.colors.textMuted, fontFamily: brand.typography.display, width: 24 },
  loc: { color: brand.colors.deep, fontFamily: brand.typography.display, fontSize: 16 },
  meta: { color: brand.colors.textMuted, fontFamily: brand.typography.body, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sentimentDot: { width: 10, height: 10, borderRadius: 5 },
  stage: { color: brand.colors.deep, fontFamily: brand.typography.heading, fontSize: 12 },
  track: { height: 8, backgroundColor: '#ebe4dd', borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  empty: { color: brand.colors.textMuted, fontFamily: brand.typography.body, paddingVertical: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#6c757d' },
});
