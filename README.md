# GreenReader - Practice Putting Aid

Quick AR practice reads, break guidance, and pace recommendations for iOS and Android.

Built with Expo / React Native - one codebase, two platforms.

GreenReader is designed as a practice and training tool. Treat every read as guidance to compare against your own green-reading process, and check local or competition rules before using any device during play.

---

## Quick Start

```bash
cd GreenReader
npm install
npx expo start
```

- iPhone: install Expo Go from the App Store and scan the QR code
- Android: install Expo Go from Google Play and scan the QR code

---

## How the App Works

| Step | Action |
|------|--------|
| 1 | Open the app and tap **Enable Camera & Sensors** |
| 2 | Tap **Read Slope** and lay the phone flat near your ball |
| 3 | Tap **Set Hole** and stand at the ball to place the cup |
| 4 | Review the quick **Aim** and **Play As** outputs |
| 5 | Open **Advanced + Training** only when you want grain, speed tests, multi-point reads, or training mode |

Android tip: the hardware back button closes calibration, hole placement, preview, and training overlays.

---

## Sensor Tech

| Sensor | Use |
|--------|-----|
| DeviceMotion `gamma` | Left/right tilt for break direction and amount |
| DeviceMotion `beta` | Front/back tilt for uphill / downhill grade |
| Rear camera | Live AR background only - no video is stored |

### Physics Model

- Break is estimated with a distance-squared relationship scaled by slope and green speed.
- Pace is presented as a "play as" distance rather than a raw force number.
- The AR curve maps the read into screen-space control points for the projected path.
- This pass adds read-quality scoring and a simpler default flow; it does not change the underlying formulas.

---

## Product Direction

- Default mode is a quick practice read: single slope capture, manual hole placement, confidence badge, and simple output cards.
- Advanced settings hide green speed, grain, multi-point reads, speed testing, and training mode until the user asks for them.
- Training mode lets the golfer guess the read first, then compare against the measured output.

---

## Build & Publish

### Prerequisites

```bash
npm install -g eas-cli
eas login
```

### iOS

Requires an Apple Developer account.

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

### Android

Requires a Google Play Developer account.

```bash
npm run release:check
npm run release:android:bundle
eas submit --platform android --profile production
```

Local submit credentials should live at `.secrets/google-play-key.json`, which is ignored by git.

### Preview APK

```bash
eas build --platform android --profile preview
```

### Release Notes

- Android production signing expects your local upload key and `android/keystore.properties`.
- iOS release values are intentionally not checked in yet; add real App Store Connect and AdMob iOS values when you are ready to ship iOS.

---

## Project Structure

```text
GreenReader/
|-- App.js
|-- app.json
|-- eas.json
|-- package.json
`-- src/
    |-- screens/
    |   |-- PermissionScreen.js
    |   `-- MainScreen.js
    |-- components/
    |   |-- BottomPanel.js
    |   |-- CalibrationOverlay.js
    |   |-- GuessOverlay.js
    |   |-- PreviewMetrics.js
    |   |-- PuttingOverlay.js
    |   `-- StimpCalibration.js
    |-- hooks/
    |   |-- useMotionSensors.js
    |   `-- usePuttSession.js
    `-- utils/
        |-- advancedSettingsStorage.js
        |-- puttRead.js
        |-- puttingPhysics.js
        `-- readQuality.js
```
