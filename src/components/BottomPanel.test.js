import React from 'react';
import renderer from 'react-test-renderer';
import * as ReactNative from 'react-native';
import BottomPanel from './BottomPanel';

jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('./ElevationProfile', () => 'ElevationProfile');
jest.mock('./DiagnosticsPanel', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockDiagnosticsPanel() {
    return React.createElement(Text, null, 'DIAGNOSTICS_PANEL');
  };
});

function createProps(overrides = {}) {
  return {
    slope: {
      hasSlope: true,
      slopeX: 1.2,
      slopeY: -0.3,
      readings: [{ slopeX: 1.2, slopeY: -0.3, pos: 0 }],
    },
    hole: {
      position: { x: 190, y: 180 },
      status: 'confirmed',
      source: 'manual',
      estimatedDistanceFt: 15,
    },
    settings: {
      distance: 15,
      greenSpeed: 9,
      grainDir: 'none',
      defaultReadMode: 'basic',
    },
    ui: {
      advancedOpen: false,
      isPreviewMode: false,
      isScanning: false,
      isStimpCalibrating: false,
    },
    readQuality: {
      label: 'High',
      score: 86,
      level: 'high',
    },
    onDistanceChange: jest.fn(),
    onReadSlope: jest.fn(),
    onAdvancedRead: jest.fn(),
    onSetHole: jest.fn(),
    onPreview: jest.fn(),
    onReset: jest.fn(),
    onToggleAdvanced: jest.fn(),
    onGreenSpeedChange: jest.fn(),
    onStimpCalibrate: jest.fn(),
    onGrainChange: jest.fn(),
    onTrainingRead: jest.fn(),
    onDefaultReadModeChange: jest.fn(),
    ...overrides,
  };
}

describe('BottomPanel', () => {
  beforeEach(() => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({ width: 390, height: 844 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the ready state and quality summary for a confirmed manual read', () => {
    let testRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(<BottomPanel {...createProps()} />);
    });

    const textNodes = testRenderer.root.findAll((node) => typeof node.props.children === 'string');
    const textValues = textNodes.map((node) => node.props.children);

    expect(textValues).toContain('Read ready');
    expect(textValues).toContain('Quick read · Manual hole confirmed');
    expect(textValues).toContain('High 86');
  });

  it('renders diagnostics tools when advanced settings are open', () => {
    let testRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(
        <BottomPanel
          {...createProps({
            ui: {
              advancedOpen: true,
              isPreviewMode: false,
              isScanning: false,
              isStimpCalibrating: false,
            },
          })}
        />,
      );
    });

    const textNodes = testRenderer.root.findAll((node) => typeof node.props.children === 'string');
    const textValues = textNodes.map((node) => node.props.children);

    expect(textValues).toContain('DIAGNOSTICS_PANEL');
  });
});
