import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { getAnalysis, getTopics } from '../services/communityAnalyticsApi';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import { brand } from '../theme/brand';

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
      <BrandHeader title="Community signals" subtitle="See what travelers talk about most in the places they want to visit." />
      <View style={styles.row}>
        <TouchableOpacity style={styles.chip} onPress={() => setLocation('Tokyo')}><Text style={styles.chipText}>Tokyo</Text></TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => setLocation('Madrid')}><Text style={styles.chipText}>Madrid</Text></TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => setLocation('New York')}><Text style={styles.chipText}>New York</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator /> : (
        <>
          <BrandCard style={styles.card}>
          <Text style={styles.section}>Sentiment in {location}</Text>
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
          </BrandCard>

          <BrandCard style={styles.card}>
          <Text style={styles.section}>Top topics</Text>
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
          </BrandCard>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.colors.bg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  chip: { backgroundColor: '#eef6f8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  chipText: { color: brand.colors.heroStart, fontFamily: brand.typography.heading },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 22 },
  section: { fontSize: 18, color: brand.colors.deep, marginBottom: 10, fontFamily: brand.typography.display },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 80, color: brand.colors.deep, fontFamily: brand.typography.heading },
  barTrack: { flex: 1, height: 8, backgroundColor: '#e9ecef', borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, backgroundColor: brand.colors.heroStart, borderRadius: 4 },
  barVal: { width: 32, textAlign: 'right', color: brand.colors.textMuted, fontFamily: brand.typography.body },
  topicRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  topicLabel: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  topicVal: { color: brand.colors.textMuted, fontFamily: brand.typography.body },
  empty: { color: brand.colors.textMuted, marginTop: 8, fontFamily: brand.typography.body },
});
