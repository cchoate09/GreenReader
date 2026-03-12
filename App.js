import React, { useState, useCallback } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useCameraPermissions } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import { Alert, Platform } from 'react-native';
import PermissionScreen from './src/screens/PermissionScreen';
import MainScreen from './src/screens/MainScreen';

// Initialize Mobile Ads SDK (gracefully skips in Expo Go where native module is absent)
try {
  const mobileAds = require('react-native-google-mobile-ads').default;
  mobileAds()
    .initialize()
    .then(() => console.log('[AdMob] SDK initialized'))
    .catch((err) => console.warn('[AdMob] Init error:', err));
} catch (_) {
  console.log('[AdMob] Native module not available (Expo Go) — ads disabled');
}

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);

  const handleEnable = useCallback(async () => {
    // 1. Camera permission
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Required',
          'GreenReader needs camera access for the AR overlay. Please allow it in Settings.',
        );
        return;
      }
    }

    // 2. Motion sensors — iOS only needs explicit check;
    //    DeviceMotion from expo-sensors requests automatically on first .addListener()
    if (Platform.OS === 'ios') {
      const { status } = await DeviceMotion.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Motion Sensors Required',
          'GreenReader needs motion sensor access to detect green slope. Please allow it in Settings.',
        );
        return;
      }
    }

    setReady(true);
  }, [cameraPermission, requestCameraPermission]);

  return (
    <>
      <StatusBar style="light" />
      {ready ? (
        <MainScreen />
      ) : (
        <PermissionScreen onEnable={handleEnable} />
      )}
    </>
  );
}

registerRootComponent(App);
