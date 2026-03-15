import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { getReadOutcome } from '../utils/puttRead';

function qualityColor(level) {
  if (level === 'high') return '#4caf50';
  if (level === 'medium') return '#ffb300';
  if (level === 'low') return '#ff7043';
  return '#90a4ae';
}

export default function PreviewMetrics({
  slope,
  settings,
  hole,
  readQuality,
  onClose,
}) {
  const outcome = getReadOutcome({
    hasSlope: slope.hasSlope,
    slopeX: slope.slopeX,
    slopeY: slope.slopeY,
    distance: settings.distance,
    greenSpeed: settings.greenSpeed,
    slopeReadings: slope.readings,
    grainDir: settings.grainDir,
  });

  const aimText = outcome.aim?.dir ? `${outcome.aim.inches}" ${outcome.aim.dirFull}` : 'Straight';
  const holeText = hole.source === 'manual' ? 'Manual hole' : 'Auto hole';

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={[styles.summaryPillText, { color: qualityColor(readQuality.level) }]}>
            {readQuality.label}
          </Text>
        </View>
        <Text style={styles.summaryMeta}>{holeText}</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>HIT IT</Text>
          <Text style={styles.metricValue}>{outcome.playDist} ft</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>AIM</Text>
          <Text style={[styles.metricValue, outcome.aim?.dir ? styles.metricAim : styles.metricStraight]}>
            {aimText}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeTxt}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 16,
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  summaryPill: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryMeta: {
    fontSize: 11,
    color: '#90a4ae',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9e9e9e',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4caf50',
  },
  metricAim: {
    color: '#ffeb3b',
  },
  metricStraight: {
    color: '#90caf9',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
