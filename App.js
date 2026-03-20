import React, { useState, useCallback, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useCameraPermissions } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import { Alert, Platform } from 'react-native';
import PermissionScreen from './src/screens/PermissionScreen';
import MainScreen from './src/screens/MainScreen';

// Initialize Mobile Ads SDK. Skip quietly when the native module is unavailable.
try {
  const mobileAds = require('react-native-google-mobile-ads').default;
  mobileAds()
    .initialize()
    .then(() => {
      if (__DEV__) {
        console.log('[AdMob] SDK initialized');
      }
    })
    .catch((err) => {
      if (__DEV__) {
        console.warn('[AdMob] Init error:', err);
      }
    });
} catch (_) {
  if (__DEV__) {
    console.log('[AdMob] Native module not available (Expo Go) - ads disabled');
  }
}

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);

  // Auto-skip welcome screen if permissions are already granted.
  useEffect(() => {
    if (checked) return;
    if (cameraPermission == null) return;
    setChecked(true);
    if (cameraPermission.granted) {
      if (Platform.OS === 'android') {
        setReady(true);
      } else {
        DeviceMotion.getPermissionsAsync().then(({ status }) => {
          if (status === 'granted') setReady(true);
        });
      }
    }
  }, [cameraPermission, checked]);

  const handleEnable = useCallback(async () => {
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
