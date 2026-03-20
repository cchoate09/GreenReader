import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {
  speedInfo,
  gradeLabel,
  GRAIN_OPTIONS,
} from '../utils/puttingPhysics';
import { getReadOutcome } from '../utils/puttRead';
import { getReadQualityGuidance } from '../utils/readQuality';
import ElevationProfile from './ElevationProfile';

const STIMP_PRESETS = [
  { label: 'Slow', value: 7 },
  { label: 'Med', value: 9 },
  { label: 'Fast', value: 11 },
  { label: 'Tour', value: 13 },
];

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statVal}>{value}</Text>
    </View>
  );
}

function qualityColor(level) {
  if (level === 'high') return '#4caf50';
  if (level === 'medium') return '#ffb300';
  if (level === 'low') return '#ff7043';
  return '#90a4ae';
}

function readStatusSummary({ hole, hasSlope }) {
  if (hasSlope && hole.status === 'confirmed') {
    return hole.source === 'manual'
      ? 'Read ready. Manual hole confirmed.'
      : 'Read ready. Auto-detected hole confirmed.';
  }

  if (hole.status === 'confirmed') {
    return hole.source === 'manual' ? 'Manual hole locked' : 'Auto-detected hole locked';
  }

  if (hole.status === 'autoDetected') return 'Detected hole waiting for confirmation';
  if (hole.status === 'placing') return 'Tap the hole on screen';
  return 'Hole not set yet';
}

export default function BottomPanel({
  slope,
  hole,
  settings,
  ui,
  readQuality,
  onDistanceChange,
  onReadSlope,
  onAdvancedRead,
  onSetHole,
  onPreview,
  onReset,
  onToggleAdvanced,
  onGreenSpeedChange,
  onStimpCalibrate,
  onGrainChange,
  onTrainingRead,
  onDefaultReadModeChange,
}) {
  const { width: screenW, height: windowH } = useWindowDimensions();
  const compactLayout = screenW < 390;
  const shortScreen = windowH < 780;
  const androidNavInset = Platform.OS === 'android'
    ? Math.max(0, Dimensions.get('screen').height - windowH)
    : 0;
  const panelBottomPadding = Platform.OS === 'ios'
    ? 34
    : Math.min(64, Math.max(32, androidNavInset + 20));
  const panelMaxHeight = ui.advancedOpen
    ? Math.min(windowH * 0.7, 560)
    : Math.min(windowH * 0.5, 390);
  const outcome = getReadOutcome({
    hasSlope: slope.hasSlope,
    slopeX: slope.slopeX,
    slopeY: slope.slopeY,
    distance: settings.distance,
    greenSpeed: settings.greenSpeed,
    slopeReadings: slope.readings,
    grainDir: settings.grainDir,
  });
  const speed = slope.hasSlope ? speedInfo(slope.slopeY, settings.distance) : null;
  const grade = slope.hasSlope ? gradeLabel(slope.slopeY) : 'Flat';
  const previewReady = slope.hasSlope && hole.status === 'confirmed';
  const aimStr = outcome.aim ? outcome.aim.label : '--';
  const playStr = outcome.playDist != null ? `${outcome.playDist} ft` : '--';
  const guidance = (readQuality.level === 'low' || readQuality.level === 'incomplete')
    ? getReadQualityGuidance(readQuality)
    : readStatusSummary({ hole, hasSlope: slope.hasSlope });

  return (
    <View style={styles.panel}>
      <ScrollView
        bounces={false}
        style={{ maxHeight: panelMaxHeight }}
        contentContainerStyle={[styles.panelContent, { paddingBottom: panelBottomPadding }]}
        showsVerticalScrollIndicator={ui.advancedOpen || shortScreen}
      >
      <View style={[styles.distRow, compactLayout && styles.compactDistRow]}>
        <Text style={styles.distLabel}>Distance</Text>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={50}
          step={1}
          value={settings.distance}
          onValueChange={onDistanceChange}
          minimumTrackTintColor="#4caf50"
          maximumTrackTintColor="rgba(255,255,255,0.18)"
          thumbTintColor="#4caf50"
        />
        <Text style={styles.distVal}>{settings.distance} ft</Text>
      </View>

      <View style={[styles.qualityCard, compactLayout && styles.qualityCardCompact, { borderColor: qualityColor(readQuality.level) }]}>
        <View>
          <Text style={styles.qualityLabel}>Read Quality</Text>
          <Text style={[styles.qualityValue, compactLayout && styles.qualityValueCompact, { color: qualityColor(readQuality.level) }]}>
            {readQuality.label}
            {readQuality.score ? ` ${readQuality.score}` : ''}
          </Text>
        </View>
        <Text style={styles.qualityHint}>{guidance}</Text>
      </View>

      <View style={[styles.statsRow, compactLayout && styles.compactStatsRow]}>
        <StatCard label="Aim" value={aimStr} />
        <StatCard label="Play As" value={playStr} />
      </View>

      <View style={[styles.btnRow, compactLayout && styles.compactBtnRow]}>
        <TouchableOpacity style={[styles.btn, compactLayout && styles.btnCompact, styles.btnOutline]} onPress={onReadSlope} activeOpacity={0.7}>
          <Text style={[styles.btnOutlineText, compactLayout && styles.btnTextCompact]}>Read Slope</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, compactLayout && styles.btnCompact, styles.btnHole]} onPress={onSetHole} activeOpacity={0.7}>
          <Text style={[styles.btnHoleText, compactLayout && styles.btnTextCompact]}>Set Hole</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.btnRow, compactLayout && styles.compactBtnRow]}>
        <TouchableOpacity
          style={[styles.btn, compactLayout && styles.btnCompact, styles.btnPreview, !previewReady && styles.btnDisabled]}
          onPress={onPreview}
          activeOpacity={0.7}
          disabled={!previewReady}
        >
          <Text style={[styles.btnPreviewText, compactLayout && styles.btnTextCompact]}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, compactLayout && styles.btnCompact, styles.btnPrimary]} onPress={onReset} activeOpacity={0.7}>
          <Text style={[styles.btnPrimaryText, compactLayout && styles.btnTextCompact]}>Reset Read</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.advancedToggle} onPress={onToggleAdvanced} activeOpacity={0.75}>
        <Text style={styles.advancedToggleText}>{ui.advancedOpen ? 'Hide Advanced' : 'Advanced + Training'}</Text>
      </TouchableOpacity>

      {ui.advancedOpen && (
        <View style={styles.advancedSection}>
          <Text style={styles.advancedTitle}>Advanced Settings</Text>

          <View style={[styles.settingRow, compactLayout && styles.settingRowCompact]}>
            <Text style={[styles.settingLabel, compactLayout && styles.settingLabelCompact]}>Default Mode</Text>
            <View style={[styles.settingButtons, compactLayout && styles.settingButtonsCompact]}>
              <TouchableOpacity
                style={[
                  styles.settingBtn,
                  compactLayout && styles.settingBtnCompact,
                  settings.defaultReadMode === 'basic' && styles.settingBtnActive,
                ]}
                onPress={() => onDefaultReadModeChange?.('basic')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.settingBtnText,
                    settings.defaultReadMode === 'basic' && styles.settingBtnTextActive,
                  ]}
                >
                  Basic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.settingBtn,
                  compactLayout && styles.settingBtnCompact,
                  settings.defaultReadMode === 'advanced' && styles.settingBtnActive,
                ]}
                onPress={() => onDefaultReadModeChange?.('advanced')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.settingBtnText,
                    settings.defaultReadMode === 'advanced' && styles.settingBtnTextActive,
                  ]}
                >
                  Advanced
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingRow, compactLayout && styles.settingRowCompact]}>
            <Text style={[styles.settingLabel, compactLayout && styles.settingLabelCompact]}>Green Speed</Text>
            <View style={[styles.settingButtons, compactLayout && styles.settingButtonsCompact]}>
              {STIMP_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.settingBtn,
                    compactLayout && styles.settingBtnCompact,
                    settings.greenSpeed === preset.value && styles.settingBtnActive,
                  ]}
                  onPress={() => onGreenSpeedChange?.(preset.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.settingBtnText, settings.greenSpeed === preset.value && styles.settingBtnTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.stimpCalBtn, compactLayout && styles.stimpCalBtnCompact]}
                onPress={onStimpCalibrate}
                activeOpacity={0.7}
              >
                <Text style={styles.stimpCalText}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingRow, compactLayout && styles.settingRowCompact]}>
            <Text style={[styles.settingLabel, compactLayout && styles.settingLabelCompact]}>Grain</Text>
            <View style={[styles.settingButtons, compactLayout && styles.settingButtonsCompact]}>
              {GRAIN_OPTIONS.map((grain) => (
                <TouchableOpacity
                  key={grain.key}
                  style={[
                    styles.settingBtn,
                    compactLayout && styles.settingBtnCompact,
                    settings.grainDir === grain.key && styles.grainBtnActive,
                  ]}
                  onPress={() => onGrainChange?.(grain.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.settingBtnText, settings.grainDir === grain.key && styles.grainBtnTextActive]}>
                    {grain.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {slope.hasSlope && (
            <View style={styles.speedCard}>
              <View>
                <Text style={styles.speedLabel}>Derived Read</Text>
                <Text style={styles.speedValue}>{speed ? speed.label : '--'}</Text>
                <Text style={styles.speedHint}>{grade}</Text>
              </View>
              <Text style={styles.speedDetail}>{speed ? speed.desc : 'Capture slope to compute pace.'}</Text>
            </View>
          )}

          {slope.readings?.length > 0 && (
            <View style={styles.elevRow}>
              <ElevationProfile
                width={screenW - 28}
                slopeReadings={slope.readings}
                distance={settings.distance}
              />
            </View>
          )}

          <View style={[styles.btnRow, compactLayout && styles.compactBtnRow]}>
            <TouchableOpacity style={[styles.btn, compactLayout && styles.btnCompact, styles.btnOutline]} onPress={onAdvancedRead} activeOpacity={0.7}>
              <Text style={[styles.btnOutlineText, compactLayout && styles.btnTextCompact]}>Advanced Read</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, compactLayout && styles.btnCompact, styles.btnTraining]} onPress={onTrainingRead} activeOpacity={0.7}>
              <Text style={[styles.btnTrainingText, compactLayout && styles.btnTextCompact]}>Training Read</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.84)',
  },
  panelContent: {
    gap: 0,
  },

  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  compactDistRow: {
    marginBottom: 10,
    gap: 8,
  },
  distLabel: {
    fontSize: 11,
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slider: { flex: 1, height: 40 },
  distVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4caf50',
    minWidth: 44,
    textAlign: 'right',
  },

  qualityCard: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 6,
  },
  qualityCardCompact: {
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  qualityLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#9e9e9e',
    marginBottom: 2,
  },
  qualityValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  qualityValueCompact: {
    fontSize: 18,
  },
  qualityHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#b0bec5',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  compactStatsRow: {
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.22)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#9e9e9e',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4caf50',
  },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  compactBtnRow: {
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnCompact: {
    paddingVertical: 12,
  },
  btnTextCompact: {
    fontSize: 13,
  },
  btnPrimary: { backgroundColor: '#4caf50' },
  btnPrimaryText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnOutlineText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnHole: { backgroundColor: '#1565c0' },
  btnHoleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnPreview: { backgroundColor: '#7b1fa2' },
  btnPreviewText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnTraining: { backgroundColor: '#ef6c00' },
  btnTrainingText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.45 },

  advancedToggle: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  advancedToggleText: {
    color: '#90a4ae',
    fontSize: 13,
    fontWeight: '700',
  },

  advancedSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  advancedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffb300',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  settingRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  settingLabel: {
    fontSize: 11,
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingLabelCompact: {
    marginBottom: 2,
  },
  settingButtons: { flex: 1, flexDirection: 'row', gap: 5 },
  settingButtonsCompact: {
    flexWrap: 'wrap',
    rowGap: 6,
  },
  settingBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  settingBtnCompact: {
    flexBasis: '31%',
    flexGrow: 0,
    minWidth: 82,
  },
  settingBtnActive: { backgroundColor: 'rgba(76,175,80,0.25)', borderColor: '#4caf50' },
  settingBtnText: { fontSize: 11, fontWeight: '600', color: '#9e9e9e' },
  settingBtnTextActive: { color: '#4caf50' },
  stimpCalBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(33,150,243,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.4)',
  },
  stimpCalBtnCompact: {
    minWidth: 82,
    alignItems: 'center',
  },
  stimpCalText: { fontSize: 11, fontWeight: '600', color: '#64b5f6' },
  grainBtnActive: { backgroundColor: 'rgba(255,152,0,0.25)', borderColor: '#ff9800' },
  grainBtnTextActive: { color: '#ff9800' },

  speedCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 4,
  },
  speedLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#9e9e9e',
  },
  speedValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  speedHint: {
    fontSize: 11,
    color: '#ffb300',
  },
  speedDetail: {
    fontSize: 11,
    color: '#90a4ae',
  },
  elevRow: { marginBottom: 10 },
});
