import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator } from 'react-native';
import { extractErrorDetails } from '../lib/errors';

export default function MyAlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
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

  const subscribe = async () => {
    setSubscribing(true);
    setError('');
    setErrorDetails('');
    setShowDetails(false);
    try {
      const { subscribeAlert } = await import('../lib/api');
      await subscribeAlert({ route: 'MEX-CUN' });
      await loadAlerts();
    } catch (e) {
      console.error(e);
      setError(mapHttpError(e));
      const detail = extractErrorDetails(e);
      if (detail) setErrorDetails(detail);
    } finally {
      setSubscribing(false);
    }
  };

  const keyExtractor = (item, idx) => String(item.id || item.route || idx);

  const renderItem = ({ item }) => {
    const route = typeof item.route === 'string' ? item.route : [item.origin, item.destination].filter(Boolean).join('-');
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{route || 'Route'}</Text>
        {'current_price' in item && (<Text style={styles.meta}>Current: ${item.current_price}</Text>)}
        {'predicted_low' in item && (<Text style={styles.meta}>Predicted low: ${item.predicted_low}</Text>)}
        {'action' in item && (<Text style={styles.meta}>Action: {String(item.action).toUpperCase()}</Text>)}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
      <Text style={styles.header}>My Alerts</Text>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#00b8b8', opacity: subscribing ? 0.75 : 1 }]} onPress={subscribe} disabled={subscribing}>
          <Text style={styles.btnText}>{subscribing ? 'Subscribing…' : 'Subscribe (MEX-CUN)'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#ff8a3d', marginTop: 8, opacity: loading ? 0.75 : 1 }]} onPress={loadAlerts} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingRow}><ActivityIndicator color="#2a9d8f" /><Text style={styles.loadingText}> Loading…</Text></View>
      )}

      {!!error && (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
          {!!errorDetails && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#64748b', marginTop: 6 }]} onPress={() => setShowDetails((v) => !v)}>
              <Text style={styles.btnText}>{showDetails ? 'Hide details' : 'Show details'}</Text>
            </TouchableOpacity>
          )}
          {showDetails && !!errorDetails && (
            <View style={styles.detailsBox}>
              <Text selectable style={styles.detailsText}>{errorDetails}</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#ff8a3d', marginTop: 6 }]} onPress={loadAlerts}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={alerts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? <View style={styles.center}><Text>No alerts yet.</Text></View> : null}
        contentContainerStyle={!alerts.length ? styles.listEmpty : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fbfc' },
  header: { fontSize: 22, fontWeight: '800', color: '#0f172a', paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 12 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  center: { padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e9ecef' },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  meta: { color: '#6c757d', marginTop: 4 },
  btn: { paddingHorizontal: 10, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  errorPanel: { backgroundColor: '#ffe8e8', borderColor: '#f5c2c7', borderWidth: 1, padding: 12, borderRadius: 8, marginHorizontal: 16, marginBottom: 8 },
  errorText: { color: '#b02a37', fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  loadingText: { marginLeft: 8, color: '#0f172a' },
  detailsBox: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f3f5', borderRadius: 6, padding: 10 },
  detailsText: { color: '#1d3557', fontSize: 12 },
});

