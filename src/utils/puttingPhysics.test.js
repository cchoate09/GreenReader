import {
  calcBreakInches,
  effectiveDistance,
  grainEffect,
  compoundAimPoint,
  estimateDistanceFromScreen,
} from './puttingPhysics';

describe('puttingPhysics', () => {
  test('calculates the baseline break for a 1 degree 12 foot putt at stimp 9', () => {
    expect(calcBreakInches(1, 12, 9, 0)).toBe(4);
  });

  test('adjusts effective distance for uphill and downhill putts', () => {
    expect(effectiveDistance(-2, 10, 9)).toBe(12);
    expect(effectiveDistance(2, 10, 9)).toBe(8);
  });

  test('applies grain lateral push and speed adjustments', () => {
    expect(grainEffect('right', 12)).toEqual({
      speedMult: 1,
      breakMult: 1,
      lateralInches: 3,
    });
    expect(grainEffect('with', 12)).toEqual({
      speedMult: 0.88,
      breakMult: 0.85,
      lateralInches: 0,
    });
  });

  test('builds a left aim point from positive multi-point slope readings', () => {
    const result = compoundAimPoint([
      { slopeX: 1.1, slopeY: 0, pos: 0.5 },
      { slopeX: 1.3, slopeY: 0, pos: 1.0 },
    ], 15, 9);

    expect(result.dir).toBe('L');
    expect(result.inches).toBeGreaterThan(0);
  });

  test('applies the updated distance correction to reduce short reads', () => {
    expect(estimateDistanceFromScreen(0.5, 60)).toBe(12);
    expect(estimateDistanceFromScreen(0.4, 60)).toBe(15);
  });

  test('keeps short putts bounded even after the correction', () => {
    expect(estimateDistanceFromScreen(0.7, 55)).toBe(6);
  });
});
