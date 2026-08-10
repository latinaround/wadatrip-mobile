import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getLocationsOverview } from '../services/communityAnalyticsApi';
import CommunityMap from '../components/CommunityMap';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import { brand } from '../theme/brand';

export default function CommunityMapScreen({ navigation }) {
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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openToursForLocation = (value) => {
    const city = String(value || '')
      .split(',')[0]
      .trim();
    if (!city) return;
    navigation?.navigate?.('Tours', { destination: city, autoSearch: true });
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={brand.colors.primary} />
        <Text style={styles.loadingText}>Loading destination signals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BrandHeader
        title="Destination heatboard"
        subtitle="See where traveler tips are clustering fastest so discovery feels easier before you book."
      />
      <BrandCard style={styles.card}>
        <CommunityMap data={data} onSelect={openToursForLocation} />
      </BrandCard>
      <Text style={styles.meta}>
        Tap a destination to jump into tours for that city. This view surfaces signal first, then hands travelers to booking.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.colors.bg, gap: 10 },
  loadingText: { color: brand.colors.textMuted, fontFamily: brand.typography.body },
  card: { marginHorizontal: 16, marginTop: 8, borderRadius: 22, overflow: 'hidden' },
  meta: {
    color: brand.colors.textMuted,
    paddingHorizontal: 16,
    marginTop: 10,
    fontFamily: brand.typography.body,
    lineHeight: 20,
  },
});
