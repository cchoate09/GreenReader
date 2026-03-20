import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Dynamically require ads module so Expo Go can skip the native dependency.
let BannerAd, BannerAdSize, TestIds;
let adsAvailable = false;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
  adsAvailable = true;
} catch (_) {
  // Native ads module is not available in Expo Go.
}

// iOS stays disabled in production until a real banner unit is provisioned.
const AD_UNIT_ID = adsAvailable
  ? (__DEV__
      ? TestIds.ADAPTIVE_BANNER
      : Platform.select({
          ios: null,
          android: 'ca-app-pub-8879184280264151/6176886607',
        }))
  : null;

export default function AdBanner() {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

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
          if (__DEV__) {
            console.warn('[AdBanner] Failed to load:', error);
          }
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
