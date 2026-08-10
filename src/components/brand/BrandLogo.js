import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brand } from '../../theme/brand';

export default function BrandLogo({
  size = 'md',
  showTagline = false,
  light = false,
  style,
}) {
  const compact = size === 'sm';
  const large = size === 'lg';

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.icon,
          compact && styles.iconSm,
          large && styles.iconLg,
        ]}
      >
        <View style={[styles.handle, compact && styles.handleSm, large && styles.handleLg]} />
        <LinearGradient
          colors={brand.gradients.logo}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.markCard, compact && styles.markCardSm, large && styles.markCardLg]}
        >
          <View style={[styles.swoosh, compact && styles.swooshSm, large && styles.swooshLg]} />
          <View style={[styles.pinBadge, compact && styles.pinBadgeSm, large && styles.pinBadgeLg]}>
            <MaterialCommunityIcons
              name="map-marker"
              color="#ffffff"
              size={large ? 34 : compact ? 14 : 20}
            />
          </View>
        </LinearGradient>
      </View>
      <View style={styles.wordmarkWrap}>
        <Text style={[
          styles.wordmark,
          compact && styles.wordmarkSm,
          large && styles.wordmarkLg,
        ]}>
          <Text style={styles.wada}>wada</Text>
          <Text style={styles.trip}>trip</Text>
        </Text>
        {showTagline ? (
          <Text style={[styles.tagline, light && styles.taglineLight]}>
            Book better tours. Meet verified tour guides.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
    marginRight: 12,
    position: 'relative',
  },
  iconSm: {
    width: 34,
    height: 34,
    marginRight: 8,
  },
  iconLg: {
    width: 88,
    height: 88,
    marginRight: 14,
  },
  handle: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 18,
    height: 8,
    marginLeft: -9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: brand.colors.logoHandle,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  handleSm: {
    width: 11,
    height: 5,
    marginLeft: -5.5,
    borderWidth: 3,
    borderBottomWidth: 0,
  },
  handleLg: {
    width: 28,
    height: 12,
    marginLeft: -14,
    borderWidth: 5,
    borderBottomWidth: 0,
  },
  markCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 8,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.colors.logoShadow,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  markCardSm: {
    top: 5,
    borderRadius: 11,
  },
  markCardLg: {
    top: 12,
    borderRadius: 24,
  },
  pinBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: brand.colors.logoPin,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pinBadgeSm: {
    width: 18,
    height: 18,
  },
  pinBadgeLg: {
    width: 40,
    height: 40,
  },
  swoosh: {
    position: 'absolute',
    width: 56,
    height: 18,
    backgroundColor: brand.colors.logoSwoosh,
    borderRadius: 999,
    bottom: 8,
    right: -6,
    transform: [{ rotate: '-27deg' }],
  },
  swooshSm: {
    width: 35,
    height: 10,
    bottom: 5,
    right: -4,
  },
  swooshLg: {
    width: 92,
    height: 28,
    bottom: 12,
    right: -10,
  },
  wordmarkWrap: {
    flexShrink: 1,
  },
  wordmark: {
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1.2,
    fontFamily: brand.typography.display,
  },
  wordmarkSm: {
    fontSize: 19,
    lineHeight: 21,
    letterSpacing: -0.5,
  },
  wordmarkLg: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.4,
  },
  wada: {
    color: brand.colors.logoWordAqua,
  },
  trip: {
    color: brand.colors.logoWordOrange,
  },
  tagline: {
    marginTop: 4,
    color: '#334155',
    fontSize: 13,
    letterSpacing: 0.2,
    fontFamily: brand.typography.heading,
  },
  taglineLight: {
    color: 'rgba(255,255,255,0.92)',
  },
});
