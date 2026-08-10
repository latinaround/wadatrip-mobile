import React from 'react';
import { View, StyleSheet } from 'react-native';
import { brand } from '../../theme/brand';

export default function BrandCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: brand.colors.border,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});
