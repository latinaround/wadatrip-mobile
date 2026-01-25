import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Platform } from 'react-native';

export default function SafeApp() {
  const [count, setCount] = useState(0);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1d3557' }}>WadaTrip Dev Preview</Text>
        <Text style={{ color: '#6c757d', marginTop: 6 }}>Safe Mode is ON. Heavy modules (Firebase, Notifications, Maps, Auth) are bypassed so you can preview UI instantly.</Text>

        <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderColor: '#eee', borderWidth: 1 }}>
          <Text style={{ fontWeight: '700', color: '#1d3557' }}>Status</Text>
          <Text style={{ color: '#6c757d', marginTop: 4 }}>Platform: {Platform.OS}</Text>
          <Text style={{ color: '#6c757d' }}>Safe Mode: enabled</Text>
        </View>

        <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderColor: '#eee', borderWidth: 1 }}>
          <Text style={{ fontWeight: '700', color: '#1d3557' }}>Interactive</Text>
          <Text style={{ color: '#6c757d', marginTop: 4 }}>Simple counter to verify rendering and state</Text>
          <TouchableOpacity onPress={() => setCount(c => c + 1)} style={{ backgroundColor: '#2a9d8f', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Tap me ({count})</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderColor: '#eee', borderWidth: 1 }}>
          <Text style={{ fontWeight: '700', color: '#1d3557' }}>Next Steps</Text>
          <Text style={{ color: '#6c757d', marginTop: 4 }}>
            To see the full app, set EXPO_PUBLIC_SAFE_MODE=false in .env.development and restart with cache clear. You can keep EXPO_PUBLIC_BYPASS_AUTH=true to skip login while testing.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

