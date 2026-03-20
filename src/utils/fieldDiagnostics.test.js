jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import {
  buildDiagnosticSnapshot,
  formatDiagnosticReport,
} from './fieldDiagnostics';

describe('fieldDiagnostics', () => {
  it('builds a compact snapshot for the current read state', () => {
    const snapshot = buildDiagnosticSnapshot({
      readState: { title: 'Read ready', meta: 'Quick read · Manual hole confirmed' },
      readQuality: { label: 'High', score: 86 },
      settings: { distance: 15, greenSpeed: 9, grainDir: 'none' },
      slope: { hasSlope: true, readings: [{ pos: 0 }] },
      hole: { status: 'confirmed', source: 'manual' },
      ui: { isPreviewMode: false, advancedOpen: false },
    });

    expect(snapshot).toMatchObject({
      readState: 'Read ready',
      readScore: 86,
      distanceFt: 15,
      holeStatus: 'confirmed',
      slopeReadings: 1,
    });
  });

  it('formats a report with read summary and recent events', () => {
    const report = formatDiagnosticReport({
      readState: { title: 'Read ready', meta: 'Quick read · Manual hole confirmed' },
      readQuality: { label: 'High', score: 86 },
      settings: { distance: 15, greenSpeed: 9, grainDir: 'none' },
      slope: { hasSlope: true, slopeX: 1.24, slopeY: -0.42, readings: [{ pos: 0 }] },
      hole: { status: 'confirmed', source: 'manual' },
      ui: { isPreviewMode: false },
      entries: [
        {
          timestamp: '2026-03-20T13:40:00.000Z',
          level: 'info',
          message: 'Preview opened',
          details: { distanceFt: 15, readScore: 86 },
        },
      ],
    });

    expect(report).toContain('Read state: Read ready');
    expect(report).toContain('Preview opened');
    expect(report).toContain('distanceFt=15');
  });
});
