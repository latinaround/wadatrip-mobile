## Build & Auth Notes (2025-09-17 PM)

- **Stripe**
  - Backend (gateway + community analytics) usa `STRIPE_SECRET_KEY`; la app Expo lee `EXPO_PUBLIC_STRIPE_KEY` (o `STRIPE_PUBLISHABLE_KEY` como respaldo) desde `app.config.ts` o variables de entorno.
  - Para trabajar con el backend local: `python -m venv .venv && pip install -r backend/community_analytics/requirements.txt`; antes de un build `Remove-Item backend/community_analytics/.venv -Recurse -Force`.
- **EAS build limpio**
  - `.easignore` excluye `backend/`, `scripts/`, `**/.venv`, `**/__pycache__`. Ejecuta `attrib -R *.* /S /D`, luego `gradlew clean` y `eas build --platform android --profile preview --clear-cache`.
  - Si falla, usa `eas build:inspect -p android -s archive -e preview -o ./eas-inspect --force` y revisa `project.tar.gz` (solo debe contener la app Expo).
- **Android package alignment**
  - Código nativo en `android/app/src/main/java/com/kiaradiaz0249/wadatripweb/` y `AndroidManifest.xml` con `package="com.kiaradiaz0249.wadatripweb"`.
  - Deep links habilitados: `wadatrip`, `com.kiaradiaz0249.wadatripweb`, `com.wadatrip.mobile`.
- **Firebase / Google Auth**
  - Obtén el SHA-1 del keystore administrado por Expo: `eas credentials -p android --profile preview` -> descarga keystore -> `keytool -list -v -keystore <archivo>` (usa la contraseña que imprime la CLI).
  - Registra el SHA-1 en Firebase (`com.kiaradiaz0249.wadatripweb`), descarga el nuevo `android/app/google-services.json` y actualiza los IDs en `app.json` si generas un nuevo client ID.
  - Mientras Google Sign-In se termina de configurar, habilita Email/Password en Firebase y usa ese flujo en `LoginScreen`.
- **Checklist antes de lanzar**
  - Reemplazar `google-services.json`, `gradlew clean`, build EAS.
  - Verificar `/payments/create-intent` (Stripe real) y login Google + email/password en dispositivo físico.

- **Backend Alerts**
  - Servicio FastAPI desplegable vía Render/Railway usando `render.yaml` y `backend/community_analytics/Dockerfile`.
  - Define `EXPO_PUBLIC_API_BASE_URL` con la URL pública y `EXPO_PUBLIC_API_FALLBACK_URL` como respaldo; la app vuelve a intentar con el fallback si `10.0.2.2` no responde.
## Progress Notes (2025-09-18)

### Done Today
- Recortado `android/app/google-services.json` al unico cliente Android valido (SHA d5511f1a...) y sincronizados los IDs en `app.json`.
- `src/services/firebase.js` y `src/lib/api.ts` ahora leen credenciales/base URL desde `expo.extra` / env y aplican fallback automatico cuando `10.0.2.2` falla.
- `.env.development` y `app.json` exponen `EXPO_PUBLIC_API_BASE_URL` y `EXPO_PUBLIC_API_FALLBACK_URL` para builds locales y remotas.
- Se agrego Dockerfile, .dockerignore, Procfile, runtime.txt y `render.yaml` para desplegar el backend `community_analytics` en Render/Railway; README actualizado con instrucciones de despliegue.
- `LoginScreen` mejora los mensajes de error (muestra `error.code`) para depurar flujos de Auth.

### To-Do (mañana)
1. Desplegar el backend alerts (Render/Railway/Heroku) y apuntar `EXPO_PUBLIC_API_BASE_URL`/`API_FALLBACK_URL` a la URL publica definitiva.
2. Probar Google Sign-In en build fisica con el SHA-1 actualizado y ajustar credenciales si aparece error.
3. Diseñar endpoints backend para operadores/itinerarios y conectar `ProviderSignupScreen` / `CreateListingScreen`.
4. Integrar motor de itinerarios + ADRED y validar consumo desde Itinerary/Flights/Alerts.
5. Finalizar flujo de pagos con Stripe (`/payments/create-intent` + checkout) y refinar vistas de itinerarios (economico/balanceado/premium).
6. Validar API de alerts con usuarios reales y notificaciones push.
7. Planificar mejoras de UI/UX (paleta turquesa+naranja, login, itinerarios, checkout) una vez cerradas las funciones clave.

## Progress Notes (2025-09-19)

### Done Today
- Renombrado el workspace raiz a `wadatrip`, regenerado `yarn.lock` y `.yarn/install-state.gz` con Yarn 4 y verificado los workspaces.
- Publicado `.render.yaml` para desplegar `services/alerts` en Render con build/start commands basados en Yarn.
- Sanitizadas referencias a Stripe: claves fuera del repo y `.env.example`/README apuntando a variables de entorno.
- Documentado el uso del blueprint de Render y las variables requeridas para despliegue.

### To-Do (manana)
1. Lanzar el servicio Alerts en Render con `render blueprint launch .render.yaml` y registrar `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`.
2. Validar la URL publica (`/alerts`, `/payments/create-intent`) y propagarla a `EXPO_PUBLIC_API_BASE_URL`/fallback.
3. Sincronizar Expo (`app.config.ts`, `.env.development`) y ejecutar `eas build --platform android --profile preview --clear-cache`.
4. Probar el build en dispositivo, verificando login, alerts y Stripe end-to-end, y retomar el backlog de operadores/itinerarios, ADRED, checkout y UI/UX.

