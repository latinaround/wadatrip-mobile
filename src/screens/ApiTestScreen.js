import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getAnalysis, getTopics, getLocationsOverview } from '../services/communityAnalyticsApi';

export default function ApiTestScreen() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [a, t, l] = await Promise.all([
          getAnalysis('Tokyo', 7),
          getTopics('Tokyo', 30),
          getLocationsOverview(7),
        ]);
        setResult({ analysis: a, topics: t, locations: l });
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>WadaTrip Web API Test</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={styles.error}>Error: {error}</Text>
      ) : (
        <>
          <Text style={styles.section}>/analysis (Tokyo, 7d)</Text>
          <Text style={styles.code}>{JSON.stringify(result.analysis, null, 2)}</Text>
          <Text style={styles.section}>/topics (Tokyo, 30d)</Text>
          <Text style={styles.code}>{JSON.stringify(result.topics, null, 2)}</Text>
          <Text style={styles.section}>/analysis/locations (7d)</Text>
          <Text style={styles.code}>{JSON.stringify(result.locations, null, 2)}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8f9fa' },
  header: { fontSize: 22, fontWeight: '800', color: '#1d3557', marginBottom: 8 },
  section: { marginTop: 12, fontWeight: '800', color: '#1d3557' },
  code: { fontFamily: 'monospace', fontSize: 12, color: '#333', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 6 },
  error: { color: '#e11d48' },
});

