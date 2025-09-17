<#
  WadaTrip Mobile - Dev Clean & Align (SDK 51)

  Uso (PowerShell):
  1) Abrir PowerShell en la carpeta del proyecto (wadatrip-mobile)
  2) Ejecutar:  ./scripts/dev-clean.ps1 -Mode managed
     -Mode managed  → Expo Go (rápido para probar)
     -Mode prebuild → Sincroniza nativo y compila APK local

  Variables útiles (persisten en nueva terminal):
    setx EXPO_PUBLIC_BYPASS_AUTH true
    setx EXPO_PUBLIC_SIMPLE_FLIGHTS true
    setx EXPO_PUBLIC_DISABLE_PAPER false
    setx EXPO_PUBLIC_MINIMAL_NAV false

  Nota: Este script no instala Android Studio por ti; asume que el emulador está listo.
#>

param(
  [ValidateSet("managed", "prebuild")]
  [string]$Mode = "managed"
)

$ErrorActionPreference = 'Stop'
Write-Host "[DevClean] Modo: $Mode" -ForegroundColor Cyan

function Exec($cmd) {
  Write-Host "[DevClean] $cmd" -ForegroundColor Gray
  iex $cmd
}

# 1) Limpieza básica
if (Test-Path node_modules) {
  Write-Host "[DevClean] Eliminando node_modules" -ForegroundColor Yellow
  Remove-Item -Recurse -Force node_modules
}
if (Test-Path package-lock.json) {
  Write-Host "[DevClean] Eliminando package-lock.json" -ForegroundColor Yellow
  Remove-Item -Force package-lock.json
}

# 2) Reinstalar
Exec 'npm install'

# 3) Alinear dependencias con SDK 51 (deja que Expo fije pares compatibles)
Exec 'npx expo install expo@~51.0.39 expo-crypto@~13.0.2 expo-apple-authentication@~6.4.2 expo-linear-gradient react-native-paper'
Exec 'npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack'
Exec 'npx expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context'

# 4) Doctor
try { Exec 'npx expo doctor' } catch { Write-Warning "expo doctor reportó issues (revisar arriba)" }

if ($Mode -eq 'managed') {
  # 5a) Expo Go / managed
  Write-Host "[DevClean] Iniciando en modo managed (Expo Go) con cache limpio" -ForegroundColor Cyan
  Write-Host "[DevClean] Abre Android con la tecla 'a' en la consola de Expo" -ForegroundColor DarkCyan
  Exec 'npx expo start -c --tunnel'
} else {
  # 5b) Prebuild / bare
  Write-Host "[DevClean] Sincronizando cambios nativos (prebuild)" -ForegroundColor Cyan
  # Conserva google-services.json si existe
  $gjson = 'android/app/google-services.json'
  $hadGJson = Test-Path $gjson
  if ($hadGJson) { Copy-Item $gjson 'google-services.backup.json' -Force }

  Exec 'npx expo prebuild --platform android'

  if ($hadGJson -and (Test-Path 'google-services.backup.json')) {
    Copy-Item 'google-services.backup.json' $gjson -Force
    Remove-Item 'google-services.backup.json' -Force
  }

  Exec 'npx expo run:android'
}

