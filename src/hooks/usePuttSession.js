import { useEffect, useReducer, useRef } from 'react';
import { DEFAULT_STIMP } from '../utils/puttingPhysics';
import { loadAdvancedSettings, saveAdvancedSettings } from '../utils/advancedSettingsStorage';

function createDefaultHole() {
  return {
    position: null,
    status: 'unset',
    source: null,
    estimatedDistanceFt: null,
  };
}

function createDefaultGuess() {
  return {
    pending: null,
    actual: null,
    showOverlay: false,
    showResults: false,
  };
}

export function createInitialPuttSessionState() {
  return {
    calibration: {
      isOpen: false,
      mode: 'single',
    },
    slope: {
      hasSlope: false,
      slopeX: 0,
      slopeY: 0,
      readings: [],
    },
    settings: {
      distance: 15,
      greenSpeed: DEFAULT_STIMP,
      grainDir: 'none',
      defaultReadMode: 'basic',
    },
    hole: createDefaultHole(),
    holeBackup: null,
    ui: {
      advancedOpen: false,
      isPreviewMode: false,
      isScanning: false,
      isStimpCalibrating: false,
      settingsHydrated: false,
    },
    guess: createDefaultGuess(),
  };
}

function restoreHole(backup) {
  return backup ? { ...backup } : createDefaultHole();
}

export function puttSessionReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE_ADVANCED_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          greenSpeed: action.settings?.greenSpeed ?? state.settings.greenSpeed,
          grainDir: action.settings?.grainDir ?? state.settings.grainDir,
          defaultReadMode: action.settings?.defaultReadMode ?? state.settings.defaultReadMode,
        },
        ui: {
          ...state.ui,
          advancedOpen: (action.settings?.defaultReadMode ?? state.settings.defaultReadMode) === 'advanced',
          settingsHydrated: true,
        },
      };

    case 'SET_DISTANCE':
      return {
        ...state,
        settings: {
          ...state.settings,
          distance: action.distance,
        },
      };

    case 'SET_GREEN_SPEED':
      return {
        ...state,
        settings: {
          ...state.settings,
          greenSpeed: action.greenSpeed,
        },
      };

    case 'SET_GRAIN_DIR':
      return {
        ...state,
        settings: {
          ...state.settings,
          grainDir: action.grainDir,
        },
      };

    case 'SET_DEFAULT_READ_MODE':
      return {
        ...state,
        settings: {
          ...state.settings,
          defaultReadMode: action.defaultReadMode,
        },
        ui: {
          ...state.ui,
          advancedOpen: action.defaultReadMode === 'advanced',
        },
      };

    case 'TOGGLE_ADVANCED':
      return {
        ...state,
        ui: {
          ...state.ui,
          advancedOpen: !state.ui.advancedOpen,
        },
      };

    case 'OPEN_CALIBRATION':
      return {
        ...state,
        calibration: {
          isOpen: true,
          mode: action.mode ?? 'single',
        },
        ui: {
          ...state.ui,
          isPreviewMode: false,
        },
        guess: {
          ...state.guess,
          showOverlay: false,
          showResults: false,
        },
      };

    case 'CANCEL_CALIBRATION':
      return {
        ...state,
        calibration: {
          ...state.calibration,
          isOpen: false,
        },
        guess: createDefaultGuess(),
      };

    case 'CAPTURE_SLOPE': {
      const readings = action.readings ?? [];
      const primary = readings[0] ?? { slopeX: 0, slopeY: 0 };
      const nextGuess = state.guess.pending && action.guessActual
        ? {
            pending: state.guess.pending,
            actual: action.guessActual,
            showOverlay: false,
            showResults: true,
          }
        : createDefaultGuess();

      return {
        ...state,
        calibration: {
          ...state.calibration,
          isOpen: false,
        },
        slope: {
          hasSlope: readings.length > 0,
          slopeX: primary.slopeX ?? 0,
          slopeY: primary.slopeY ?? 0,
          readings,
        },
        ui: {
          ...state.ui,
          isPreviewMode: false,
        },
        guess: nextGuess,
      };
    }

    case 'RESET_SESSION':
      return {
        ...state,
        calibration: {
          isOpen: false,
          mode: 'single',
        },
        slope: {
          hasSlope: false,
          slopeX: 0,
          slopeY: 0,
          readings: [],
        },
        hole: createDefaultHole(),
        holeBackup: null,
        ui: {
          ...state.ui,
          isPreviewMode: false,
          isScanning: false,
          isStimpCalibrating: false,
        },
        guess: createDefaultGuess(),
      };

    case 'START_HOLE_PLACEMENT':
      return {
        ...state,
        holeBackup: state.hole.status === 'confirmed' ? { ...state.hole } : state.holeBackup,
        hole: {
          position: state.hole.status === 'confirmed' ? state.hole.position : null,
          status: 'placing',
          source: null,
          estimatedDistanceFt: state.hole.status === 'confirmed' ? state.hole.estimatedDistanceFt : null,
        },
        ui: {
          ...state.ui,
          isScanning: false,
        },
      };

    case 'SET_MANUAL_HOLE':
      return {
        ...state,
        hole: {
          position: action.position,
          status: 'confirmed',
          source: 'manual',
          estimatedDistanceFt: action.estimatedDistanceFt,
        },
        holeBackup: null,
        settings: {
          ...state.settings,
          distance: action.estimatedDistanceFt ?? state.settings.distance,
        },
        ui: {
          ...state.ui,
          isScanning: false,
        },
      };

    case 'START_HOLE_SCAN':
      return {
        ...state,
        ui: {
          ...state.ui,
          isScanning: true,
        },
      };

    case 'SET_AUTO_DETECTED_HOLE':
      return {
        ...state,
        hole: {
          position: action.position,
          status: 'autoDetected',
          source: 'auto',
          estimatedDistanceFt: action.estimatedDistanceFt,
        },
        ui: {
          ...state.ui,
          isScanning: false,
        },
      };

    case 'CONFIRM_AUTO_HOLE':
      if (state.hole.status !== 'autoDetected') return state;

      return {
        ...state,
        hole: {
          ...state.hole,
          status: 'confirmed',
        },
        holeBackup: null,
        settings: {
          ...state.settings,
          distance: state.hole.estimatedDistanceFt ?? state.settings.distance,
        },
      };

    case 'ADJUST_AUTO_HOLE':
      return {
        ...state,
        hole: {
          position: null,
          status: 'placing',
          source: null,
          estimatedDistanceFt: null,
        },
        ui: {
          ...state.ui,
          isScanning: false,
        },
      };

    case 'HOLE_SCAN_FAILED':
      return {
        ...state,
        ui: {
          ...state.ui,
          isScanning: false,
        },
      };

    case 'CANCEL_HOLE_PLACEMENT':
      return {
        ...state,
        hole: restoreHole(state.holeBackup),
        holeBackup: null,
        ui: {
          ...state.ui,
          isScanning: false,
        },
      };

    case 'RESET_HOLE':
      return {
        ...state,
        hole: createDefaultHole(),
        holeBackup: null,
      };

    case 'OPEN_PREVIEW':
      return {
        ...state,
        ui: {
          ...state.ui,
          isPreviewMode: true,
        },
      };

    case 'CLOSE_PREVIEW':
      return {
        ...state,
        ui: {
          ...state.ui,
          isPreviewMode: false,
        },
      };

    case 'OPEN_STIMP_CALIBRATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          isStimpCalibrating: true,
        },
      };

    case 'CLOSE_STIMP_CALIBRATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          isStimpCalibrating: false,
        },
      };

    case 'APPLY_STIMP_RESULT':
      return {
        ...state,
        settings: {
          ...state.settings,
          greenSpeed: action.greenSpeed,
        },
        ui: {
          ...state.ui,
          isStimpCalibrating: false,
        },
      };

    case 'OPEN_TRAINING_GUESS':
      return {
        ...state,
        guess: {
          pending: null,
          actual: null,
          showOverlay: true,
          showResults: false,
        },
      };

    case 'CANCEL_TRAINING_GUESS':
      return {
        ...state,
        guess: createDefaultGuess(),
      };

    case 'SUBMIT_TRAINING_GUESS':
      return {
        ...state,
        calibration: {
          isOpen: true,
          mode: 'single',
        },
        guess: {
          pending: action.guess,
          actual: null,
          showOverlay: false,
          showResults: false,
        },
      };

    case 'SKIP_TRAINING_GUESS':
      return {
        ...state,
        calibration: {
          isOpen: true,
          mode: 'single',
        },
        guess: createDefaultGuess(),
      };

    case 'CLOSE_GUESS_RESULTS':
      return {
        ...state,
        guess: createDefaultGuess(),
      };

    default:
      return state;
  }
}

export function usePuttSession() {
  const [state, dispatch] = useReducer(puttSessionReducer, undefined, createInitialPuttSessionState);
  const saveKeyRef = useRef(null);

  useEffect(() => {
    let active = true;

    loadAdvancedSettings().then((settings) => {
      if (!active) return;
      dispatch({ type: 'HYDRATE_ADVANCED_SETTINGS', settings });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state.ui.settingsHydrated) return;

    const nextSettings = {
      greenSpeed: state.settings.greenSpeed,
      grainDir: state.settings.grainDir,
      defaultReadMode: state.settings.defaultReadMode,
    };
    const saveKey = JSON.stringify(nextSettings);

    if (saveKeyRef.current === saveKey) return;
    saveKeyRef.current = saveKey;
    saveAdvancedSettings(nextSettings);
  }, [
    state.settings.greenSpeed,
    state.settings.grainDir,
    state.settings.defaultReadMode,
    state.ui.settingsHydrated,
  ]);

  return { state, dispatch };
}
