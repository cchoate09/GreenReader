import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import GuessOverlay, { GuessResults } from '../components/GuessOverlay';
import AdBanner from '../components/AdBanner';
import { useMotionSensors } from '../hooks/useMotionSensors';
import { usePuttSession } from '../hooks/usePuttSession';
import { detectHoleInPhoto } from '../utils/holeDetection';
import { estimateDistanceFromScreen } from '../utils/puttingPhysics';
import { getReadOutcome } from '../utils/puttRead';
import { getReadQuality } from '../utils/readQuality';

const ANDROID_STATUS_BAR = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

export default function MainScreen() {
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef(null);
  const animFrameRef = useRef(null);
  const betaRef = useRef(0);
  const { gamma, beta } = useMotionSensors();
  const { state, dispatch } = usePuttSession();
  const [animT, setAnimT] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  betaRef.current = beta;

  const readQuality = getReadQuality({
    hasSlope: state.slope.hasSlope,
    readings: state.slope.readings,
    hole: state.hole,
  });
  const holePlacementActive = state.hole.status === 'placing';
  const holeNeedsConfirm = state.hole.status === 'autoDetected';
  const previewReady = state.slope.hasSlope && state.hole.status === 'confirmed';

  const mag = Math.sqrt((gamma ** 2) + (beta ** 2)).toFixed(1);
  const dirText = gamma > 0.5 ? 'breaks right' : gamma < -0.5 ? 'breaks left' : 'straight';
  const gradText = beta > 0.8 ? ', downhill' : beta < -0.8 ? ', uphill' : '';
  const liveText = `${mag} deg slope - ${dirText}${gradText}`;

  const openQuickCalibration = useCallback(() => {
    dispatch({ type: 'OPEN_CALIBRATION', mode: 'single' });
  }, [dispatch]);

  const openAdvancedCalibration = useCallback(() => {
    dispatch({ type: 'OPEN_CALIBRATION', mode: 'compound' });
  }, [dispatch]);

  const cancelCalibration = useCallback(() => {
    dispatch({ type: 'CANCEL_CALIBRATION' });
  }, [dispatch]);

  const captureSlope = useCallback((readings) => {
    let guessActual = null;

    if (state.guess.pending) {
      const outcome = getReadOutcome({
        hasSlope: true,
        slopeX: readings[0]?.slopeX ?? 0,
        slopeY: readings[0]?.slopeY ?? 0,
        distance: state.settings.distance,
        greenSpeed: state.settings.greenSpeed,
        slopeReadings: readings,
        grainDir: state.settings.grainDir,
      });

      guessActual = {
        breakDir: outcome.aim?.dir ?? null,
        breakInches: outcome.aim?.inches ?? 0,
        playDist: outcome.playDist ?? state.settings.distance,
      };
    }

    dispatch({ type: 'CAPTURE_SLOPE', readings, guessActual });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [dispatch, state.guess.pending, state.settings.distance, state.settings.greenSpeed, state.settings.grainDir]);

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dispatch]);

  const startPreview = useCallback(() => {
    if (!previewReady || isAnimating) return;

    dispatch({ type: 'OPEN_PREVIEW' });
    setIsAnimating(true);
    setAnimT(0);

    const start = Date.now();
    const duration = 2500;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - ((1 - t) * (1 - t));
      setAnimT(eased);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setAnimT(null);
          setIsAnimating(false);
        }, 600);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [dispatch, isAnimating, previewReady]);

  const closePreview = useCallback(() => {
    dispatch({ type: 'CLOSE_PREVIEW' });
    setIsAnimating(false);
    setAnimT(null);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, [dispatch]);

  useEffect(() => () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.guess.showResults) {
        dispatch({ type: 'CLOSE_GUESS_RESULTS' });
        return true;
      }

      if (state.guess.showOverlay) {
        dispatch({ type: 'CANCEL_TRAINING_GUESS' });
        return true;
      }

      if (state.ui.isPreviewMode) {
        closePreview();
        return true;
      }

      if (state.ui.isStimpCalibrating) {
        dispatch({ type: 'CLOSE_STIMP_CALIBRATION' });
        return true;
      }

      if (holePlacementActive || holeNeedsConfirm) {
        dispatch({ type: 'CANCEL_HOLE_PLACEMENT' });
        return true;
      }

      if (state.calibration.isOpen) {
        dispatch({ type: 'CANCEL_CALIBRATION' });
        return true;
      }

      return false;
    });

    return () => handler.remove();
  }, [
    closePreview,
    dispatch,
    holeNeedsConfirm,
    holePlacementActive,
    state.calibration.isOpen,
    state.guess.showOverlay,
    state.guess.showResults,
    state.ui.isPreviewMode,
    state.ui.isStimpCalibrating,
  ]);

  const setHole = useCallback(() => {
    dispatch({ type: 'START_HOLE_PLACEMENT' });
  }, [dispatch]);

  const cancelHolePlacement = useCallback(() => {
    dispatch({ type: 'CANCEL_HOLE_PLACEMENT' });
  }, [dispatch]);

  const handleScreenTap = useCallback((event) => {
    if (!holePlacementActive) return;

    const { locationX, locationY } = event.nativeEvent;
    const estimatedDistanceFt = estimateDistanceFromScreen(locationY / height, betaRef.current);

    dispatch({
      type: 'SET_MANUAL_HOLE',
      position: { x: locationX, y: locationY },
      estimatedDistanceFt,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [dispatch, height, holePlacementActive]);

  const handleAutoDetectHole = useCallback(async () => {
    if (!cameraRef.current || !holePlacementActive) return;

    dispatch({ type: 'START_HOLE_SCAN' });

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.15,
        skipProcessing: true,
        shutterSound: false,
      });
      const position = await detectHoleInPhoto(photo.uri, width, height);

      if (!position) {
        dispatch({ type: 'HOLE_SCAN_FAILED' });
        return;
      }

      const estimatedDistanceFt = estimateDistanceFromScreen(position.y / height, betaRef.current);
      dispatch({ type: 'SET_AUTO_DETECTED_HOLE', position, estimatedDistanceFt });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('[MainScreen] auto-detect error:', error?.message);
      dispatch({ type: 'HOLE_SCAN_FAILED' });
    }
  }, [dispatch, height, holePlacementActive, width]);

  const handleUseDetectedHole = useCallback(() => {
    dispatch({ type: 'CONFIRM_AUTO_HOLE' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [dispatch]);

  const handleAdjustDetectedHole = useCallback(() => {
    dispatch({ type: 'ADJUST_AUTO_HOLE' });
  }, [dispatch]);

  const openStimpCalibration = useCallback(() => {
    dispatch({ type: 'OPEN_STIMP_CALIBRATION' });
  }, [dispatch]);

  const handleStimpResult = useCallback((greenSpeed) => {
    dispatch({ type: 'APPLY_STIMP_RESULT', greenSpeed });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [dispatch]);

  const openTrainingGuess = useCallback(() => {
    dispatch({ type: 'OPEN_TRAINING_GUESS' });
  }, [dispatch]);

  const handleGuessSubmit = useCallback((guess) => {
    dispatch({ type: 'SUBMIT_TRAINING_GUESS', guess });
  }, [dispatch]);

  const handleGuessSkip = useCallback(() => {
    dispatch({ type: 'SKIP_TRAINING_GUESS' });
  }, [dispatch]);

  const pillLabel = state.calibration.isOpen
    ? 'CALIBRATING'
    : state.ui.isScanning
      ? 'SCANNING...'
      : holePlacementActive || holeNeedsConfirm
        ? 'SET HOLE'
        : state.ui.isPreviewMode
          ? 'PREVIEW'
          : 'READ MODE';

  const pillStyle = state.calibration.isOpen
    ? styles.pillCal
    : state.ui.isScanning
      ? styles.pillScan
      : holePlacementActive || holeNeedsConfirm
        ? styles.pillHole
        : state.ui.isPreviewMode
          ? styles.pillAnim
          : styles.pillRead;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={holePlacementActive ? handleScreenTap : undefined}
          pointerEvents={holePlacementActive ? 'auto' : 'none'}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <PuttingOverlay
              width={width}
              height={height}
              slopeX={state.slope.slopeX}
              slopeY={state.slope.slopeY}
              distance={state.settings.distance}
              hasSlope={state.slope.hasSlope}
              hole={state.hole}
              greenSpeed={state.settings.greenSpeed}
              slopeReadings={state.slope.readings}
              animT={animT}
              grainDir={state.settings.grainDir}
              readQuality={readQuality}
            />
          </View>
        </Pressable>

        <View style={styles.topBar}>
          <Text style={styles.logo}>GreenReader</Text>
          <View style={styles.topRight}>
            <View style={styles.practiceTag}>
              <Text style={styles.practiceTagText}>Practice aid</Text>
            </View>
            <View style={[styles.pill, pillStyle]}>
              <Text style={styles.pillText}>{pillLabel}</Text>
            </View>
          </View>
        </View>

        {(holePlacementActive || holeNeedsConfirm) && (
          <View style={styles.holeCard}>
            <Text style={styles.holeCardTitle}>
              {holeNeedsConfirm ? 'Detected hole ready' : 'Set the hole'}
            </Text>
            <Text style={styles.holeCardDesc}>
              {holeNeedsConfirm
                ? 'Use the detected hole, or adjust it manually.'
                : 'Tap the hole on screen, or try auto-detect.'}
            </Text>
            <View style={styles.holeBtnRow}>
              {holeNeedsConfirm ? (
                <>
                  <TouchableOpacity style={[styles.holeBtn, styles.holeBtnPrimary]} onPress={handleUseDetectedHole} activeOpacity={0.8}>
                    <Text style={styles.holeBtnPrimaryText}>Use Detected</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.holeBtn, styles.holeBtnSecondary]} onPress={handleAdjustDetectedHole} activeOpacity={0.8}>
                    <Text style={styles.holeBtnSecondaryText}>Adjust</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.holeBtn, styles.holeBtnPrimary, state.ui.isScanning && styles.btnDisabled]}
                    onPress={handleAutoDetectHole}
                    activeOpacity={0.8}
                    disabled={state.ui.isScanning}
                  >
                    <Text style={styles.holeBtnPrimaryText}>{state.ui.isScanning ? 'Scanning...' : 'Auto Detect'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.holeBtn, styles.holeBtnSecondary]} onPress={cancelHolePlacement} activeOpacity={0.8}>
                    <Text style={styles.holeBtnSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {holeNeedsConfirm && (
              <TouchableOpacity style={styles.holeCancelLink} onPress={cancelHolePlacement} activeOpacity={0.7}>
                <Text style={styles.holeCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {state.calibration.isOpen && (
          <CalibrationOverlay
            mode={state.calibration.mode}
            gamma={gamma}
            beta={beta}
            liveText={liveText}
            onCapture={captureSlope}
            onCancel={cancelCalibration}
          />
        )}

        {state.ui.isStimpCalibrating && (
          <StimpCalibration
            onResult={handleStimpResult}
            onCancel={() => dispatch({ type: 'CLOSE_STIMP_CALIBRATION' })}
          />
        )}

        {state.guess.showOverlay && (
          <GuessOverlay
            puttDistance={state.settings.distance}
            onSubmit={handleGuessSubmit}
            onSkip={handleGuessSkip}
          />
        )}

        {state.guess.showResults && state.guess.pending && state.guess.actual && (
          <GuessResults
            guess={state.guess.pending}
            actual={state.guess.actual}
            onClose={() => dispatch({ type: 'CLOSE_GUESS_RESULTS' })}
          />
        )}

        {state.ui.isPreviewMode && previewReady && (
          <PreviewMetrics
            slope={state.slope}
            settings={state.settings}
            hole={state.hole}
            readQuality={readQuality}
            onClose={closePreview}
          />
        )}

        {!state.ui.isPreviewMode && !holePlacementActive && !holeNeedsConfirm && (
          <BottomPanel
            slope={state.slope}
            hole={state.hole}
            settings={state.settings}
            ui={state.ui}
            readQuality={readQuality}
            onDistanceChange={(distance) => dispatch({ type: 'SET_DISTANCE', distance })}
            onReadSlope={openQuickCalibration}
            onAdvancedRead={openAdvancedCalibration}
            onSetHole={setHole}
            onPreview={startPreview}
            onReset={resetSession}
            onToggleAdvanced={() => dispatch({ type: 'TOGGLE_ADVANCED' })}
            onGreenSpeedChange={(greenSpeed) => dispatch({ type: 'SET_GREEN_SPEED', greenSpeed })}
            onStimpCalibrate={openStimpCalibration}
            onGrainChange={(grainDir) => dispatch({ type: 'SET_GRAIN_DIR', grainDir })}
            onTrainingRead={openTrainingGuess}
            onDefaultReadModeChange={(defaultReadMode) => dispatch({ type: 'SET_DEFAULT_READ_MODE', defaultReadMode })}
          />
        )}
      </View>

      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : ANDROID_STATUS_BAR + 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  logo: { fontSize: 18, fontWeight: '800', color: '#4caf50', letterSpacing: 0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  practiceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  practiceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90a4ae',
  },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  pillRead: { backgroundColor: '#4caf50' },
  pillCal: { backgroundColor: '#ff9800' },
  pillScan: { backgroundColor: '#2196f3' },
  pillHole: { backgroundColor: '#ffeb3b' },
  pillAnim: { backgroundColor: '#7b1fa2' },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  holeCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 82,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  holeCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  holeCardDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#b0bec5',
    marginBottom: 12,
  },
  holeBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  holeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
  },
  holeBtnPrimary: {
    backgroundColor: '#1565c0',
  },
  holeBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  holeBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  holeBtnSecondaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  holeCancelLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  holeCancelText: {
    color: '#90a4ae',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.45 },
});
