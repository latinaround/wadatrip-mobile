import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { getLocationsOverview } from '../services/communityAnalyticsApi';
import CommunityMap from '../components/CommunityMap';

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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Community Map</Text>
      <CommunityMap data={data} />
      <Text style={styles.meta}>Tip: add lat/lng to messages to display markers by location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', paddingHorizontal: 16, marginBottom: 8 },
  meta: { color: '#6c757d', paddingHorizontal: 16, marginTop: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  loc: { fontWeight: '800', color: '#1d3557' },
});
