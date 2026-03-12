import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { stimpFromRollTest, DEFAULT_STIMP } from '../utils/puttingPhysics';

const fmt = (t) => {
  const s = Math.floor(t);
  const tenths = Math.floor((t - s) * 10);
  return `${s}.${tenths}`;
};

const stimpLabel = (s) => {
  if (s <= 6)  return 'Very slow';
  if (s <= 8)  return 'Slow — municipal';
  if (s <= 10) return 'Medium — private club';
  if (s <= 12) return 'Fast — tournament';
  return 'Very fast — tour level';
};

/**
 * Full-screen overlay for measuring green speed via a timed roll test.
 *
 * Flow: ready → timing → stopped (enter distance) → result → apply/retry
 */
export default function StimpCalibration({ onResult, onCancel }) {
  const [phase, setPhase] = useState('ready'); // ready | timing | stopped | result
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(10);
  const [stimp, setStimp] = useState(null);
  const intervalRef = useRef(null);
  const startRef = useRef(0);

  // Clean up timer on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const startTimer = useCallback(() => {
    setPhase('timing');
    setElapsed(0);
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 50);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    setElapsed((Date.now() - startRef.current) / 1000);
    setPhase('stopped');
  }, []);

  const calculate = useCallback(() => {
    const s = stimpFromRollTest(elapsed, distance);
    setStimp(s);
    setPhase('result');
  }, [elapsed, distance]);

  const retry = useCallback(() => {
    setPhase('ready');
    setElapsed(0);
    setStimp(null);
  }, []);

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>Green Speed Test</Text>

      {phase === 'ready' && (
        <View style={styles.instrBox}>
          <Text style={styles.instrItem}>1. Find a flat section of green</Text>
          <Text style={styles.instrItem}>2. Roll a ball with moderate force</Text>
          <Text style={styles.instrItem}>3. Tap START when ball begins rolling</Text>
          <Text style={styles.instrItem}>4. Tap STOP when ball stops</Text>
          <Text style={styles.instrItem}>5. Enter how far it rolled</Text>
        </View>
      )}

      {/* Stopwatch */}
      <Text style={styles.timer}>{fmt(elapsed)}s</Text>

      {phase === 'ready' && (
        <TouchableOpacity style={styles.goBtn} onPress={startTimer} activeOpacity={0.7}>
          <Text style={styles.goBtnText}>START</Text>
        </TouchableOpacity>
      )}

      {phase === 'timing' && (
        <TouchableOpacity style={styles.stopBtn} onPress={stopTimer} activeOpacity={0.7}>
          <Text style={styles.stopBtnText}>STOP</Text>
        </TouchableOpacity>
      )}

      {phase === 'stopped' && (
        <>
          <View style={styles.distRow}>
            <Text style={styles.distLabel}>Ball rolled</Text>
            <Slider
              style={styles.distSlider}
              minimumValue={2}
              maximumValue={30}
              step={0.5}
              value={distance}
              onValueChange={setDistance}
              minimumTrackTintColor="#4caf50"
              maximumTrackTintColor="rgba(255,255,255,0.18)"
              thumbTintColor="#4caf50"
            />
            <Text style={styles.distVal}>{distance} ft</Text>
          </View>
          <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.7}>
            <Text style={styles.calcBtnText}>Calculate Speed</Text>
          </TouchableOpacity>
        </>
      )}

      {phase === 'result' && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Stimpmeter</Text>
          <Text style={styles.resultVal}>{stimp}</Text>
          <Text style={styles.resultDesc}>{stimpLabel(stimp)}</Text>
          <View style={styles.resultBtns}>
            <TouchableOpacity style={styles.applyBtn} onPress={() => onResult(stimp)} activeOpacity={0.7}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.7}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: '#4caf50', marginBottom: 16,
  },
  instrBox: { marginBottom: 20, alignSelf: 'stretch', paddingHorizontal: 16 },
  instrItem: { fontSize: 14, color: '#b0bec5', lineHeight: 24 },
  timer: {
    fontSize: 64, fontWeight: '200', color: '#fff',
    fontVariant: ['tabular-nums'], marginBottom: 24,
  },
  goBtn: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#4caf50', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  goBtnText: { fontSize: 24, fontWeight: '800', color: '#000' },
  stopBtn: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#f44336', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  stopBtnText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  distRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    alignSelf: 'stretch', marginBottom: 16,
  },
  distLabel: { fontSize: 13, color: '#9e9e9e', minWidth: 60 },
  distSlider: { flex: 1, height: 40 },
  distVal: { fontSize: 18, fontWeight: '800', color: '#4caf50', minWidth: 50, textAlign: 'right' },
  calcBtn: {
    backgroundColor: '#4caf50', paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 14, marginBottom: 24,
  },
  calcBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  resultBox: { alignItems: 'center', marginBottom: 24 },
  resultLabel: { fontSize: 13, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: 1 },
  resultVal: { fontSize: 56, fontWeight: '800', color: '#4caf50', marginVertical: 4 },
  resultDesc: { fontSize: 14, color: '#b0bec5', marginBottom: 16 },
  resultBtns: { flexDirection: 'row', gap: 12 },
  applyBtn: {
    backgroundColor: '#4caf50', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 14,
  },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 14,
  },
  retryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cancelBtn: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 50 : 32,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  cancelBtnText: { fontSize: 14, color: '#9e9e9e' },
});
