import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { getAnalysis, getTopics } from '../services/communityAnalyticsApi';

export default function CommunityInsightsScreen() {
  const [location, setLocation] = useState('Tokyo');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ sentiments: {}, topics: [] });

  const load = async () => {
    setLoading(true);
    try {
      const [a, t] = await Promise.all([
        getAnalysis(location, 7),
        getTopics(location, 30),
      ]);
      setData({ sentiments: a.sentiments || {}, topics: t.topics || [] });
    } catch (e) {
      console.warn('Insights load error', e.message);
      setData({ sentiments: {}, topics: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [location]);

  const sentimentsArr = Object.entries(data.sentiments).map(([k, v]) => ({ label: k, count: v }));

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community Insights</Text>
      <Text style={styles.sub}>Location: {location}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.chip} onPress={() => setLocation('Tokyo')}><Text style={styles.chipText}>Tokyo</Text></TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => setLocation('Madrid')}><Text style={styles.chipText}>Madrid</Text></TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => setLocation('New York')}><Text style={styles.chipText}>New York</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator /> : (
        <>
          <Text style={styles.section}>Sentiment (last 7 days)</Text>
          <FlatList
            data={sentimentsArr}
            keyExtractor={(i) => i.label}
            renderItem={({ item }) => (
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>{item.label}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: Math.min(100, 12 * item.count) }]} /></View>
                <Text style={styles.barVal}>{item.count}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No data</Text>}
          />

          <Text style={styles.section}>Top Topics (last 30 days)</Text>
          <FlatList
            data={data.topics}
            keyExtractor={(i, idx) => `${i.label}-${idx}`}
            renderItem={({ item }) => (
              <View style={styles.topicRow}>
                <Text style={styles.topicLabel}>#{item.label}</Text>
                <Text style={styles.topicVal}>{item.count}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No topics</Text>}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557' },
  sub: { color: '#6c757d', marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 8 },
  chip: { backgroundColor: '#eef2f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  chipText: { color: '#1d3557', fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '800', color: '#1d3557', marginTop: 12, marginBottom: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 80, fontWeight: '700', color: '#1d3557' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#e9ecef', borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, backgroundColor: '#2a9d8f', borderRadius: 4 },
  barVal: { width: 32, textAlign: 'right', color: '#6c757d' },
  topicRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  topicLabel: { color: '#1d3557', fontWeight: '700' },
  topicVal: { color: '#6c757d' },
  empty: { color: '#6c757d', marginTop: 8 },
});

