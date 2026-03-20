import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import {
  buildDiagnosticReport,
  buildDiagnosticSnapshot,
  clearDiagnosticEntries,
  formatDiagnosticTimestamp,
  recordDiagnosticError,
  recordDiagnosticEvent,
  recordDiagnosticSnapshot,
  subscribeDiagnosticEntries,
} from '../utils/fieldDiagnostics';

function EntryRow({ entry }) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryMetaRow}>
        <Text style={[styles.entryLevel, entry.level === 'error' && styles.entryLevelError]}>
          {entry.level === 'error' ? 'ERROR' : 'EVENT'}
        </Text>
        <Text style={styles.entryTime}>{formatDiagnosticTimestamp(entry.timestamp)}</Text>
      </View>
      <Text style={styles.entryMessage}>{entry.message}</Text>
    </View>
  );
}

function StatChip({ label, value }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function DiagnosticsPanel({
  slope,
  hole,
  settings,
  ui,
  readQuality,
  readState,
}) {
  const [entries, setEntries] = useState([]);

  useEffect(() => subscribeDiagnosticEntries(setEntries), []);

  const slopeSummary = slope.hasSlope
    ? `${slope.readings?.length > 1 ? 'advanced' : 'quick'} (${slope.readings?.length ?? 0})`
    : 'not captured';
  const holeSummary = hole.status === 'confirmed'
    ? hole.source === 'auto' ? 'auto confirmed' : 'manual confirmed'
    : hole.status;
  const qualitySummary = `${readQuality.label}${readQuality.score ? ` ${readQuality.score}` : ''}`;
  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  const handleSnapshot = useCallback(() => {
    recordDiagnosticSnapshot(
      'Tester snapshot saved',
      buildDiagnosticSnapshot({
        readState,
        readQuality,
        settings,
        slope,
        hole,
        ui,
      }),
    );
  }, [hole, readQuality, readState, settings, slope, ui]);

  const handleShare = useCallback(async () => {
    try {
      const report = buildDiagnosticReport({
        entries,
        readState,
        readQuality,
        settings,
        slope,
        hole,
        ui,
      });
      await Share.share({ message: report });
      recordDiagnosticEvent('diagnostics-share', 'Shared field diagnostic report', {
        entryCount: entries.length,
      });
    } catch (error) {
      recordDiagnosticError('diagnostics-share', error);
    }
  }, [entries, hole, readQuality, readState, settings, slope, ui]);

  const handleClear = useCallback(async () => {
    try {
      await clearDiagnosticEntries();
    } catch (error) {
      recordDiagnosticError('diagnostics-clear', error);
    }
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>Field Test Diagnostics</Text>
          <Text style={styles.headerText}>
            Save a snapshot after a strange read, then share the report if something looks off.
          </Text>
        </View>
        <TouchableOpacity style={styles.snapshotBtn} onPress={handleSnapshot} activeOpacity={0.75}>
          <Text style={styles.snapshotBtnText}>Save Snapshot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatChip label="State" value={readState.title} />
        <StatChip label="Quality" value={qualitySummary} />
      </View>

      <View style={styles.statsRow}>
        <StatChip label="Hole" value={holeSummary} />
        <StatChip label="Slope" value={slopeSummary} />
      </View>

      <Text style={styles.feedLabel}>Recent events</Text>
      {recentEntries.length > 0 ? (
        recentEntries.map((entry) => <EntryRow key={entry.id} entry={entry} />)
      ) : (
        <Text style={styles.emptyText}>No diagnostics yet. Capture slope, set the hole, or save a snapshot to start the trail.</Text>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleShare} activeOpacity={0.75}>
          <Text style={styles.actionBtnPrimaryText}>Share Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={handleClear} activeOpacity={0.75}>
          <Text style={styles.actionBtnSecondaryText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  headerLabel: {
    color: '#64b5f6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerText: {
    color: '#b0bec5',
    fontSize: 12,
    lineHeight: 18,
  },
  snapshotBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(100,181,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.35)',
  },
  snapshotBtnText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: '#90a4ae',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  feedLabel: {
    color: '#90a4ae',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 2,
    marginBottom: 8,
  },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    marginTop: 8,
  },
  entryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  entryLevel: {
    color: '#81c784',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  entryLevelError: {
    color: '#ff8a65',
  },
  entryTime: {
    color: '#78909c',
    fontSize: 10,
  },
  entryMessage: {
    color: '#eceff1',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: '#90a4ae',
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#1565c0',
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionBtnSecondaryText: {
    color: '#b0bec5',
    fontSize: 12,
    fontWeight: '700',
  },
});
