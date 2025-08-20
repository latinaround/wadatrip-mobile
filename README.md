# WadaTrip Mobile App

Aplicación móvil nativa para iOS y Android de WadaTrip, desarrollada con React Native y Expo.

## Características

- 📱 **Aplicación nativa** para iOS y Android
- 🌍 **Soporte multiidioma** (Español, Inglés, Francés)
- ✈️ **Alertas de precios de vuelos** con notificaciones push
- 🎨 **Interfaz moderna** y fácil de usar
- 🔔 **Notificaciones en tiempo real** cuando se encuentran precios objetivo
- 📊 **Monitoreo automático** de precios de vuelos

## Requisitos previos

- Node.js (versión 16 o superior)
- npm o yarn
- Expo CLI
- Para desarrollo iOS: Xcode (solo en macOS)
- Para desarrollo Android: Android Studio

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd wadatrip-mobile
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Instalar Expo CLI globalmente** (si no lo tienes)
   ```bash
   npm install -g @expo/cli
   ```

## Desarrollo

### Ejecutar en modo desarrollo

```bash
npx expo start
```

Esto abrirá Expo DevTools en tu navegador. Desde ahí puedes:

- **Escanear el código QR** con la app Expo Go en tu dispositivo móvil
- **Presionar 'i'** para abrir en el simulador de iOS (requiere Xcode)
- **Presionar 'a'** para abrir en el emulador de Android (requiere Android Studio)
- **Presionar 'w'** para abrir en el navegador web

### Ejecutar en dispositivos específicos

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Web
npx expo start --web
```

## Autenticación (Google, Email y Apple)

- Pantalla de autenticación: `src/screens/AuthScreen.js`.
- Flujo controlado en `App.js` con `onAuthStateChanged` (Firebase Auth).
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

## Estructura del proyecto

```
wadatrip-mobile/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   └── FlightPriceAlert.js
│   ├── screens/            # Pantallas de la aplicación
│   │   └── HomeScreen.js
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

### Alertas de precios de vuelos

- **Configuración de alertas**: Los usuarios pueden configurar alertas para rutas específicas
- **Monitoreo automático**: El sistema verifica precios cada 30 minutos
- **Notificaciones push**: Se envían notificaciones cuando se encuentran precios objetivo
- **Gestión de alertas**: Los usuarios pueden ver y cancelar alertas activas

### Soporte multiidioma

- **Detección automática**: La app detecta el idioma del dispositivo
- **Idiomas soportados**: Español, Inglés, Francés
- **Fallback**: Inglés como idioma por defecto

## Configuración de notificaciones

Para que las notificaciones funcionen correctamente:

1. **Permisos**: La app solicita permisos de notificación al usuario
2. **Expo Push Tokens**: Se generan automáticamente para cada dispositivo
3. **Configuración**: Las notificaciones están configuradas para mostrar alertas, sonidos y badges

## Build y distribución

### Build de desarrollo

```bash
# Para iOS
npx expo build:ios

# Para Android
npx expo build:android
```

### Build de producción con EAS

1. **Instalar EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Configurar EAS**
   ```bash
   eas build:configure
   ```

3. **Build para producción**
   ```bash
   # iOS
   eas build --platform ios
   
   # Android
   eas build --platform android
   
   # Ambas plataformas
   eas build --platform all
   ```

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
