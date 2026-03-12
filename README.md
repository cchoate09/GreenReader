# GreenReader — Putting Simulator

AR putting line, break detection, and speed recommendations for **iOS and Android**.

Built with Expo / React Native — one codebase, two platforms.

---

## Quick Start (no Xcode or Android Studio needed)

```bash
cd GreenReader
npm install
npx expo start
```

- **iPhone** → install **Expo Go** from the App Store, scan the QR code
- **Android** → install **Expo Go** from Google Play, scan the QR code

---

## How the App Works

| Step | Action |
|------|--------|
| 1 | Open app → tap **Enable Camera & Sensors** |
| 2 | Tap **Read Slope** → lay phone flat on green near ball |
| 3 | Watch the bubble level settle, tap **Capture Slope** |
| 4 | Pick up phone, set the distance, aim camera at the hole |
| 5 | Follow the **yellow aim line** and **speed card** |

**Android tip:** Press the hardware back button to dismiss the calibration overlay.

---

## Sensor Tech

| Sensor | Use |
|--------|-----|
| DeviceMotion `gamma` | Left/right tilt → break direction & amount |
| DeviceMotion `beta`  | Front/back tilt → uphill / downhill grade |
| Camera (rear)        | AR background — no video is stored |

### Physics Model

- **Break** `≈ slopeAngle° × distance² × 0.018` inches
  _(3° slope, 15 ft → ~12")_
- **Speed** is categorized 1–5 (Tap It → Full Commit) based on distance and grade
- The bezier curve maps break to pixel offset: `(slopeX / 45) × screenWidth × distanceFactor`

---

## Build & Publish

### Prerequisites

```bash
npm install -g eas-cli
eas login          # create a free Expo account at expo.dev
```

### iOS (App Store)

Requires: Apple Developer account ($99/yr)

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

### Android (Google Play)

Requires: Google Play Developer account ($25 one-time)

```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

### Both at once

```bash
eas build --platform all --profile production
```

### Preview APK (sideload to Android — no Play Store needed)

```bash
eas build --platform android --profile preview
# Download the .apk from the EAS dashboard and install directly on your device
```

---

## Before Submitting

### `app.json` — update these values

| Field | Where | What to set |
|-------|-------|-------------|
| `ios.bundleIdentifier` | `app.json` | Your reverse-domain ID, e.g. `com.johndoe.greenreader` |
| `android.package` | `app.json` | Same format, e.g. `com.johndoe.greenreader` |
| `android.versionCode` | `app.json` | Increment for every Play Store build |

### `eas.json` — update these values for submission

| Field | Value |
|-------|-------|
| `submit.production.ios.appleId` | Your Apple ID email |
| `submit.production.ios.ascAppId` | App ID from App Store Connect |
| `submit.production.ios.appleTeamId` | Your Apple Developer Team ID |
| `submit.production.android.serviceAccountKeyPath` | Path to your Google Play JSON key |

### Assets needed

- `assets/icon.png` — 1024×1024 (iOS + Android)
- `assets/splash.png` — 1284×2778 recommended
- `assets/adaptive-icon.png` — 1024×1024 (Android adaptive icon foreground)

---

## Project Structure

```
GreenReader/
├── App.js                        ← entry point, permissions (iOS + Android)
├── app.json                      ← Expo config for both platforms
├── eas.json                      ← EAS Build profiles (dev / preview / production)
├── package.json
└── src/
    ├── screens/
    │   ├── PermissionScreen.js   ← welcome / onboarding
    │   └── MainScreen.js         ← camera + AR + Android BackHandler
    ├── components/
    │   ├── PuttingOverlay.js     ← SVG AR line (react-native-svg)
    │   ├── CalibrationOverlay.js ← animated bubble level + capture UI
    │   └── BottomPanel.js        ← distance slider, stats, speed card, buttons
    ├── hooks/
    │   └── useMotionSensors.js   ← expo-sensors DeviceMotion hook
    └── utils/
        └── puttingPhysics.js     ← break calc, speed labels, grade labels
```
