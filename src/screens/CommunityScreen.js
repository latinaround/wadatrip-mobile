// src/screens/CommunityScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, Button, ActivityIndicator, Switch, StyleSheet } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../services/firebase";
import Constants from 'expo-constants';
import { Snackbar } from "react-native-paper";

export default function CommunityScreen() {
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userCity, setUserCity] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const extra = (Constants?.expoConfig?.extra) || {};
    const mode = String(extra.API_MODE || process?.env?.EXPO_PUBLIC_API_MODE || "").toLowerCase();
    const useMock = mode === "mock";
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
  }, []);

  const handlePost = async () => {
    if (!message.trim()) return;

    let location = null;

    if (sharingLocation) {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
        } else {
          const loc = await Location.getCurrentPositionAsync({});
          const geocode = await Location.reverseGeocodeAsync(loc.coords);

          let cityName = null;
          if (geocode && geocode.length > 0) {
            const place = geocode[0];
            cityName = `${place.city || place.subregion || ""}, ${place.country || ""}`.trim();
          }

          location = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            city: cityName,
          };
          setLocationDenied(false);
        }
      } catch (error) {
        console.log("❌ Error getting location:", error);
        setLocationDenied(true);
      }
    }

    const extra = (Constants?.expoConfig?.extra) || {};
    const mode = String(extra.API_MODE || process?.env?.EXPO_PUBLIC_API_MODE || "").toLowerCase();
    const useMock = mode === "mock";

    if (useMock) {
      setPosts((prev) => [
        {
          id: `local-${Date.now()}`,
          author: auth?.currentUser?.email || "Anonymous",
          message,
          location,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else {
      await addDoc(collection(db, "community_posts"), {
        author: auth.currentUser?.email || "Anonymous",
        message,
        location,
        createdAt: serverTimestamp(),
      });
    }

    setMessage("");
    setSnackVisible(true);
  };

  const normalizeCity = (value) => String(value || "").trim().toLowerCase();
  const resolveUserCity = async () => {
    try {
      setLocating(true);
      const Location = await import("expo-location");
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
      console.log("? Error getting location:", error);
      setLocationDenied(true);
      return "";
    } finally {
      setLocating(false);
    }
  };

  const filteredPosts = (() => {
    if (!nearMe) return posts;
    const city = normalizeCity(userCity);
    if (!city) return [];
    return posts.filter((item) => normalizeCity(item?.location?.city) === city);
  })();

  return (
    <>
      <View style={styles.container}>
        <View style={styles.heroHeader}>
          {LinearGradient ? (
            <LinearGradient
              colors={["#00c6c6", "#ff2aa1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.heroRow}>
            {Ionicons ? <Ionicons name="airplane" size={26} color="#fff" style={{ marginRight: 10 }} /> : null}
            <Text style={styles.heroTitle}>Community</Text>
          </View>
          <Text style={styles.heroSubtitle}>Share tips, places and deals</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Share something..."
          value={message}
          onChangeText={setMessage}
        />

        <View style={styles.row}>
          <Text>Share location</Text>
          <Switch value={sharingLocation} onValueChange={setSharingLocation} />
        </View>

        <View style={styles.row}>
          <Text>Near me</Text>
          <Switch
            value={nearMe}
            onValueChange={async (next) => {
              setNearMe(next);
              if (next) {
                await resolveUserCity();
              }
            }}
          />
        </View>

        {nearMe && !userCity && !locating ? (
          <Text style={styles.helperText}>Enable location to filter nearby posts.</Text>
        ) : null}
        {nearMe && userCity ? (
          <Text style={styles.helperText}>Showing posts in {userCity}</Text>
        ) : null}

        {locationDenied && (
          <Text style={styles.errorText}>
            Location not shared. Enable permissions in settings to include your
            location.
          </Text>
        )}

        <Button title="Post" onPress={handlePost} />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : filteredPosts.length === 0 ? (
          <Text style={{ marginTop: 20 }}>No posts yet. Be the first!</Text>
        ) : (
          <FlatList
            style={{ marginTop: 20 }}
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.author}>{item.author}</Text>
                <Text>{item.message}</Text>
                {item.location && (
                  <Text style={styles.location}>
                    📍{" "}
                    {(() => {
                      const city = item.location?.city;
                      const lat = item.location?.lat;
                      const lng = item.location?.lng;
                      if (city && String(city).trim().length) return city;
                      if (Number.isFinite(lat) && Number.isFinite(lng))
                        return `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;
                      return "Unknown location";
                    })()}
                  </Text>
                )}
                <Text style={styles.date}>
                  {item.createdAt?.toDate?.().toLocaleString() || "Just now"}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {Snackbar ? (
        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2500}>
          Post created successfully!
        </Snackbar>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0, backgroundColor: '#f8fbfc' },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  errorText: { color: "red", marginBottom: 10 },
  helperText: { color: "#6c757d", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  author: { fontWeight: "bold" },
  location: { fontSize: 12, color: "#555" },
  date: { fontSize: 12, color: "#888" },

  // --- HERO HEADER ---
  heroHeader: {
    paddingTop: 34,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: "#00c6c6",
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroSubtitle: { color: "#e9f5ff", marginTop: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2a9d8f",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  messageText: { color: "#333" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
});
