# WadaTrip Mobile App (SDK 51)

Aplicación móvil nativa (Expo + React Native) que consume el backend Wadatrip (gateway + servicios: itineraries, pricing, alerts, provider-hub) y usa Firebase (Auth, Firestore) para ciertas funcionalidades de comunidad y deals.

## Características

- 📱 App nativa para iOS/Android (Expo SDK 51)
- 🔐 Firebase Auth con persistencia AsyncStorage (RN)
- ✈️ Flights: predicción de precios desde `/pricing/predict`
- 🔔 Alerts: lista y subscribe vía `/alerts/list` y `/alerts/subscribe`
- 🧭 WadaAgent: overlay con acción “Generate Itinerary” → `/itineraries/generate`
- 👥 Community: Firestore `community_posts` (autor, mensaje, ubicación, fecha)
- 🏷 Tours & Deals: Firestore `tours_deals` con búsqueda por destino
- 🎨 Header con gradiente + Ionicons en tabs

## Requisitos previos

- Node 18/20 recomendado
- Android Studio y/o Xcode (según plataforma)
- No usar expo-cli global (se fuerza `npx expo` en scripts)

## Instalación rápida

1) Clonar y entrar en `wadatrip-mobile`
2) Instalar dependencias alineadas a SDK 51 (una vez):
   - `npx expo install @react-native-async-storage/async-storage`
   - `npx expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context`
   - `npx expo install expo-linear-gradient expo-notifications`
   - `npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack`

## Desarrollo

### API del Gateway

- Cliente API en `src/lib/api.ts` con funciones:
  - `generateItinerary(request)` → POST `/itineraries/generate`
  - `predictPricing(request)` → POST `/pricing/predict`
  - `listAlerts()` → GET `/alerts/list`
- Headers: incluye `Authorization: Bearer <AUTH_TOKEN>` si está definido.
- Base URL en desarrollo:
  - iOS Simulator: `http://localhost:3000`
  - Android Emulator: `http://10.0.2.2:3000`
  - Dispositivo físico: usar IP local, por ejemplo `http://192.168.1.50:3000`
- Override en `app.json` → `expo.extra.API_BASE_URL` y `expo.extra.AUTH_TOKEN`.

### Pantallas conectadas

- ItineraryScreen llama `/itineraries/generate` (ahora accedida desde WadaAgent, no tab).
- FlightsScreen usa `/pricing/predict`.
- MyAlertsScreen usa `/alerts/list` + `/alerts/subscribe`.

### Ejecutar en desarrollo

```bash
npm run dev   # equivale a: npx expo start -c
```

- Presiona `a` para Android, `i` para iOS.
- Owner y EAS projectId removidos en dev: no se requiere login de Expo.
- Push token: se omite si no hay `projectId` (dev), sin romper el flujo.

### Ejecutar en dispositivos específicos

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Web
npx expo start --web
```

## Autenticación (Firebase)

- Pantalla: `src/screens/LoginScreen.js` (Email/Password, Google en web).
- Persistencia: `initializeAuth(..., getReactNativePersistence(AsyncStorage))` en RN.
- Flujo: `App.js` usa native stack para mostrar Login si no hay sesión; si hay sesión, muestra tabs y WadaAgent.
- IDs de cliente se cargan desde `app.json` → `expo.extra.auth`.

### Configuración de Client IDs (app.json)

En `app.json` se definen los IDs de OAuth que usa `AuthScreen`:

```
{
  "expo": {
    "extra": {
      "auth": {
        "webClientId": "<WEB_CLIENT_ID>.apps.googleusercontent.com",
        "androidClientId": "<ANDROID_CLIENT_ID>.apps.googleusercontent.com",
        "iosClientId": "<IOS_CLIENT_ID>.apps.googleusercontent.com"
      }
    }
  }
}
```

Cambiar valores y reiniciar Expo para que surtan efecto.

### Google Cloud OAuth

- Client ID Web: necesario para Web y Expo Go (proxy).
- Client ID Android: crear con `package name` = `com.wadatrip.mobile` y SHA‑1 del keystore.
- Client ID iOS: opcional ahora; se añade cuando se tenga.

Authorized JavaScript origins (recomendados):
- `http://localhost`, `http://localhost:19006`, `http://localhost:19007`
- Opcional: `http://localhost:8082`, `http://127.0.0.1:19006`, `http://127.0.0.1:19007`

Authorized redirect URIs:
- Con proxy de Expo (desarrollo): `https://auth.expo.dev/@<tu-usuario-expo>/wadatrip-mobile`
- Legacy (si ya existe): `https://auth.expo.io/@<tu-usuario-expo>/wadatrip-mobile`

Nota: `AuthScreen` usa `useProxy: true`, por lo que no dependemos del puerto local.

### Firebase Console

- Authentication → Sign-in method → Habilitar Google y Email/Password.
- Settings → Authorized domains: añadir `localhost` y `auth.expo.dev` (y `auth.expo.io` si usas legacy).

### Probar

- Web: `npm run web` o `npx expo start --web`.
- Android (Expo Go): `npm run android:go` o `npx expo start --android`.
- Para ver el login si ya hay sesión: usa “Cerrar sesión” en Home o limpia el almacenamiento del sitio.

## Estructura del proyecto (resumen)

```
wadatrip-mobile/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   └── FlightPriceAlert.js
│   ├── screens/            # Pantallas de la aplicación
│   │   ├── FlightsScreen.js
│   │   ├── MyAlertsScreen.js
│   │   ├── ToursDealsScreen.js
│   │   ├── CommunityScreen.js
│   │   ├── ItineraryScreen.js   # accesible desde WadaAgent
│   │   └── LoginScreen.js
│   ├── services/           # Servicios y lógica de negocio
│   │   └── flightPriceMonitor.js
│   └── i18n/              # Configuración de internacionalización
│       ├── index.js
│       └── locales/
│           ├── en.json
│           ├── es.json
│           └── fr.json
├── assets/                 # Recursos estáticos
├── App.js                 # Componente principal
├── app.json              # Configuración de Expo
└── package.json          # Dependencias del proyecto
```

## Funcionalidades principales

- Tabs: Flights, Alerts, Tours & Deals, Community
- WadaAgent (overlay) con acción “Generate Itinerary” → navega a Itinerary
- Manejo de errores con mapeo por HTTP (400/401/500), retry y “Show details” (cuerpo JSON)
- Loading/Empty states en todas las vistas clave

## Notificaciones (Expo)

Para que las notificaciones funcionen correctamente:

1. **Permisos**: La app solicita permisos de notificación al usuario
2. **Expo Push Tokens**: En dev se omite si no hay `projectId` (no rompe el flujo)
3. **Configuración**: Canal Android “default”; alertas + sonido

## Hoy avanzamos

- Integración real con backend en Flights (`/pricing/predict`) y Alerts (`/alerts/list` + `/alerts/subscribe`).
- Nuevo `subscribeAlert` en `src/lib/api.ts` y errores HTTP con detalles (`status`, `body`).
- Tabs reconfiguradas: Flights, Alerts, Tours & Deals, Community.
- Itinerary movido al flujo de WadaAgent (no tab). Botón “Generate Itinerary” navega a `ItineraryScreen`.
- Community: usa Firestore `community_posts` (autor, mensaje, ubicación, fecha) + Snackbar de éxito + aviso inline si no hay permisos de ubicación.
- Tours & Deals: nueva pantalla `ToursDealsScreen` (Firestore `tours_deals`) con búsqueda por destino.
- Auth estable: `LoginScreen`, persistencia AsyncStorage (RN), owner/EAS removidos en dev, scripts con `npx expo`.
- Estabilización dev: dependencias congeladas para SDK 51; skip seguro de Expo push token cuando no hay projectId.

## Mañana (siguiente sprint corto)

- Seed/fixtures para `community_posts` y `tours_deals` (mejor demo inicial).
- Google Sign‑In nativo (expo-auth-session) con clientIds iOS/Android.
- Mejoras de UX:
  - Toast/feedback en Tours & Deals (e.g., al abrir enlaces o al no haber conexión).
  - “Show details” también para Alerts subscribe si backend responde JSON con error.
- Afinar validaciones (Flights date, Alerts body más flexible, límites de input).
- QA iOS/Android (permisos, teclado, layouts pequeños) + pequeñas mejoras de accesibilidad.
- (Opcional) Métricas anónimas de uso (eventos básicos) y logging de errores.

## Personalización

### Colores y temas

Los colores principales se pueden modificar en los archivos de componentes:
- Color primario: `#007bff`
- Color de fondo: `#f5f5f5`
- Color de texto: `#333`

### Traducciones

Para agregar nuevos idiomas:
1. Crear un nuevo archivo JSON en `src/i18n/locales/`
2. Agregar las traducciones correspondientes
3. Importar el archivo en `src/i18n/index.js`

## Troubleshooting

### Problemas comunes

1. **Error de Metro bundler**
   ```bash
   npx expo start --clear
   ```

2. **Problemas con dependencias**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Problemas con iOS Simulator**
   - Asegúrate de tener Xcode instalado
   - Verifica que el simulador esté funcionando

4. **Problemas con Android Emulator**
   - Asegúrate de tener Android Studio instalado
   - Verifica que el emulador esté ejecutándose

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Soporte

Para soporte técnico o preguntas, contacta a:
- Email: support@wadatrip.com
- Website: https://wadatrip.com
## Data Model (Firestore)

- `flightAlerts`: { uid, origin, destination, budget, maxWaitHours, status, createdAt }
- `tourAlerts`: { uid, destination, budgetMin, budgetMax, decisionDays, status, createdAt }
- `tourSearches`: { uid, destination, budgetMin, budgetMax, decisionDays, resultCount, createdAt }
- `tourRecommendations`: { uid, alertId, destination, recommendations[], createdAt }
- `communityMessages`: { uid, displayName, location, text, createdAt }

## Tours Providers & Aggregation

- Provider adapters in `src/services/providers/`:
  - `tripadvisorProvider.js`, `expediaProvider.js` (placeholders)
  - Standard shape via `providerInterfaces.js` (`normalizeTour`)
- Aggregation & ranking:
  - `src/services/toursAggregator.js` merges providers and ranks using `scoreTour` from `toursService`.
  - `toursService.js` keeps local MOCK data as fallback.

## Dev Cron Mock

For local/dev, simulate scheduled updates for tour alerts:

```js
import { runToursRefreshForUser } from './src/services/cronMock';
import { db, auth } from './src/services/firebase';
await runToursRefreshForUser(db, auth.currentUser.uid);
```

Writes top recommendations to `tourRecommendations` per alert.
## Build Troubleshooting (2025-09-17)

- .easignore actualizado para excluir .idea/, backend/, scripts/ y scripts *.ps1/*.sh, evitando rutas de Windows en el tarball.
- eas.json (perfil preview) ahora fuerza developmentClient=false y gradleCommand=:app:assembleRelease; producción también con developmentClient=false.
- Gradle limpiado (gradlew.bat clean + caches).
- EAS Build (preview) falla en "Prepare project build" con UNKNOWN_ERROR (ID 6850a823-9899-4c1e-a770-eb40a7701263); log vía CLI devuelve HTML porque requiere sesión.
- Tarball reproducido con eas build:inspect --stage archive, hash SHA256 F37D7F2096807CFC61007D565D7AE9A077060FDA4BEE676E313EA6CA3AF95D2A.
- Siguiente paso: descargar log autenticado desde https://expo.dev/.../6850a823-9899-4c1e-a770-eb40a7701263 o abrir ticket adjuntando el tarball.
