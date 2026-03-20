import React from 'react';
import renderer from 'react-test-renderer';
import * as ReactNative from 'react-native';
import MainScreen from './MainScreen';

let mockState;
const mockDispatch = jest.fn();

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
  },
  NotificationFeedbackType: {
    Success: 'Success',
  },
}));

jest.mock('../hooks/useMotionSensors', () => ({
  useMotionSensors: () => ({
    gamma: 0.7,
    beta: -0.4,
  }),
}));

jest.mock('../hooks/usePuttSession', () => ({
  usePuttSession: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

jest.mock('../utils/holeDetection', () => ({
  detectHoleInPhoto: jest.fn(),
}));

jest.mock('../utils/puttingPhysics', () => {
  const actual = jest.requireActual('../utils/puttingPhysics');
  return {
    ...actual,
    estimateDistanceFromScreen: jest.fn(() => 15),
  };
});

jest.mock('../components/PuttingOverlay', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockPuttingOverlay() {
    return React.createElement(Text, null, 'PUTTING_OVERLAY');
  };
});

jest.mock('../components/CalibrationOverlay', () => {
  const React = require('react');
  return function MockCalibrationOverlay() {
    return React.createElement('CalibrationOverlay');
  };
});

jest.mock('../components/BottomPanel', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockBottomPanel() {
    return React.createElement(Text, null, 'BOTTOM_PANEL');
  };
});

jest.mock('../components/StimpCalibration', () => {
  const React = require('react');
  return function MockStimpCalibration() {
    return React.createElement('StimpCalibration');
  };
});

jest.mock('../components/PreviewMetrics', () => {
  const React = require('react');
  return function MockPreviewMetrics() {
    return React.createElement('PreviewMetrics');
  };
});

jest.mock('../components/GuessOverlay', () => {
  const React = require('react');
  const { Text } = require('react-native');

  function MockGuessOverlay() {
    return React.createElement(Text, null, 'GUESS_OVERLAY');
  }

  function MockGuessResults() {
    return React.createElement(Text, null, 'GUESS_RESULTS');
  }

  MockGuessOverlay.GuessResults = MockGuessResults;

  return {
    __esModule: true,
    default: MockGuessOverlay,
    GuessResults: MockGuessResults,
  };
});

jest.mock('../components/AdBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockAdBanner() {
    return React.createElement(Text, null, 'AD_BANNER');
  };
});

function createBaseState() {
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
      greenSpeed: 9,
      grainDir: 'none',
      defaultReadMode: 'basic',
    },
    hole: {
      position: null,
      status: 'unset',
      source: null,
      estimatedDistanceFt: null,
    },
    holeBackup: null,
    ui: {
      advancedOpen: false,
      isPreviewMode: false,
      isScanning: false,
      isStimpCalibrating: false,
      settingsHydrated: true,
    },
    guess: {
      pending: null,
      actual: null,
      showOverlay: false,
      showResults: false,
    },
  };
}

describe('MainScreen', () => {
  beforeEach(() => {
    mockState = createBaseState();
    mockDispatch.mockClear();
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({ width: 390, height: 844 });
    jest.spyOn(ReactNative.BackHandler, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the default quick-read chrome without crashing', () => {
    let testRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(<MainScreen />);
    });
    const textNodes = testRenderer.root.findAllByType(ReactNative.Text);
    const textValues = textNodes.map((node) => node.props.children).flat().filter(Boolean);

    expect(textValues).toContain('GreenReader');
    expect(textValues).toContain('Practice aid');
    expect(textValues).toContain('READ MODE');
    expect(textValues).toContain('BOTTOM_PANEL');
    expect(textValues).toContain('AD_BANNER');
  });
});
