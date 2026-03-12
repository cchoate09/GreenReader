import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { aimPoint, compoundAimPoint, effectiveDistance } from '../utils/puttingPhysics';

/**
 * Simplified full-screen preview overlay.
 * Shows only the two key putting metrics:
 *   1. How far to hit it (effective / playing distance)
 *   2. How far left/right to start the line (aim point)
 * Plus a close button to return to the full UI.
 */
export default function PreviewMetrics({
  slopeX,
  slopeY,
  distance,
  greenSpeed,
  slopeReadings,
  onClose,
}) {
  const hasMulti = slopeReadings && slopeReadings.length > 1;

  const aim = hasMulti
    ? compoundAimPoint(slopeReadings, distance, greenSpeed)
    : aimPoint(slopeX, distance, greenSpeed, slopeY);

  const playDist = effectiveDistance(slopeY, distance, greenSpeed);

  // Format aim as a simple direction string
  let aimText = 'Straight';
  if (aim.dir) {
    aimText = `${aim.inches}" ${aim.dirFull}`;
  }

  return (
    <View style={styles.container}>
      {/* Top metric: Hit distance */}
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>HIT IT</Text>
        <Text style={styles.metricValue}>{playDist} ft</Text>
        {playDist !== distance && (
          <Text style={styles.metricSub}>
            {playDist > distance ? 'Uphill' : 'Downhill'} — actual {distance} ft
          </Text>
        )}
      </View>

      {/* Bottom metric: Start line */}
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>START LINE</Text>
        <Text style={[styles.metricValue, aim.dir ? styles.metricAim : styles.metricStraight]}>
          {aimText}
        </Text>
        {aim.dir && (
          <Text style={styles.metricSub}>
            Aim {aim.dirFull} of the hole
          </Text>
        )}
      </View>

      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={styles.closeTxt}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    paddingTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  metricCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9e9e9e',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#4caf50',
  },
  metricAim: {
    color: '#ffeb3b',
  },
  metricStraight: {
    color: '#90caf9',
  },
  metricSub: {
    fontSize: 13,
    color: '#90a4ae',
    marginTop: 4,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 44,
    marginTop: 4,
  },
  closeTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
