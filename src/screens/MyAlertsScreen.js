import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, ActivityIndicator } from 'react-native';
import { extractErrorDetails } from '../lib/errors';
import BrandHeader from '../components/brand/BrandHeader';
import BrandButton from '../components/brand/BrandButton';
import BrandCard from '../components/brand/BrandCard';

export default function MyAlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const mapHttpError = (e) => {
    const status = (e && (e.status || 0)) || 0;
    if (status === 400) return 'Bad request';
    if (status === 401) return 'Unauthorized, check token';
    if (status >= 500) return 'Server error, try again';
    return 'Network error, please try again';
  };

  const loadAlerts = async () => {
    setLoading(true);
    setError('');
    setErrorDetails('');
    setShowDetails(false);
    try {
      const { listAlerts } = await import('../lib/api');
      const items = await listAlerts();
      setAlerts(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
      setError(mapHttpError(e));
      const detail = extractErrorDetails(e);
      if (detail) setErrorDetails(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const renderItem = ({ item }) => (
    <BrandCard style={styles.card}>
      <Text style={styles.cardTitle}>{item.route}</Text>
      <Text style={styles.meta}>Status: {String(item.status || 'active').replace(/_/g, ' ')}</Text>
      {item.current_price != null ? <Text style={styles.meta}>Current price: {item.currency || 'USD'} ${Number(item.current_price).toFixed(0)}</Text> : null}
      {item.predicted_low != null ? <Text style={styles.meta}>Predicted low: {item.currency || 'USD'} ${Number(item.predicted_low).toFixed(0)}</Text> : null}
      {item.threshold != null ? <Text style={styles.meta}>Target threshold: {item.currency || 'USD'} ${Number(item.threshold).toFixed(0)}</Text> : null}
      {item.date ? <Text style={styles.meta}>Travel date: {String(item.date).slice(0, 10)}</Text> : null}
      {item.action ? <Text style={styles.action}>Action: {String(item.action).replace(/_/g, ' ').toUpperCase()}</Text> : null}
    </BrandCard>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
      <BrandHeader title="Alerts" subtitle="Track your routes and get better timing decisions." />

      <View style={styles.actionsWrap}>
        <BrandButton title={loading ? 'Refreshing...' : 'Refresh Alerts'} onPress={loadAlerts} disabled={loading} style={styles.button} />
        <BrandButton title="Create New Alert" onPress={() => navigation.navigate('Flights')} variant="secondary" style={styles.button} />
      </View>

      {loading ? (
        <View style={styles.loadingRow}><ActivityIndicator color="#0ea5e9" /><Text style={styles.loadingText}> Loading…</Text></View>
      ) : null}

      {!!error && (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
          {!!errorDetails ? (
            <BrandButton title={showDetails ? 'Hide details' : 'Show details'} onPress={() => setShowDetails((v) => !v)} style={{ marginTop: 8, backgroundColor: '#64748b' }} />
          ) : null}
          {showDetails && !!errorDetails ? (
            <View style={styles.detailsBox}>
              <Text selectable style={styles.detailsText}>{errorDetails}</Text>
            </View>
          ) : null}
        </View>
      )}

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onRefresh={loadAlerts}
        refreshing={loading}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No alerts created yet</Text>
              <Text style={styles.emptySub}>Create your first one from Flights in under 10 seconds.</Text>
              <BrandButton title="Go to Flights" onPress={() => navigation.navigate('Flights')} style={{ marginTop: 10 }} />
            </View>
          ) : null
        }
        contentContainerStyle={!alerts.length ? styles.listEmpty : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fb' },
  actionsWrap: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  button: { flex: 1 },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontWeight: '800', fontSize: 16, color: '#0f172a' },
  meta: { color: '#475569', marginTop: 4 },
  action: { color: '#1d4ed8', marginTop: 6, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 },
  loadingText: { marginLeft: 8, color: '#0f172a' },
  errorPanel: { backgroundColor: '#ffe8e8', borderColor: '#f5c2c7', borderWidth: 1, padding: 12, borderRadius: 8, marginHorizontal: 16, marginBottom: 8 },
  errorText: { color: '#b02a37', fontWeight: '600' },
  detailsBox: { marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f3f5', borderRadius: 6, padding: 10 },
  detailsText: { color: '#1d3557', fontSize: 12 },
  emptyWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptySub: { marginTop: 6, color: '#64748b' },
});
