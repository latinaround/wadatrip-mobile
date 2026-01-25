import React, { Suspense } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';

const SAFE_MODE = process.env.EXPO_PUBLIC_SAFE_MODE === 'true';

let SafeApp = null;
if (SAFE_MODE) {
  SafeApp = require('./SafeApp').default;
}

const AppLazy = React.lazy(() => import('../App'));

export default function Root() {
  if (SAFE_MODE && SafeApp) {
    return <SafeApp />;
  }
  return (
    <Suspense fallback={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" /></View>}>
      <AppLazy />
    </Suspense>
  );
}

