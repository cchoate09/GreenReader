import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  BackHandler,
  StatusBar,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import PuttingOverlay from '../components/PuttingOverlay';
import CalibrationOverlay from '../components/CalibrationOverlay';
import BottomPanel from '../components/BottomPanel';
import StimpCalibration from '../components/StimpCalibration';
import PreviewMetrics from '../components/PreviewMetrics';
import AdBanner from '../components/AdBanner';
import { useMotionSensors } from '../hooks/useMotionSensors';
import { detectHoleInPhoto } from '../utils/holeDetection';
import { estimateDistanceFromScreen, DEFAULT_STIMP } from '../utils/puttingPhysics';

const ANDROID_STATUS_BAR = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

export default function MainScreen() {
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef(null);

  // Sensor data
  const { gamma, beta } = useMotionSensors();

  // Keep a ref to the latest beta so callbacks can read it without stale closures
  const betaRef = useRef(beta);
  betaRef.current = beta;

  // Green speed (Stimpmeter)
  const [greenSpeed, setGreenSpeed] = useState(DEFAULT_STIMP);

  // Slope state — now supports multi-point readings
  const [slopeReadings, setSlopeReadings] = useState([]); // [{slopeX, slopeY, pos}]
  const [slopeX, setSlopeX]     = useState(0);
  const [slopeY, setSlopeY]     = useState(0);
  const [hasSlope, setHasSlope] = useState(false);

  // Hole position state
  const [holePos, setHolePos]               = useState(null);
  const [isUserPlacedHole, setIsUserPlaced] = useState(false);
  const [isPlacingHole, setIsPlacingHole]   = useState(false);
  const [isScanning, setIsScanning]         = useState(false);

  // General UI state
  const [isCalibrating, setIsCalibrating]       = useState(false);
  const [isStimpCalibrating, setIsStimpCalibrating] = useState(false);
  const [distance, setDistance] = useState(15);
  const [modePill, setModePill] = useState('READ');

  // Putt preview animation
  const [animT, setAnimT]             = useState(null); // null = not animating, 0..1 = progress
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const animFrameRef = useRef(null);

  // ── Calibration ───────────────────────────────────────────────────────────
  const mag      = Math.sqrt(gamma ** 2 + beta ** 2).toFixed(1);
  const dirText  = gamma > 0.5 ? 'breaks right' : gamma < -0.5 ? 'breaks left' : 'straight';
  const gradText = beta > 0.8 ? ', downhill' : beta < -0.8 ? ', uphill' : '';
  const liveText = `${mag}\u00B0 slope \u2014 ${dirText}${gradText}`;

  const openCalibration = useCallback(() => {
    setIsCalibrating(true);
    setModePill('CAL');
  }, []);

  const cancelCalibration = useCallback(() => {
    setIsCalibrating(false);
    setModePill('READ');
  }, []);

  /** Receives array of readings from the multi-step CalibrationOverlay. */
  const captureSlope = useCallback((readings) => {
    setSlopeReadings(readings);
    // Primary slope from first (ball) reading
    setSlopeX(readings[0].slopeX);
    setSlopeY(readings[0].slopeY);
    setHasSlope(true);
    setIsCalibrating(false);
    setModePill('READ');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const resetSlope = useCallback(() => {
    setSlopeX(0);
    setSlopeY(0);
    setSlopeReadings([]);
    setHasSlope(false);
    setHolePos(null);
    setIsUserPlaced(false);
    setAnimT(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ── Stimpmeter calibration ────────────────────────────────────────────────
  const openStimpCalibration = useCallback(() => {
    setIsStimpCalibrating(true);
  }, []);

  const handleStimpResult = useCallback((stimp) => {
    setGreenSpeed(stimp);
    setIsStimpCalibrating(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ── Putt preview animation ────────────────────────────────────────────────
  const startPreview = useCallback(() => {
    if (isAnimating) return;
    setIsPreviewMode(true);
    setIsAnimating(true);
    setAnimT(0);
    const start = Date.now();
    const duration = 2500;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setAnimT(eased);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Hold at hole — stay in preview mode until user closes
        setTimeout(() => {
          setAnimT(null);
          setIsAnimating(false);
        }, 600);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [isAnimating]);

  const closePreview = useCallback(() => {
    setIsPreviewMode(false);
    setIsAnimating(false);
    setAnimT(null);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Clean up animation on unmount
  useEffect(() => () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  // ── Android back button ───────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isPreviewMode)      { closePreview();                return true; }
      if (isStimpCalibrating) { setIsStimpCalibrating(false); return true; }
      if (isPlacingHole)      { setIsPlacingHole(false);      return true; }
      if (isCalibrating)      { cancelCalibration();           return true; }
      return false;
    });
    return () => handler.remove();
  }, [isCalibrating, isPlacingHole, isStimpCalibrating, isPreviewMode, cancelCalibration, closePreview]);

  // ── Hole placement ────────────────────────────────────────────────────────
  const handleScreenTap = useCallback((event) => {
    if (!isPlacingHole) return;
    const { locationX, locationY } = event.nativeEvent;
    setHolePos({ x: locationX, y: locationY });
    setIsUserPlaced(true);
    setIsPlacingHole(false);
    setDistance(estimateDistanceFromScreen(locationY / height, betaRef.current));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [isPlacingHole, height]);

  const handleFindHole = useCallback(async () => {
    if (!cameraRef.current) { setIsPlacingHole(true); return; }
    setIsScanning(true);
    setModePill('SCAN');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.15, skipProcessing: true, shutterSound: false,
      });
      const pos = await detectHoleInPhoto(photo.uri, width, height);
      if (pos) {
        setHolePos(pos);
        setIsUserPlaced(true);
        setDistance(estimateDistanceFromScreen(pos.y / height, betaRef.current));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setIsPlacingHole(true);
      }
    } catch (err) {
      console.warn('[MainScreen] auto-detect error:', err?.message);
      setIsPlacingHole(true);
    } finally {
      setIsScanning(false);
      setModePill('READ');
    }
  }, [width, height]);

  const handleResetHole = useCallback(() => {
    setHolePos(null);
    setIsUserPlaced(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ── Pill label ────────────────────────────────────────────────────────────
  const pillLabel =
    modePill === 'CAL'  ? 'CALIBRATING' :
    modePill === 'SCAN' ? 'SCANNING...' :
    isPlacingHole       ? 'PLACE HOLE'  :
    isPreviewMode       ? 'PREVIEW'     : 'READ MODE';

  const pillStyle =
    modePill === 'CAL'  ? styles.pillCal  :
    modePill === 'SCAN' ? styles.pillScan :
    isPlacingHole       ? styles.pillHole :
    isPreviewMode       ? styles.pillAnim : styles.pillRead;

  return (
    <View style={styles.container}>
      {/* Main content area — takes all space above the ad */}
      <View style={styles.content}>
      {/* Camera */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Tap layer — active only when placing hole */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={isPlacingHole ? handleScreenTap : undefined}
        pointerEvents={isPlacingHole ? 'auto' : 'none'}
      >
        {/* AR Overlay (non-interactive) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <PuttingOverlay
            width={width}
            height={height}
            slopeX={slopeX}
            slopeY={slopeY}
            distance={distance}
            hasSlope={hasSlope}
            holePos={holePos}
            isUserPlacedHole={isUserPlacedHole}
            isPlacingHole={isPlacingHole}
            greenSpeed={greenSpeed}
            slopeReadings={slopeReadings}
            animT={animT}
          />
        </View>
      </Pressable>

      {/* Top bar */}
      <View style={styles.topBar} pointerEvents="none">
        <Text style={styles.logo}>GreenReader</Text>
        <View style={[styles.pill, pillStyle]}>
          <Text style={styles.pillText}>{pillLabel}</Text>
        </View>
      </View>

      {/* Cancel button shown while placing hole */}
      {isPlacingHole && (
        <TouchableOpacity
          style={styles.cancelHoleBtn}
          onPress={() => setIsPlacingHole(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelHoleTxt}>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Calibration overlay */}
      {isCalibrating && (
        <CalibrationOverlay
          gamma={gamma}
          beta={beta}
          liveText={liveText}
          onCapture={captureSlope}
          onCancel={cancelCalibration}
        />
      )}

      {/* Stimpmeter calibration overlay */}
      {isStimpCalibrating && (
        <StimpCalibration
          onResult={handleStimpResult}
          onCancel={() => setIsStimpCalibrating(false)}
        />
      )}

      {/* Preview metrics overlay (simplified full-screen view) */}
      {isPreviewMode && hasSlope && (
        <PreviewMetrics
          slopeX={slopeX}
          slopeY={slopeY}
          distance={distance}
          greenSpeed={greenSpeed}
          slopeReadings={slopeReadings}
          onClose={closePreview}
        />
      )}

      {/* Bottom panel */}
      {!isPlacingHole && !isPreviewMode && (
        <BottomPanel
          distance={distance}
          onDistanceChange={setDistance}
          slopeX={slopeX}
          slopeY={slopeY}
          hasSlope={hasSlope}
          onReadSlope={openCalibration}
          onReset={resetSlope}
          onFindHole={handleFindHole}
          onResetHole={handleResetHole}
          isScanning={isScanning}
          isUserPlacedHole={isUserPlacedHole}
          greenSpeed={greenSpeed}
          onGreenSpeedChange={setGreenSpeed}
          onStimpCalibrate={openStimpCalibration}
          onPreview={startPreview}
          isAnimating={isAnimating}
          slopeReadings={slopeReadings}
        />
      )}
      </View>

      {/* Ad banner — always at very bottom */}
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : ANDROID_STATUS_BAR + 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  logo: { fontSize: 18, fontWeight: '800', color: '#4caf50', letterSpacing: 0.5 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  pillRead: { backgroundColor: '#4caf50' },
  pillCal:  { backgroundColor: '#ff9800' },
  pillScan: { backgroundColor: '#2196f3' },
  pillHole: { backgroundColor: '#ffeb3b' },
  pillAnim: { backgroundColor: '#7b1fa2' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#000', letterSpacing: 1.2, textTransform: 'uppercase' },
  cancelHoleBtn: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  cancelHoleTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
