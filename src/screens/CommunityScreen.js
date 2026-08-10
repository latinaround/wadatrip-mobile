import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import Constants from "expo-constants";
import { Snackbar } from "react-native-paper";
import { db, auth } from "../services/firebase";
import BrandHeader from "../components/brand/BrandHeader";
import BrandCard from "../components/brand/BrandCard";
import BrandButton from "../components/brand/BrandButton";
import { brand } from "../theme/brand";

const getInitials = (value) => {
  const parts = String(value || "WT").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((item) => item[0]?.toUpperCase() || "").join("") : "WT";
};

const formatCreatedAt = (value) => {
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
};

const getLocationLabel = (item) => {
  const city = item?.location?.city;
  const lat = item?.location?.lat;
  const lng = item?.location?.lng;
  if (city && String(city).trim()) return String(city).trim();
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
  return "";
};

const locationReady =
  typeof Location?.requestForegroundPermissionsAsync === "function" &&
  typeof Location?.getCurrentPositionAsync === "function" &&
  typeof Location?.reverseGeocodeAsync === "function";

const getActionLabel = (message) => {
  const text = String(message || "").toLowerCase();
  if (/book|reserve|slot|ticket/.test(text)) return "Booking tip";
  if (/avoid|skip|crowded|busy|queue|line/.test(text)) return "Avoid this";
  if (/sunset|food|local|best|worth/.test(text)) return "Good find";
  return "Traveler tip";
};

export default function CommunityScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userCity, setUserCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [repliesByPost, setRepliesByPost] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [repliesUnavailable, setRepliesUnavailable] = useState(false);

  const extra = (Constants?.expoConfig?.extra) || {};
  const mode = String(extra.API_MODE || process?.env?.EXPO_PUBLIC_API_MODE || "").toLowerCase();
  const useMock = mode === "mock";

  useEffect(() => {
    if (useMock) {
      (async () => {
        try {
          const { getCommunityPosts } = await import("../lib/api");
          const res = await getCommunityPosts();
          setPosts(Array.isArray(res) ? res : []);
        } catch (e) {
          console.log("Failed to load community posts (mock):", e);
        } finally {
          setLoading(false);
        }
      })();
      return () => {};
    }
    const q = query(collection(db, "community_posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(list);
      setLoading(false);
    });
    return unsubscribe;
  }, [useMock]);

  const normalizeCity = (value) => String(value || "").trim().toLowerCase();

  const resolveUserCity = async () => {
    try {
      setLocating(true);
      if (!locationReady) {
        setLocationDenied(true);
        return "";
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        return "";
      }
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync(loc.coords);
      let cityName = "";
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        cityName = `${place.city || place.subregion || ""}, ${place.country || ""}`.trim();
      }
      setLocationDenied(false);
      setUserCity(cityName);
      return cityName;
    } catch (error) {
      if (String(error?.message || "") !== "location_unavailable") {
        console.log("Location lookup failed:", error);
      }
      setLocationDenied(true);
      return "";
    } finally {
      setLocating(false);
    }
  };

  const handlePost = async () => {
    const trimmed = String(message || "").trim();
    if (!trimmed) return;

    let location = null;
    if (sharingLocation) {
      try {
        if (!locationReady) {
          setLocationDenied(true);
          throw new Error("location_unavailable");
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
        } else {
          const loc = await Location.getCurrentPositionAsync({});
          const geocode = await Location.reverseGeocodeAsync(loc.coords);
          const place = Array.isArray(geocode) && geocode.length ? geocode[0] : null;
          const cityName = `${place?.city || place?.subregion || ""}, ${place?.country || ""}`.trim();
          location = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            city: cityName || null,
          };
          setLocationDenied(false);
        }
      } catch (error) {
        if (String(error?.message || "") !== "location_unavailable") {
          console.log("Location post failed:", error);
        }
        setLocationDenied(true);
      }
    }

    if (useMock) {
      setPosts((prev) => [
        {
          id: `local-${Date.now()}`,
          author: auth?.currentUser?.email || "Anonymous",
          message: trimmed,
          location,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else {
      await addDoc(collection(db, "community_posts"), {
        author: auth.currentUser?.email || "Anonymous",
        message: trimmed,
        location,
        createdAt: serverTimestamp(),
      });
    }

    setMessage("");
    setSnackVisible(true);
  };

  const filteredPosts = useMemo(() => {
    if (!nearMe) return posts;
    const city = normalizeCity(userCity);
    if (!city) return [];
    return posts.filter((item) => normalizeCity(item?.location?.city) === city);
  }, [nearMe, posts, userCity]);

  const destinationSignals = useMemo(() => {
    const counts = new Map();
    filteredPosts.forEach((item) => {
      const location = getLocationLabel(item);
      const city = String(location || '').split(',')[0].trim();
      if (!city) return;
      counts.set(city, (counts.get(city) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredPosts]);

  const featuredTips = useMemo(() => {
    return [...filteredPosts]
      .filter((item) => {
        const location = getLocationLabel(item);
        return !!location && String(item?.message || '').trim().length >= 24;
      })
      .slice(0, 3);
  }, [filteredPosts]);

  const openToursForLocation = (value) => {
    const city = String(value || '')
      .split(',')[0]
      .trim();
    if (!city) return;
    navigation?.navigate?.('Tours', { destination: city, autoSearch: true });
  };

  const loadReplies = async (postId) => {
    if (!postId || useMock || repliesUnavailable) return;
    setLoadingReplies((prev) => ({ ...prev, [postId]: true }));
    try {
      const q = query(collection(db, "community_posts", postId, "replies"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRepliesByPost((prev) => ({ ...prev, [postId]: list }));
    } catch (e) {
      const code = String(e?.code || "");
      if (code.includes("permission-denied")) {
        setRepliesUnavailable(true);
      } else {
        console.log("Failed to load replies:", e);
      }
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const submitReply = async (postId) => {
    const text = String(replyDrafts[postId] || "").trim();
    if (!text || useMock || repliesUnavailable) return;
    try {
      await addDoc(collection(db, "community_posts", postId, "replies"), {
        author: auth.currentUser?.email || "Anonymous",
        message: text,
        createdAt: serverTimestamp(),
      });
      setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
      await loadReplies(postId);
    } catch (e) {
      const code = String(e?.code || "");
      if (code.includes("permission-denied")) {
        setRepliesUnavailable(true);
      } else {
        console.log("Failed to post reply:", e);
      }
    }
  };

  const quickStats = [
    { label: "Live Tips", value: filteredPosts.length || 0 },
    { label: "Mode", value: nearMe ? "Near Me" : "Global" },
    { label: "Trust", value: "Traveler First" },
  ];

  const renderPost = ({ item }) => {
    const locationLabel = getLocationLabel(item);
    const replies = repliesByPost[item.id] || [];
    return (
      <BrandCard style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAvatar}>
            <Text style={styles.postAvatarText}>{getInitials(item.author)}</Text>
          </View>
          <View style={styles.postHeaderCopy}>
            <Text style={styles.postAuthor}>{item.author || "Traveler"}</Text>
            <Text style={styles.postDate}>{formatCreatedAt(item.createdAt)}</Text>
          </View>
          {locationLabel ? (
            <TouchableOpacity style={styles.locationPill} onPress={() => openToursForLocation(locationLabel)}>
              <Ionicons name="location" size={12} color={brand.colors.heroEnd} />
              <Text style={styles.locationPillText}>{locationLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.postMessage}>{item.message}</Text>

        <View style={styles.postActions}>
          {locationLabel ? (
            <TouchableOpacity onPress={() => openToursForLocation(locationLabel)} style={styles.secondaryChip}>
              <Text style={styles.secondaryChipText}>See tours here</Text>
            </TouchableOpacity>
          ) : null}
          {!useMock && !repliesUnavailable ? (
            <TouchableOpacity onPress={() => loadReplies(item.id)} style={styles.secondaryChip}>
              <Text style={styles.secondaryChipText}>{loadingReplies[item.id] ? "Loading..." : "View replies"}</Text>
            </TouchableOpacity>
          ) : null}
          {!useMock && repliesUnavailable ? (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Replies off for now</Text>
            </View>
          ) : (
            useMock ? <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Mock feed</Text>
            </View> : null
          )}
        </View>

        {Array.isArray(replies) && replies.length > 0 ? (
          <View style={styles.replyList}>
            {replies.map((reply) => (
              <View key={reply.id} style={styles.replyItem}>
                <Text style={styles.replyAuthor}>{reply.author || "Traveler"}</Text>
                <Text style={styles.replyText}>{reply.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {!useMock && !repliesUnavailable ? (
          <View style={styles.replyComposer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Reply to this tip..."
              value={replyDrafts[item.id] || ""}
              onChangeText={(value) => setReplyDrafts((prev) => ({ ...prev, [item.id]: value }))}
            />
            <TouchableOpacity onPress={() => submitReply(item.id)} style={styles.replySend}>
              <Text style={styles.replySendText}>Reply</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </BrandCard>
    );
  };

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.list}
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={brand.colors.heroStart} />
            </View>
          ) : (
            <BrandCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No community tips yet</Text>
              <Text style={styles.emptyBody}>Post a quick tip, neighborhood note or booking lesson to make this feed useful for the next traveler.</Text>
            </BrandCard>
          )
        }
        ListHeaderComponent={
          <View>
            <BrandHeader title="Travel together. Book smarter." subtitle="Tips from real travelers should reduce doubt, surface better local choices and make booking feel safer." />

            <View style={styles.heroCard}>
              <LinearGradient colors={brand.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.heroEyebrow}>Traveler community</Text>
              <Text style={styles.heroTitle}>Fast local tips, better booking instincts, and real traveler context.</Text>
              <Text style={styles.heroBody}>Community should help people discover where to go, what to avoid and which local experiences feel worth booking.</Text>

              <View style={styles.heroStats}>
                {quickStats.map((item) => (
                  <View key={item.label} style={styles.heroStatCard}>
                    <Text style={styles.heroStatValue}>{item.value}</Text>
                    <Text style={styles.heroStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickChip, nearMe && styles.quickChipActive]}
                onPress={async () => {
                  const next = !nearMe;
                  setNearMe(next);
                  if (next && !userCity) await resolveUserCity();
                }}
              >
                <Ionicons name="navigate" size={14} color={nearMe ? "#fff" : brand.colors.heroStart} />
                <Text style={[styles.quickChipText, nearMe && styles.quickChipTextActive]}>{locating ? "Locating..." : nearMe ? "Near me on" : "Near me"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, sharingLocation && styles.quickChipWarm]}
                onPress={() => setSharingLocation((prev) => !prev)}
              >
                <Ionicons name="pin" size={14} color={sharingLocation ? "#fff" : brand.colors.heroEnd} />
                <Text style={[styles.quickChipText, sharingLocation && styles.quickChipTextActive]}>Share location</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickChip} onPress={() => navigation?.navigate?.("CommunityMap")}>
                <Ionicons name="map" size={14} color={brand.colors.heroStart} />
                <Text style={styles.quickChipText}>Map</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickChip} onPress={() => navigation?.navigate?.("CommunityInsights")}>
                <Ionicons name="stats-chart" size={14} color={brand.colors.heroStart} />
                <Text style={styles.quickChipText}>Insights</Text>
              </TouchableOpacity>
            </View>

            {!!destinationSignals.length ? (
              <View style={styles.signalWrap}>
                <Text style={styles.sectionEyebrow}>Trending in community</Text>
                <View style={styles.signalRow}>
                  {destinationSignals.map((item) => (
                    <TouchableOpacity key={item.city} style={styles.signalChip} onPress={() => openToursForLocation(item.city)}>
                      <Text style={styles.signalCity}>{item.city}</Text>
                      <Text style={styles.signalMeta}>{item.count} tips</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <BrandCard style={styles.composerCard}>
              <Text style={styles.sectionEyebrow}>Share a useful tip</Text>
              <Text style={styles.sectionTitle}>Keep it short, local and actionable.</Text>
              <Text style={styles.sectionBody}>Best posts tell travelers what to book, what to skip, or what makes a local experience worth it.</Text>

              <TextInput
                style={styles.input}
                placeholder="Example: Book the morning slot, it gets crowded after 11am."
                placeholderTextColor="#94a3b8"
                value={message}
                onChangeText={setMessage}
                multiline
              />

              {nearMe && userCity ? <Text style={styles.helperText}>Filtering posts for {userCity}</Text> : null}
              {locationDenied ? <Text style={styles.errorText}>Location permission is off. You can still post without it.</Text> : null}

              <View style={styles.composerActions}>
                <BrandButton title="Post tip" onPress={handlePost} style={styles.primaryAction} />
              </View>
            </BrandCard>

            <View style={styles.feedHeader}>
              <Text style={styles.sectionEyebrow}>Live feed</Text>
              <Text style={styles.sectionTitle}>What travelers are noticing right now</Text>
              <Text style={styles.sectionBody}>This feed should help discovery and trust, not become another noisy social feed.</Text>
            </View>

            {!!featuredTips.length ? (
              <View style={styles.featuredWrap}>
                {featuredTips.map((item) => {
                  const locationLabel = getLocationLabel(item);
                  return (
                    <TouchableOpacity key={item.id} style={styles.featuredCard} onPress={() => openToursForLocation(locationLabel)}>
                      <View style={styles.featuredTop}>
                        <Text style={styles.featuredLabel}>{getActionLabel(item.message)}</Text>
                        <Text style={styles.featuredLocation}>{locationLabel}</Text>
                      </View>
                      <Text style={styles.featuredMessage} numberOfLines={2}>{item.message}</Text>
                      <Text style={styles.featuredCta}>Open tours for this place</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        }
      />

      {Snackbar ? (
        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2500}>
          Tip posted successfully.
        </Snackbar>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.colors.bg },
  list: { paddingBottom: 32 },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    overflow: "hidden",
    padding: 18,
    minHeight: 220,
  },
  heroEyebrow: { color: "#e8fffb", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: brand.typography.heading },
  heroTitle: { color: "#fff", fontSize: 29, lineHeight: 35, marginTop: 10, letterSpacing: -0.8, fontFamily: brand.typography.display },
  heroBody: { color: "#eefbfb", marginTop: 10, lineHeight: 21, fontFamily: brand.typography.body },
  heroStats: { flexDirection: "row", gap: 10, marginTop: 16, alignItems: "stretch" },
  heroStatCard: {
    flex: 1,
    minHeight: 74,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatValue: { color: "#fff", fontSize: 18, textAlign: "center", fontFamily: brand.typography.display },
  heroStatLabel: {
    color: "#e7fffb",
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: brand.typography.heading,
  },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginTop: 12 },
  quickChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dce7ee", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  quickChipActive: { backgroundColor: brand.colors.heroStart, borderColor: brand.colors.heroStart },
  quickChipWarm: { backgroundColor: brand.colors.heroEnd, borderColor: brand.colors.heroEnd },
  quickChipText: { color: brand.colors.deep, fontFamily: brand.typography.heading },
  quickChipTextActive: { color: "#fff" },
  signalWrap: { paddingHorizontal: 16, paddingTop: 14 },
  signalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  signalChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8d9cb",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
  },
  signalCity: { color: brand.colors.deep, fontFamily: brand.typography.heading, fontSize: 13 },
  signalMeta: { color: brand.colors.textMuted, fontFamily: brand.typography.body, fontSize: 12, marginTop: 2 },
  composerCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24 },
  sectionEyebrow: { color: brand.colors.heroStart, fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase", fontFamily: brand.typography.heading },
  sectionTitle: { color: brand.colors.deep, fontSize: 24, lineHeight: 30, marginTop: 8, letterSpacing: -0.6, fontFamily: brand.typography.display },
  sectionBody: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
  input: {
    marginTop: 14,
    minHeight: 108,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
    textAlignVertical: "top",
    color: brand.colors.deep,
    fontFamily: brand.typography.body,
  },
  helperText: { color: brand.colors.textMuted, marginTop: 10, fontFamily: brand.typography.body },
  errorText: { color: "#b42318", marginTop: 10, fontFamily: brand.typography.body },
  composerActions: { marginTop: 14, flexDirection: "row" },
  primaryAction: { flex: 1 },
  feedHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  featuredWrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  featuredCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5edf4",
    padding: 14,
  },
  featuredTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  featuredLabel: { color: brand.colors.heroStart, fontFamily: brand.typography.heading, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  featuredLocation: { color: brand.colors.heroEnd, fontFamily: brand.typography.heading, fontSize: 12 },
  featuredMessage: { color: brand.colors.deep, fontFamily: brand.typography.body, lineHeight: 20, marginTop: 8, fontSize: 15 },
  featuredCta: { color: brand.colors.heroStart, fontFamily: brand.typography.heading, marginTop: 10, fontSize: 12 },
  postCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 22 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: brand.colors.deep, alignItems: "center", justifyContent: "center" },
  postAvatarText: { color: "#fff", fontSize: 14, fontFamily: brand.typography.heading },
  postHeaderCopy: { flex: 1 },
  postAuthor: { color: brand.colors.deep, fontSize: 16, fontFamily: brand.typography.heading },
  postDate: { color: brand.colors.textMuted, marginTop: 3, fontSize: 12, fontFamily: brand.typography.body },
  locationPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  locationPillText: { color: brand.colors.heroEnd, fontSize: 12, fontFamily: brand.typography.heading },
  postMessage: { color: brand.colors.deep, marginTop: 14, lineHeight: 22, fontSize: 16, fontFamily: brand.typography.body },
  postActions: { flexDirection: "row", marginTop: 14 },
  secondaryChip: { backgroundColor: "#eef6f8", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryChipText: { color: brand.colors.heroStart, fontSize: 12, fontFamily: brand.typography.heading },
  mockBadge: { backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  mockBadgeText: { color: brand.colors.heroEnd, fontSize: 12, fontFamily: brand.typography.heading },
  replyList: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#eef2f7", paddingTop: 12, gap: 10 },
  replyItem: { backgroundColor: "#f8fbfc", borderRadius: 14, padding: 10 },
  replyAuthor: { color: brand.colors.deep, fontSize: 12, fontFamily: brand.typography.heading },
  replyText: { color: "#475569", marginTop: 4, lineHeight: 18, fontSize: 12, fontFamily: brand.typography.body },
  replyComposer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: "#dbe4ee", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", color: brand.colors.deep, fontFamily: brand.typography.body },
  replySend: { backgroundColor: brand.colors.heroStart, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  replySendText: { color: "#fff", fontSize: 12, fontFamily: brand.typography.heading },
  emptyState: { paddingTop: 40 },
  emptyCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 24 },
  emptyTitle: { color: brand.colors.deep, fontSize: 18, fontFamily: brand.typography.heading },
  emptyBody: { color: brand.colors.textMuted, marginTop: 8, lineHeight: 20, fontFamily: brand.typography.body },
});
