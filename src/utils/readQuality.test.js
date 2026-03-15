import {
  getReadQuality,
  getReadQualityGuidance,
} from './readQuality';

function confirmedHole(source = 'manual') {
  return {
    position: { x: 100, y: 100 },
    status: 'confirmed',
    source,
    estimatedDistanceFt: 12,
  };
}

describe('readQuality', () => {
  test('scores a stable single read as high confidence', () => {
    const quality = getReadQuality({
      hasSlope: true,
      readings: [{ gammaStd: 0.1, betaStd: 0.1 }],
      hole: confirmedHole('manual'),
    });

    expect(quality).toEqual({
      score: 89,
      level: 'high',
      label: 'High confidence',
    });
  });

  test('scores a shaky read as low confidence', () => {
    const quality = getReadQuality({
      hasSlope: true,
      readings: [{ gammaStd: 0.7, betaStd: 0.6 }],
      hole: confirmedHole('manual'),
    });

    expect(quality.level).toBe('low');
    expect(quality.score).toBe(42);
    expect(getReadQualityGuidance(quality)).toMatch(/re-read/i);
  });

  test('uses the lower hole score for confirmed auto-detected holes', () => {
    const quality = getReadQuality({
      hasSlope: true,
      readings: [{ gammaStd: 0.1, betaStd: 0.1 }],
      hole: confirmedHole('auto'),
    });

    expect(quality.score).toBe(84);
    expect(quality.level).toBe('high');
  });

  test('returns incomplete when the hole is not confirmed', () => {
    const quality = getReadQuality({
      hasSlope: true,
      readings: [{ gammaStd: 0.1, betaStd: 0.1 }],
      hole: {
        position: null,
        status: 'unset',
        source: null,
        estimatedDistanceFt: null,
      },
    });

    expect(quality).toEqual({
      score: 0,
      level: 'incomplete',
      label: 'Confirm hole',
    });
  });

  test('averages multi-point sensor scores before the final quality score', () => {
    const quality = getReadQuality({
      hasSlope: true,
      readings: [
        { gammaStd: 0.1, betaStd: 0.1 },
        { gammaStd: 0.3, betaStd: 0.3 },
      ],
      hole: confirmedHole('manual'),
    });

    expect(quality).toEqual({
      score: 80,
      level: 'high',
      label: 'High confidence',
    });
  });
});
