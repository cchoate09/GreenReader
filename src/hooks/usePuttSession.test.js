import {
  createInitialPuttSessionState,
  puttSessionReducer,
} from './usePuttSession';

function sampleReading(overrides = {}) {
  return {
    slopeX: 1.2,
    slopeY: -0.6,
    pos: 0,
    stabilityScore: 88,
    gammaStd: 0.1,
    betaStd: 0.1,
    sampleCount: 10,
    ...overrides,
  };
}

describe('puttSessionReducer', () => {
  test('handles the quick-read happy path', () => {
    let state = createInitialPuttSessionState();

    state = puttSessionReducer(state, { type: 'OPEN_CALIBRATION', mode: 'single' });
    state = puttSessionReducer(state, { type: 'CAPTURE_SLOPE', readings: [sampleReading()] });
    state = puttSessionReducer(state, { type: 'START_HOLE_PLACEMENT' });
    state = puttSessionReducer(state, {
      type: 'SET_MANUAL_HOLE',
      position: { x: 120, y: 240 },
      estimatedDistanceFt: 11,
    });
    state = puttSessionReducer(state, { type: 'OPEN_PREVIEW' });

    expect(state.calibration.isOpen).toBe(false);
    expect(state.slope.hasSlope).toBe(true);
    expect(state.hole.status).toBe('confirmed');
    expect(state.hole.source).toBe('manual');
    expect(state.settings.distance).toBe(11);
    expect(state.ui.isPreviewMode).toBe(true);
  });

  test('keeps manual hole placement and distance in sync', () => {
    const state = puttSessionReducer(createInitialPuttSessionState(), {
      type: 'SET_MANUAL_HOLE',
      position: { x: 80, y: 180 },
      estimatedDistanceFt: 9,
    });

    expect(state.hole).toEqual({
      position: { x: 80, y: 180 },
      status: 'confirmed',
      source: 'manual',
      estimatedDistanceFt: 9,
    });
    expect(state.settings.distance).toBe(9);
  });

  test('requires explicit confirmation for auto-detected holes', () => {
    let state = createInitialPuttSessionState();

    state = puttSessionReducer(state, { type: 'START_HOLE_PLACEMENT' });
    state = puttSessionReducer(state, { type: 'START_HOLE_SCAN' });
    state = puttSessionReducer(state, {
      type: 'SET_AUTO_DETECTED_HOLE',
      position: { x: 90, y: 120 },
      estimatedDistanceFt: 14,
    });

    expect(state.hole.status).toBe('autoDetected');
    expect(state.settings.distance).toBe(15);

    state = puttSessionReducer(state, { type: 'CONFIRM_AUTO_HOLE' });

    expect(state.hole.status).toBe('confirmed');
    expect(state.hole.source).toBe('auto');
    expect(state.settings.distance).toBe(14);
  });

  test('toggles advanced mode and updates advanced settings', () => {
    let state = createInitialPuttSessionState();

    state = puttSessionReducer(state, { type: 'TOGGLE_ADVANCED' });
    state = puttSessionReducer(state, { type: 'SET_GREEN_SPEED', greenSpeed: 11 });
    state = puttSessionReducer(state, { type: 'SET_GRAIN_DIR', grainDir: 'right' });

    expect(state.ui.advancedOpen).toBe(true);
    expect(state.settings.greenSpeed).toBe(11);
    expect(state.settings.grainDir).toBe('right');
  });

  test('hydrates and applies the default advanced read mode', () => {
    let state = createInitialPuttSessionState();

    state = puttSessionReducer(state, {
      type: 'HYDRATE_ADVANCED_SETTINGS',
      settings: {
        greenSpeed: 11,
        grainDir: 'against',
        defaultReadMode: 'advanced',
      },
    });

    expect(state.settings.defaultReadMode).toBe('advanced');
    expect(state.ui.advancedOpen).toBe(true);
    expect(state.ui.settingsHydrated).toBe(true);
  });

  test('switches the default read mode and syncs panel visibility', () => {
    let state = createInitialPuttSessionState();

    state = puttSessionReducer(state, {
      type: 'SET_DEFAULT_READ_MODE',
      defaultReadMode: 'advanced',
    });

    expect(state.settings.defaultReadMode).toBe('advanced');
    expect(state.ui.advancedOpen).toBe(true);

    state = puttSessionReducer(state, {
      type: 'SET_DEFAULT_READ_MODE',
      defaultReadMode: 'basic',
    });

    expect(state.settings.defaultReadMode).toBe('basic');
    expect(state.ui.advancedOpen).toBe(false);
  });

  test('opens training mode and shows results after a captured slope', () => {
    let state = createInitialPuttSessionState();

    state = puttSessionReducer(state, { type: 'OPEN_TRAINING_GUESS' });
    state = puttSessionReducer(state, {
      type: 'SUBMIT_TRAINING_GUESS',
      guess: { breakDir: 'LEFT', breakInches: 6, hitDistance: 12 },
    });
    state = puttSessionReducer(state, {
      type: 'CAPTURE_SLOPE',
      readings: [sampleReading()],
      guessActual: { breakDir: 'L', breakInches: 5, playDist: 11 },
    });

    expect(state.guess.showResults).toBe(true);
    expect(state.guess.pending).toEqual({ breakDir: 'LEFT', breakInches: 6, hitDistance: 12 });
    expect(state.guess.actual).toEqual({ breakDir: 'L', breakInches: 5, playDist: 11 });
  });

  test('resets the current read without wiping advanced settings', () => {
    let state = createInitialPuttSessionState();
    state = puttSessionReducer(state, { type: 'SET_GREEN_SPEED', greenSpeed: 11 });
    state = puttSessionReducer(state, { type: 'SET_GRAIN_DIR', grainDir: 'left' });
    state = puttSessionReducer(state, { type: 'CAPTURE_SLOPE', readings: [sampleReading()] });
    state = puttSessionReducer(state, {
      type: 'SET_MANUAL_HOLE',
      position: { x: 40, y: 60 },
      estimatedDistanceFt: 10,
    });

    state = puttSessionReducer(state, { type: 'RESET_SESSION' });

    expect(state.slope.hasSlope).toBe(false);
    expect(state.hole.status).toBe('unset');
    expect(state.guess.showResults).toBe(false);
    expect(state.settings.greenSpeed).toBe(11);
    expect(state.settings.grainDir).toBe('left');
  });
});
