import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CommunityMap({ data }) {
  const rows = Object.entries((data && data.locations) || {}).map(([loc, sentiments]) => ({ loc, sentiments }));
  return (
    <View>
      {rows.length ? rows.map((r) => (
        <View key={r.loc} style={styles.row}>
          <Text style={styles.loc}>{r.loc}</Text>
          <Text style={styles.meta}>{JSON.stringify(r.sentiments)}</Text>
        </View>
      )) : <Text style={styles.meta}>No data</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  loc: { fontWeight: '800', color: '#1d3557' },
  meta: { color: '#6c757d', paddingHorizontal: 16, marginTop: 8 },
});

