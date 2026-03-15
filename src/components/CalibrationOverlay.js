import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

const LEVEL_SIZE = 130;
const BUBBLE_SIZE = 24;
const MAX_TILT_DEG = 15;
const HALF = LEVEL_SIZE / 2;

const STEPS = [
  { label: 'At the ball', pos: 0 },
  { label: 'Halfway to hole', pos: 0.5 },
  { label: 'Near the hole', pos: 1.0 },
];

/**
 * Calibration overlay for quick single reads and advanced compound reads.
 *
 * Props:
 *   mode         – 'single' | 'compound'
 *   gamma, beta  – live tilt degrees
 *   liveText     – live slope string
 *   onCapture    – receives array [{ slopeX, slopeY, pos, stabilityScore, gammaStd, betaStd, sampleCount }, ...]
 *   onCancel     – close overlay
 */
export default function CalibrationOverlay({ mode, gamma, beta, liveText, onCapture, onCancel }) {
  const bubbleX = useRef(new Animated.Value(HALF)).current;
  const bubbleY = useRef(new Animated.Value(HALF)).current;

  // Rolling average buffer — smooths sensor noise over ~1 second (10 samples at 100ms)
  const BUFFER_SIZE = 10;
  const gammaBuffer = useRef([]);
  const betaBuffer  = useRef([]);

  // Multi-step state
  const [readings, setReadings] = useState([]);
  const [step, setStep] = useState(0);         // which step is next to capture
  const [overlayMode, setOverlayMode] = useState('capturing'); // 'capturing' | 'between'
  const isSingleRead = mode === 'single';

  const stdDev = useCallback((values) => {
    if (!values.length) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
    return Math.sqrt(variance);
  }, []);

  const clearBuffers = useCallback(() => {
    gammaBuffer.current = [];
    betaBuffer.current = [];
  }, []);

  useEffect(() => {
    clearBuffers();
    setReadings([]);
    setStep(0);
    setOverlayMode('capturing');
  }, [mode, clearBuffers]);

  useEffect(() => {
    // Push to rolling buffer
    gammaBuffer.current.push(gamma);
    betaBuffer.current.push(beta);
    if (gammaBuffer.current.length > BUFFER_SIZE) gammaBuffer.current.shift();
    if (betaBuffer.current.length > BUFFER_SIZE)  betaBuffer.current.shift();

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const maxTravel = HALF - BUBBLE_SIZE / 2 - 4;
    const nx = HALF + clamp((gamma / MAX_TILT_DEG) * maxTravel, -maxTravel, maxTravel);
    const ny = HALF + clamp((beta  / MAX_TILT_DEG) * maxTravel, -maxTravel, maxTravel);
    Animated.parallel([
      Animated.spring(bubbleX, { toValue: nx, useNativeDriver: false, speed: 20, bounciness: 0 }),
      Animated.spring(bubbleY, { toValue: ny, useNativeDriver: false, speed: 20, bounciness: 0 }),
    ]).start();
  }, [gamma, beta]);

  const capture = useCallback(() => {
    // Use averaged sensor values to filter noise
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const smoothGamma = avg(gammaBuffer.current);
    const smoothBeta  = avg(betaBuffer.current);
    const gammaStd = stdDev(gammaBuffer.current);
    const betaStd = stdDev(betaBuffer.current);
    const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - ((gammaStd + betaStd) * 60))));
    const sampleCount = Math.min(gammaBuffer.current.length, betaBuffer.current.length);
    const nextReading = {
      slopeX: smoothGamma,
      slopeY: smoothBeta,
      pos: STEPS[step].pos,
      stabilityScore,
      gammaStd,
      betaStd,
      sampleCount,
    };
    const newReadings = [...readings, nextReading];

    if (isSingleRead) {
      onCapture([nextReading]);
      return;
    }

    setReadings(newReadings);

    if (step >= 2) {
      // Final step — auto-finish
      onCapture(newReadings);
    } else {
      setOverlayMode('between');
    }
  }, [isSingleRead, onCapture, readings, step, stdDev]);

  const nextPoint = useCallback(() => {
    clearBuffers();
    setStep((s) => s + 1);
    setOverlayMode('capturing');
  }, [clearBuffers]);

  const finish = useCallback(() => {
    if (readings.length > 0) onCapture(readings);
  }, [readings, onCapture]);

  const stepInfo = STEPS[step];
  const isCapturing = overlayMode === 'capturing';
  const readingCount = readings.length;
  const visibleSteps = isSingleRead ? [STEPS[0]] : STEPS;

  return (
    <View style={styles.overlay}>
      {/* Step indicator */}
      <View style={styles.stepRow}>
        {visibleSteps.map((s, i) => (
          <View key={i} style={[styles.stepDot, i < readingCount && styles.stepDotDone, i === step && isCapturing && styles.stepDotActive]} />
        ))}
      </View>

      {isCapturing && (
        <>
          {/* Bubble level */}
          <View style={styles.levelContainer}>
            <View style={styles.crossH} />
            <View style={styles.crossV} />
            <View style={styles.targetRing} />
            <Animated.View
              style={[
                styles.bubble,
                {
                  left: Animated.subtract(bubbleX, BUBBLE_SIZE / 2),
                  top:  Animated.subtract(bubbleY, BUBBLE_SIZE / 2),
                },
              ]}
            />
          </View>

          <Text style={styles.title}>
            {isSingleRead
              ? 'Quick Read'
              : readingCount === 0
                ? 'Advanced Read'
                : `Step ${step + 1}: ${stepInfo.label}`}
          </Text>
          <Text style={styles.desc}>
            {isSingleRead
              ? 'Lay your phone flat by the ball with the top edge pointed at the hole.'
              : readingCount === 0
                ? 'Lay phone flat (face up) on the green near your ball, top edge toward the hole.'
                : `Lay phone flat ${stepInfo.label.toLowerCase()}, top edge toward hole.`}
          </Text>
          <Text style={styles.liveText}>{liveText || 'Waiting for motion data...'}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={capture} activeOpacity={0.7}>
              <Text style={styles.btnPrimaryText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!isCapturing && (
        <>
          <Text style={styles.title}>Reading {readingCount} Captured</Text>
          <Text style={styles.capturedInfo}>
            {readings.map((r, i) => `${STEPS[i].label}: ${Math.sqrt(r.slopeX ** 2 + r.slopeY ** 2).toFixed(1)}\u00B0`).join('\n')}
          </Text>
          <Text style={styles.desc}>
            Add another reading for a more accurate compound read, or tap Done.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={finish} activeOpacity={0.7}>
              <Text style={styles.btnOutlineText}>Done</Text>
            </TouchableOpacity>
            {step < 2 && (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={nextPoint} activeOpacity={0.7}>
                <Text style={styles.btnPrimaryText}>Next: {STEPS[step + 1].label}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotDone: { backgroundColor: '#4caf50' },
  stepDotActive: { backgroundColor: '#ff9800', transform: [{ scale: 1.3 }] },
  levelContainer: {
    width: LEVEL_SIZE, height: LEVEL_SIZE,
    borderRadius: LEVEL_SIZE / 2,
    borderWidth: 2, borderColor: 'rgba(255,152,0,0.55)',
    backgroundColor: 'rgba(255,152,0,0.06)',
    marginBottom: 24, overflow: 'hidden', position: 'relative',
  },
  crossH: {
    position: 'absolute', left: 0, right: 0, top: HALF - 0.5,
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  crossV: {
    position: 'absolute', top: 0, bottom: 0, left: HALF - 0.5,
    width: 1, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  targetRing: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    left: HALF - 11, top: HALF - 11,
  },
  bubble: {
    position: 'absolute', width: BUBBLE_SIZE, height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2, backgroundColor: '#ff9800',
    shadowColor: '#ff9800', shadowOpacity: 0.8, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#ff9800', marginBottom: 8 },
  desc: {
    fontSize: 14, color: '#9e9e9e', lineHeight: 21, textAlign: 'center',
    maxWidth: 280, marginBottom: 6,
  },
  capturedInfo: {
    fontSize: 13, color: '#4caf50', fontWeight: '600',
    textAlign: 'center', lineHeight: 22, marginBottom: 12,
  },
  liveText: {
    fontSize: 13, color: '#ff9800', fontWeight: '600',
    minHeight: 20, marginBottom: 28, textAlign: 'center',
  },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 300 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4caf50' },
  btnPrimaryText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  btnOutlineText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
