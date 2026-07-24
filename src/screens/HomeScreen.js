import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { brand } from '../theme/brand';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import BrandLogo from '../components/brand/BrandLogo';
import { auth } from '../services/firebase';
import { getCurrentAppUser } from '../services/appSession';
import { getCurrentProvider, normalizeProviderStatus } from '../lib/api';

export default function HomeScreen({ navigation }) {
  const user = auth.currentUser || getCurrentAppUser();
  const [provider, setProvider] = React.useState(null);
  const [activeMode, setActiveMode] = React.useState('traveler');
  const openExplore = () => navigation.navigate('ToursDeals');
  const apiMode = String(((Constants && Constants.expoConfig && Constants.expoConfig.extra) || {}).API_MODE || (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_API_MODE : '') || 'live').toUpperCase();
  const guideStatus = normalizeProviderStatus(provider);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await getCurrentProvider(user?.email || '');
        if (active) setProvider(row || null);
      } catch {
        if (active) setProvider(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.email]);

  const guideSummary = (() => {
    if (!provider) {
      return {
        title: 'Guide tools locked',
        subtitle: 'Your traveler account is ready. Apply only if you want to host tours.',
        cta: 'Apply as guide',
        onPress: () => navigation.navigate('ProviderSignup'),
      };
    }
    if (guideStatus === 'approved') {
      return {
        title: 'Guide tools live',
        subtitle: 'Jump into your listings and bookings from Profile.',
        cta: 'Open guide tools',
        onPress: () => navigation.navigate('Profile', { focusSection: 'guide' }),
      };
    }
    if (guideStatus === 'rejected') {
      return {
        title: 'Guide profile needs edits',
        subtitle: 'Your traveler account still works. Fix the guide form to publish tours.',
        cta: 'Fix guide profile',
        onPress: () => navigation.navigate('ProviderSignup', { provider }),
      };
    }
    return {
      title: 'Guide review in progress',
      subtitle: 'Keep booking as a traveler while we review your guide profile.',
      cta: 'View status',
      onPress: () => navigation.navigate('Profile', { focusSection: 'guide' }),
    };
  })();

  const heroHighlights = ['Verified guides', 'Local picks', 'Fast booking'];

  const travelerCards = [
    {
      key: 'explore',
      eyebrow: 'Marketplace',
      title: 'Explore tours',
      subtitle: 'Best local tours in one clean feed',
      actionLabel: 'Open',
      icon: MaterialCommunityIcons,
      iconName: 'ticket-percent',
      color: brand.colors.accent,
      surfaceColor: '#fff6ee',
      borderColor: '#f2d7c3',
      onPress: openExplore,
    },
    {
      key: 'flights',
      eyebrow: 'Timing',
      title: 'Flights',
      subtitle: 'Check routes, timing, and smart windows',
      actionLabel: 'Track',
      icon: Ionicons,
      iconName: 'airplane',
      color: brand.colors.primary,
      surfaceColor: '#f2fcfb',
      borderColor: '#cdeeee',
      onPress: () => navigation.navigate('Flights'),
    },
    {
      key: 'bookings',
      eyebrow: 'Trips',
      title: 'My bookings',
      subtitle: 'Everything confirmed, paid, and upcoming',
      actionLabel: 'Manage',
      icon: MaterialCommunityIcons,
      iconName: 'wallet-travel',
      color: brand.colors.secondary,
      surfaceColor: '#fff7fb',
      borderColor: '#ecd5e3',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      key: 'community',
      eyebrow: 'Social',
      title: 'Community',
      subtitle: 'See what travelers and locals recommend',
      actionLabel: 'Join',
      icon: Ionicons,
      iconName: 'people',
      color: brand.colors.accent,
      surfaceColor: '#f4fbf7',
      borderColor: '#d6eadf',
      onPress: () => navigation.navigate('Community'),
    },
  ];

  const renderCard = (item, fullWidth = false, tone = 'traveler') => {
    const Icon = item.icon;
    const toneStyle = tone === 'guide' ? styles.tileGuide : styles.tileTraveler;
    return (
      <TouchableOpacity key={item.key} style={[styles.tileWrap, fullWidth && styles.tileWrapFull]} activeOpacity={0.9} onPress={item.onPress}>
        <BrandCard style={[styles.tile, fullWidth && styles.tileFull, toneStyle]}>
          <View style={[styles.tileTone, { backgroundColor: item.surfaceColor, borderColor: item.borderColor }]} />
          <View style={styles.tileGlowWrap}>
            <View style={[styles.tileGlow, { backgroundColor: `${item.color}22` }]} />
          </View>
          <View style={styles.tileTopRow}>
            <View style={[styles.tileEyebrowChip, { backgroundColor: `${item.color}18` }]}>
              <Text style={[styles.tileEyebrow, { color: item.color }]}>{item.eyebrow}</Text>
            </View>
            <View style={[styles.tileArrow, { backgroundColor: `${item.color}14` }]}>
              <Ionicons name="arrow-forward" size={14} color={item.color} />
            </View>
          </View>
          <View style={[styles.tileIcon, { backgroundColor: `${item.color}1A` }]}>
            {Icon ? <Icon name={item.iconName} size={22} color={item.color} /> : null}
          </View>
          <View style={styles.tileBody}>
            <Text style={styles.tileTitle}>{item.title}</Text>
            <Text style={styles.tileText}>{item.subtitle}</Text>
          </View>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileAction, { color: item.color }]}>{item.actionLabel}</Text>
          </View>
        </BrandCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {LinearGradient ? (
            <LinearGradient colors={brand.gradients.hero} start={{ x: 0.05, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={styles.heroOrbPrimary} />
          <View style={styles.heroOrbSecondary} />

          <View style={styles.modeRow}>
            <View style={styles.modeChip}>
              <Text style={styles.modeText}>{apiMode}</Text>
            </View>
          </View>

          <BrandLogo size="lg" light showTagline />

          <Text style={styles.headerTitle}>Tours worth the trip.</Text>

          <Text style={styles.headerSubtitle}>Verified guides, local picks, and a cleaner path to book.</Text>

          <View style={styles.heroMetaRow}>
            {heroHighlights.map((item) => (
              <View key={item} style={styles.heroMetaChip}>
                <Text style={styles.heroMetaText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.roleRail}>
            <TouchableOpacity activeOpacity={0.92} style={[styles.roleCard, styles.roleCardTraveler]} onPress={() => setActiveMode('traveler')}>
              <View style={[styles.roleBadge, styles.roleBadgeTraveler]}>
                <Ionicons name="airplane" size={14} color="#fff" style={styles.roleBadgeIcon} />
                <Text style={styles.roleEyebrow}>Traveler</Text>
              </View>
              <Text style={[styles.roleTitle, styles.roleTitleTraveler]}>Ready now</Text>
              <Text style={styles.roleText}>Browse tours, save flights, and manage trips from one login.</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.92} style={[styles.roleCard, styles.roleCardGuide]} onPress={() => setActiveMode('guide')}>
              <View style={[styles.roleBadge, styles.roleBadgeGuide]}>
                <MaterialCommunityIcons name="compass-rose" size={14} color="#fff" style={styles.roleBadgeIcon} />
                <Text style={styles.roleEyebrow}>Guide</Text>
              </View>
              <Text style={[styles.roleTitle, styles.roleTitleGuide]}>{guideSummary.title}</Text>
              <Text style={styles.roleText}>{guideSummary.subtitle}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroActions}>
            <BrandButton title="Explore tours" onPress={openExplore} style={styles.primaryCta} textStyle={styles.primaryCtaText} />
            <TouchableOpacity activeOpacity={0.86} onPress={() => navigation.navigate('Profile')} style={styles.secondaryCta}>
              <Ionicons name="person-circle-outline" size={16} color="#fff" />
              <Text style={styles.secondaryCtaText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.segmented}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.segmentButton, activeMode === 'traveler' && styles.segmentButtonTravelerActive]}
              onPress={() => setActiveMode('traveler')}
            >
              <Text style={[styles.segmentText, activeMode === 'traveler' && styles.segmentTextActive]}>Traveler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.segmentButton, activeMode === 'guide' && styles.segmentButtonGuideActive]}
              onPress={() => setActiveMode('guide')}
            >
              <Text style={[styles.segmentText, activeMode === 'guide' && styles.segmentTextActive]}>Tour guide</Text>
            </TouchableOpacity>
          </View>
          {activeMode === 'traveler' ? (
            <>
              <Text style={[styles.sectionEyebrow, styles.sectionEyebrowTraveler]}>Traveler mode</Text>
              <Text style={styles.sectionTitle}>Start here</Text>
              <Text style={styles.sectionBlurb}>Quick lanes for tours, flights, bookings, and community.</Text>
              <View style={styles.grid}>
                {travelerCards.map((item) => renderCard(item, false, 'traveler'))}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.sectionEyebrow, styles.sectionEyebrowGuide]}>Guide mode</Text>
              <Text style={styles.sectionTitle}>Guide tools</Text>
              <Text style={styles.sectionBlurb}>Keep hosting separate from traveler booking flow.</Text>
              <BrandCard style={styles.guidePanel}>
                <View style={styles.guidePanelHead}>
                  <View style={styles.guidePanelIcon}>
                    <MaterialCommunityIcons name="compass-rose" size={20} color={brand.colors.secondary} />
                  </View>
                  <View style={styles.guidePanelCopy}>
                    <Text style={styles.guidePanelTitle}>{guideSummary.title}</Text>
                    <Text style={styles.guidePanelText}>{guideSummary.subtitle}</Text>
                  </View>
                </View>
                <BrandButton title={guideSummary.cta} onPress={guideSummary.onPress} style={styles.guidePanelButton} />
              </BrandCard>
              <Text style={styles.guideModeNote}>Traveler bookings stay in traveler mode and Profile.</Text>
            </>
          )}
          <View style={styles.modeShortcutRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Profile')} style={styles.modeShortcut}>
              <Text style={styles.modeShortcutText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  content: { paddingBottom: 36 },
  header: {
    margin: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  heroOrbPrimary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -34,
    right: -56,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroOrbSecondary: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -34,
    left: -30,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  modeRow: { alignItems: 'flex-end', marginBottom: 12 },
  modeChip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  modeText: { color: '#fff', fontSize: 12, letterSpacing: 0.8, fontFamily: brand.typography.heading },
  headerTitle: {
    color: '#fff',
    fontSize: 36,
    lineHeight: 40,
    maxWidth: 300,
    marginTop: 10,
    alignSelf: 'center',
    textAlign: 'center',
    letterSpacing: -1.2,
    fontFamily: brand.typography.display,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 290,
    fontFamily: brand.typography.body,
  },
  heroMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  heroMetaChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 0.3,
    fontFamily: brand.typography.heading,
  },
  heroActions: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  roleRail: { marginTop: 18, gap: 10 },
  roleCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  roleCardTraveler: {
    backgroundColor: 'rgba(255, 250, 244, 0.14)',
    borderColor: 'rgba(255, 241, 230, 0.24)',
  },
  roleCardGuide: {
    backgroundColor: 'rgba(255, 244, 249, 0.12)',
    borderColor: 'rgba(255, 232, 244, 0.22)',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  roleBadgeIcon: {
    marginRight: 6,
  },
  roleBadgeTraveler: {
    backgroundColor: 'rgba(255, 247, 240, 0.16)',
  },
  roleBadgeGuide: {
    backgroundColor: 'rgba(255, 240, 248, 0.14)',
  },
  roleEyebrow: {
    color: '#fff',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: brand.typography.heading,
  },
  roleTitle: {
    color: '#fff',
    fontSize: 21,
    lineHeight: 25,
    fontFamily: brand.typography.heading,
  },
  roleTitleTraveler: {
    color: '#fffdf8',
  },
  roleTitleGuide: {
    color: '#fff7fb',
  },
  roleText: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    lineHeight: 19,
    fontFamily: brand.typography.body,
  },
  primaryCta: {
    flex: 1,
    maxWidth: 208,
    backgroundColor: '#fff8f2',
    borderRadius: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryCtaText: { color: brand.colors.heroStart },
  secondaryCta: {
    minWidth: 110,
    height: 48,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryCtaText: {
    color: '#fff',
    fontFamily: brand.typography.heading,
  },
  section: { paddingHorizontal: 16, marginTop: 2 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#efe2d6',
    borderRadius: 20,
    padding: 5,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  segmentButtonTravelerActive: {
    backgroundColor: brand.colors.surfaceWarm,
  },
  segmentButtonGuideActive: {
    backgroundColor: brand.colors.surfaceRose,
  },
  segmentText: {
    color: '#6b7280',
    fontFamily: brand.typography.heading,
  },
  segmentTextActive: {
    color: brand.colors.deep,
  },
  sectionEyebrow: {
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: brand.typography.heading,
  },
  sectionEyebrowTraveler: { color: brand.colors.accent },
  sectionEyebrowGuide: { color: brand.colors.secondary },
  sectionTitle: {
    color: brand.colors.deep,
    fontSize: 28,
    lineHeight: 32,
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: -0.8,
    fontFamily: brand.typography.display,
  },
  sectionBlurb: {
    color: brand.colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: brand.typography.body,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tileWrap: { width: '48%', marginBottom: 14 },
  tileWrapFull: { width: '100%' },
  tile: {
    minHeight: 176,
    borderRadius: 28,
    padding: 18,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  tileTraveler: {
    backgroundColor: brand.colors.surfaceWarm,
    borderColor: brand.colors.borderWarm,
  },
  tileGuide: {
    backgroundColor: brand.colors.surfaceRose,
    borderColor: brand.colors.borderRose,
  },
  guidePanel: {
    borderRadius: 28,
    backgroundColor: brand.colors.surfaceRose,
    borderColor: brand.colors.borderRose,
    padding: 20,
  },
  guidePanelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  guidePanelIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fde7f2',
  },
  guidePanelCopy: { flex: 1 },
  guidePanelTitle: { color: brand.colors.deep, fontSize: 18, lineHeight: 23, fontFamily: brand.typography.heading },
  guidePanelText: { color: brand.colors.textMuted, marginTop: 4, lineHeight: 20, fontFamily: brand.typography.body },
  guidePanelButton: { marginTop: 14, backgroundColor: brand.colors.secondary, borderRadius: 16 },
  guideModeNote: { marginTop: 10, color: brand.colors.textMuted, lineHeight: 19, fontFamily: brand.typography.body },
  modeShortcutRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modeShortcut: {
    flex: 1,
    backgroundColor: '#fffdfb',
    borderWidth: 1,
    borderColor: brand.colors.borderWarm,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 13,
  },
  modeShortcutText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  tileFull: { minHeight: 128 },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 28,
  },
  tileGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -16,
    right: -18,
  },
  tileEyebrowChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tileEyebrow: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: brand.typography.heading,
  },
  tileArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  tileBody: { marginTop: 8 },
  tileTone: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 28,
  },
  tileTitle: { color: brand.colors.text, fontSize: 18, lineHeight: 23, letterSpacing: -0.4, fontFamily: brand.typography.heading },
  tileText: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  tileFooter: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.68)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tileAction: {
    fontSize: 12,
    fontFamily: brand.typography.heading,
  },
});
