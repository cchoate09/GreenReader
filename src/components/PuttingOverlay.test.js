import React from 'react';
import renderer from 'react-test-renderer';
import PuttingOverlay from './PuttingOverlay';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const createMock = (name) => ({ children, ...props }) => React.createElement(name, props, children);

  return {
    __esModule: true,
    default: createMock('Svg'),
    Path: createMock('Path'),
    Line: createMock('Line'),
    Circle: createMock('Circle'),
    Text: createMock('SvgText'),
    Rect: createMock('Rect'),
    G: createMock('G'),
    Polygon: createMock('Polygon'),
  };
});

describe('PuttingOverlay', () => {
  it('shows quick-read instructions before slope and hole are set', () => {
    let testRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(
        <PuttingOverlay
          width={390}
          height={844}
          slopeX={0}
          slopeY={0}
          distance={15}
          hasSlope={false}
          hole={{
            position: null,
            status: 'unset',
            source: null,
            estimatedDistanceFt: null,
          }}
          greenSpeed={9}
          slopeReadings={[]}
          readQuality={{
            score: 0,
            level: 'incomplete',
            label: 'Need slope + hole',
          }}
        />,
      );
    });

    const textNodes = testRenderer.root.findAll((node) => typeof node.props.children === 'string');
    const textValues = textNodes.map((node) => node.props.children);

    expect(textValues).toContain('Practice mode quick read');
    expect(textValues).toContain('1. Read Slope near the ball');
    expect(textValues).toContain('2. Set Hole and review Aim / Play As');
  });
});
