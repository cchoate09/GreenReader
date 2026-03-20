import React, { useState, useCallback, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useCameraPermissions } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import { Alert, Platform } from 'react-native';
import PermissionScreen from './src/screens/PermissionScreen';
import MainScreen from './src/screens/MainScreen';
import MonitoringBoundary from './src/components/MonitoringBoundary';
import {
  installGlobalErrorMonitoring,
  recordDiagnosticError,
  recordDiagnosticEvent,
} from './src/utils/fieldDiagnostics';

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
      recordDiagnosticError('admob-init', err, { platform: Platform.OS });
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

  useEffect(() => {
    const uninstall = installGlobalErrorMonitoring();
    recordDiagnosticEvent('app-session', 'App session started', {
      platform: Platform.OS,
    });

    return uninstall;
  }, []);

  // Auto-skip welcome screen if permissions are already granted.
  useEffect(() => {
    if (checked) return;
    if (cameraPermission == null) return;
    setChecked(true);
    if (cameraPermission.granted) {
      if (Platform.OS === 'android') {
        recordDiagnosticEvent('permissions-ready', 'Permissions already granted', {
          platform: Platform.OS,
        });
        setReady(true);
      } else {
        DeviceMotion.getPermissionsAsync()
          .then(({ status }) => {
            if (status === 'granted') {
              recordDiagnosticEvent('permissions-ready', 'Permissions already granted', {
                platform: Platform.OS,
              });
              setReady(true);
            }
          })
          .catch((error) => {
            recordDiagnosticError('motion-permission-check', error);
          });
      }
    }
  }, [cameraPermission, checked]);

  const handleEnable = useCallback(async () => {
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          recordDiagnosticEvent('permission-denied', 'Camera permission denied');
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
          recordDiagnosticEvent('permission-denied', 'Motion permission denied');
          Alert.alert(
            'Motion Sensors Required',
            'GreenReader needs motion sensor access to detect green slope. Please allow it in Settings.',
          );
          return;
        }
      }

      recordDiagnosticEvent('permissions-ready', 'Permissions granted from onboarding', {
        platform: Platform.OS,
      });
      setReady(true);
    } catch (error) {
      recordDiagnosticError('permissions-enable', error);
      Alert.alert(
        'Permission Error',
        'GreenReader ran into a problem while enabling permissions. Please try again.',
      );
    }
  }, [cameraPermission, requestCameraPermission]);

  return (
    <MonitoringBoundary>
      <StatusBar style="light" />
      {ready ? (
        <MainScreen />
      ) : (
        <PermissionScreen onEnable={handleEnable} />
      )}
    </MonitoringBoundary>
  );
}

registerRootComponent(App);
