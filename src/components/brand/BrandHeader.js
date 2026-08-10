import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brand } from '../../theme/brand';
import BrandLogo from './BrandLogo';

export default function BrandHeader({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      {LinearGradient ? (
        <LinearGradient colors={brand.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={styles.content}>
        <BrandLogo size="sm" light />
        <View style={styles.copyWrap}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 16 },
  content: { gap: 10 },
  copyWrap: { marginTop: 4 },
  title: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    fontFamily: brand.typography.display,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    lineHeight: 20,
    fontFamily: brand.typography.body,
  },
});
