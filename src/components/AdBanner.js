import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Dynamically require ads module — gracefully handles Expo Go where native module is absent
let BannerAd, BannerAdSize, TestIds;
let adsAvailable = false;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
  adsAvailable = true;
} catch (_) {
  // Native module not available (running in Expo Go)
}

// Test IDs in development, real IDs in production.
// Replace the production IDs with your actual AdMob ad unit IDs.
const AD_UNIT_ID = adsAvailable
  ? (__DEV__
      ? TestIds.ADAPTIVE_BANNER
      : Platform.select({
          ios: 'ca-app-pub-XXXX/YYYY',       // TODO: replace with real iOS ad unit ID
          android: 'ca-app-pub-8879184280264151/6176886607',
        }))
  : null;

export default function AdBanner() {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // No native ads module → render nothing
  if (!adsAvailable || !AD_UNIT_ID || adError) return null;

  return (
    <View style={[styles.container, !adLoaded && styles.hidden]}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.warn('[AdBanner] Failed to load:', error);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#000',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});
