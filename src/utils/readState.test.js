import { getReadState } from './readState';

describe('getReadState', () => {
  it('returns a ready state for a confirmed manual quick read', () => {
    const result = getReadState({
      slope: {
        hasSlope: true,
        readings: [{ slopeX: 1.2, slopeY: -0.3, pos: 0 }],
      },
      hole: {
        status: 'confirmed',
        source: 'manual',
      },
      ui: {
        isPreviewMode: false,
      },
    });

    expect(result).toEqual({
      tone: 'ready',
      title: 'Read ready',
      meta: 'Quick read · Manual hole confirmed',
      detail: 'Aim / Play As are live. Preview the line or capture a fresh read.',
    });
  });

  it('returns a preview state for an advanced read', () => {
    const result = getReadState({
      slope: {
        hasSlope: true,
        readings: [
          { slopeX: 1.2, slopeY: -0.3, pos: 0 },
          { slopeX: 1.0, slopeY: -0.2, pos: 0.5 },
        ],
      },
      hole: {
        status: 'confirmed',
        source: 'auto',
      },
      ui: {
        isPreviewMode: true,
      },
    });

    expect(result.title).toBe('Previewing latest read');
    expect(result.meta).toBe('Advanced read · Auto hole confirmed');
    expect(result.tone).toBe('preview');
  });

  it('asks the user to confirm a detected hole before finishing the read', () => {
    const result = getReadState({
      slope: {
        hasSlope: true,
        readings: [{ slopeX: 1.2, slopeY: -0.3, pos: 0 }],
      },
      hole: {
        status: 'autoDetected',
        source: 'auto',
      },
      ui: {
        isPreviewMode: false,
      },
    });

    expect(result.title).toBe('Confirm detected hole');
    expect(result.meta).toBe('Auto hole candidate');
    expect(result.tone).toBe('attention');
  });
});
