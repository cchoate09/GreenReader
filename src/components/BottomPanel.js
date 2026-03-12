import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { speedInfo, gradeLabel, aimPoint, compoundAimPoint, effectiveDistance, DEFAULT_STIMP } from '../utils/puttingPhysics';
import ElevationProfile from './ElevationProfile';

const STIMP_PRESETS = [
  { label: 'Slow',  value: 7  },
  { label: 'Med',   value: 9  },
  { label: 'Fast',  value: 11 },
  { label: 'Tour',  value: 13 },
];

const SPEED_COLORS = ['#4caf50', '#8bc34a', '#ffc107', '#ff9800', '#f44336'];

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statVal}>{value}</Text>
    </View>
  );
}

function SpeedMeter({ level }) {
  const heights = [8, 14, 20, 26, 32];
  const color = SPEED_COLORS[Math.min(level - 1, 4)];
  return (
    <View style={styles.meter}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.meterBar,
            { height: h, backgroundColor: i < level ? color : 'rgba(255,255,255,0.12)' },
          ]}
        />
      ))}
    </View>
  );
}

export default function BottomPanel({
  distance,
  onDistanceChange,
  slopeX,
  slopeY,
  hasSlope,
  onReadSlope,
  onReset,
  onFindHole,
  onResetHole,
  isScanning,
  isUserPlacedHole,
  greenSpeed = DEFAULT_STIMP,
  onGreenSpeedChange,
  onStimpCalibrate,
  onPreview,
  isAnimating,
  slopeReadings,
}) {
  const { width: screenW } = useWindowDimensions();
  const hasMulti = slopeReadings && slopeReadings.length > 1;

  const speed    = hasSlope ? speedInfo(slopeY, distance) : null;
  const grade    = hasSlope ? gradeLabel(slopeY) : '—';
  const aim      = hasSlope
    ? (hasMulti ? compoundAimPoint(slopeReadings, distance, greenSpeed) : aimPoint(slopeX, distance, greenSpeed, slopeY))
    : null;
  const playDist = hasSlope ? effectiveDistance(slopeY, distance, greenSpeed) : null;

  const aimStr  = aim ? aim.label : '—';
  const playStr = playDist != null ? `${playDist} ft` : '—';

  return (
    <View style={styles.panel}>
      {/* Distance row */}
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>Distance</Text>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={50}
          step={1}
          value={distance}
          onValueChange={onDistanceChange}
          minimumTrackTintColor="#4caf50"
          maximumTrackTintColor="rgba(255,255,255,0.18)"
          thumbTintColor="#4caf50"
        />
        <Text style={styles.distVal}>{distance} ft</Text>
      </View>

      {/* Green speed row: presets + calibrate */}
      <View style={styles.stimpRow}>
        <Text style={styles.stimpLabel}>Speed</Text>
        <View style={styles.stimpBtns}>
          {STIMP_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.stimpBtn, greenSpeed === p.value && styles.stimpBtnActive]}
              onPress={() => onGreenSpeedChange?.(p.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stimpBtnText, greenSpeed === p.value && styles.stimpBtnTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.stimpCalBtn} onPress={onStimpCalibrate} activeOpacity={0.7}>
            <Text style={styles.stimpCalText}>Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Elevation profile (shown when multi-point readings exist) */}
      {hasSlope && slopeReadings?.length > 0 && (
        <View style={styles.elevRow}>
          <ElevationProfile
            width={screenW - 28}
            slopeReadings={slopeReadings}
            distance={distance}
          />
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Aim" value={aimStr} />
        <StatCard label="Play as" value={playStr} />
        <StatCard label="Grade" value={grade} />
      </View>

      {/* Speed card */}
      <View style={[styles.speedCard, { marginBottom: 8 }]}>
        <View>
          <Text style={styles.speedLbl}>Speed</Text>
          <Text style={styles.speedVal}>{speed ? speed.label : '—'}</Text>
          <Text style={styles.speedDesc}>{speed ? speed.desc : 'Capture slope to begin'}</Text>
        </View>
        {speed && <SpeedMeter level={speed.level} />}
      </View>

      {/* Hole + Preview row */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnHole, isScanning && styles.btnDisabled]}
          onPress={onFindHole}
          activeOpacity={0.7}
          disabled={isScanning}
        >
          <Text style={styles.btnHoleText}>
            {isScanning ? 'Scanning...' : 'Find Hole'}
          </Text>
        </TouchableOpacity>
        {hasSlope && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPreview, isAnimating && styles.btnDisabled]}
            onPress={onPreview}
            activeOpacity={0.7}
            disabled={isAnimating}
          >
            <Text style={styles.btnPreviewText}>
              {isAnimating ? 'Rolling...' : 'Preview'}
            </Text>
          </TouchableOpacity>
        )}
        {isUserPlacedHole && (
          <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 0.45 }]} onPress={onResetHole} activeOpacity={0.7}>
            <Text style={styles.btnOutlineText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slope buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={onReadSlope} activeOpacity={0.7}>
          <Text style={styles.btnOutlineText}>
            {hasMulti ? `Read Slope (${slopeReadings.length}pt)` : 'Read Slope'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onReset} activeOpacity={0.7}>
          <Text style={styles.btnPrimaryText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },

  // Distance
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  distLabel: { fontSize: 11, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: 0.5 },
  slider: { flex: 1, height: 40 },
  distVal: { fontSize: 18, fontWeight: '800', color: '#4caf50', minWidth: 44, textAlign: 'right' },

  // Green speed
  stimpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  stimpLabel: { fontSize: 11, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: 0.5 },
  stimpBtns: { flex: 1, flexDirection: 'row', gap: 5 },
  stimpBtn: {
    flex: 1, paddingVertical: 5, borderRadius: 8, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  stimpBtnActive: { backgroundColor: 'rgba(76,175,80,0.25)', borderColor: '#4caf50' },
  stimpBtnText: { fontSize: 11, fontWeight: '600', color: '#9e9e9e' },
  stimpBtnTextActive: { color: '#4caf50' },
  stimpCalBtn: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: 'rgba(33,150,243,0.18)', borderWidth: 1, borderColor: 'rgba(33,150,243,0.4)',
  },
  stimpCalText: { fontSize: 11, fontWeight: '600', color: '#64b5f6' },

  // Elevation
  elevRow: { marginBottom: 8 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1, borderColor: 'rgba(76,175,80,0.22)', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center',
  },
  statLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9e9e9e', marginBottom: 2 },
  statVal: { fontSize: 17, fontWeight: '800', color: '#4caf50' },

  // Speed
  speedCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)',
    borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 10,
  },
  speedLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, color: '#9e9e9e', marginBottom: 2 },
  speedVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  speedDesc: { fontSize: 11, color: '#90a4ae', marginTop: 2 },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 32 },
  meterBar: { width: 8, borderRadius: 3 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4caf50' },
  btnPrimaryText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  btnOutlineText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnHole: { backgroundColor: '#1565c0' },
  btnHoleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnPreview: { backgroundColor: '#7b1fa2' },
  btnPreviewText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.55 },
});
