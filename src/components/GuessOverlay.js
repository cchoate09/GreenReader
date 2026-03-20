import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';

export default function GuessOverlay({ puttDistance, onSubmit, onSkip }) {
  const [breakDir, setBreakDir] = useState('STRAIGHT');
  const [breakInches, setBreakInches] = useState(0);
  const [hitDistance, setHitDistance] = useState(puttDistance);

  const handleSubmit = useCallback(() => {
    onSubmit({ breakDir, breakInches, hitDistance });
  }, [breakDir, breakInches, hitDistance, onSubmit]);

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Training Read</Text>
        <Text style={styles.subtitle}>
          Guess the break and pace before measuring
        </Text>

        <Text style={styles.sectionLabel}>Break Direction</Text>
        <View style={styles.dirRow}>
          {['LEFT', 'STRAIGHT', 'RIGHT'].map((direction) => (
            <TouchableOpacity
              key={direction}
              style={[styles.dirBtn, breakDir === direction && styles.dirBtnActive]}
              onPress={() => setBreakDir(direction)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dirText, breakDir === direction && styles.dirTextActive]}>
                {direction === 'LEFT' ? 'Left' : direction === 'RIGHT' ? 'Right' : 'Straight'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {breakDir !== 'STRAIGHT' && (
          <>
            <Text style={styles.sectionLabel}>
              Break Amount: <Text style={styles.valHighlight}>{breakInches}"</Text>
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={48}
              step={1}
              value={breakInches}
              onValueChange={setBreakInches}
              minimumTrackTintColor="#ff9800"
              maximumTrackTintColor="rgba(255,255,255,0.18)"
              thumbTintColor="#ff9800"
            />
          </>
        )}

        <Text style={styles.sectionLabel}>
          Hit Distance: <Text style={styles.valHighlight}>{hitDistance} ft</Text>
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={60}
          step={1}
          value={hitDistance}
          onValueChange={setHitDistance}
          minimumTrackTintColor="#4caf50"
          maximumTrackTintColor="rgba(255,255,255,0.18)"
          thumbTintColor="#4caf50"
        />

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.7}>
            <Text style={styles.submitText}>Lock In Guess</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function GuessResults({ guess, actual, onClose }) {
  const dirMatch =
    (guess.breakDir === 'LEFT' && actual.breakDir === 'L') ||
    (guess.breakDir === 'RIGHT' && actual.breakDir === 'R') ||
    (guess.breakDir === 'STRAIGHT' && actual.breakDir === null);

  const inchDiff = Math.abs(guess.breakInches - actual.breakInches);
  const distDiff = Math.abs(guess.hitDistance - actual.playDist);

  let score = 100;
  if (!dirMatch) score -= 30;
  score -= Math.min(40, inchDiff * 3);
  score -= Math.min(30, distDiff * 3);
  score = Math.max(0, Math.round(score));

  const grade =
    score >= 90 ? 'A+' :
    score >= 80 ? 'A' :
    score >= 70 ? 'B' :
    score >= 60 ? 'C' :
    score >= 40 ? 'D' : 'F';

  const gradeColor =
    score >= 80 ? '#4caf50' :
    score >= 60 ? '#ff9800' : '#f44336';

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Your Read Accuracy</Text>

        <View style={styles.gradeRow}>
          <Text style={[styles.grade, { color: gradeColor }]}>{grade}</Text>
          <Text style={styles.scoreText}>{score}/100</Text>
        </View>

        <View style={styles.compareRow}>
          <Text style={styles.compareHeader}>{'               '}</Text>
          <Text style={[styles.compareHeader, styles.compareYou]}>You</Text>
          <Text style={[styles.compareHeader, styles.compareActual]}>Actual</Text>
        </View>

        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>Direction</Text>
          <Text style={[styles.compareVal, dirMatch && styles.correct]}>
            {guess.breakDir === 'LEFT' ? 'Left' : guess.breakDir === 'RIGHT' ? 'Right' : 'Straight'}
          </Text>
          <Text style={styles.compareVal}>
            {actual.breakDir === 'L' ? 'Left' : actual.breakDir === 'R' ? 'Right' : 'Straight'}
          </Text>
        </View>

        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>Break</Text>
          <Text style={[styles.compareVal, inchDiff <= 3 && styles.correct]}>
            {guess.breakInches}"
          </Text>
          <Text style={styles.compareVal}>{actual.breakInches}"</Text>
        </View>

        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>Hit Dist</Text>
          <Text style={[styles.compareVal, distDiff <= 2 && styles.correct]}>
            {guess.hitDistance} ft
          </Text>
          <Text style={styles.compareVal}>{actual.playDist} ft</Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.submitText}>Got It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  card: {
    width: '88%',
    backgroundColor: 'rgba(20,20,30,0.96)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    padding: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#90a4ae',
    textAlign: 'center',
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  valHighlight: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  dirRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dirBtnActive: {
    backgroundColor: 'rgba(255,152,0,0.25)',
    borderColor: '#ff9800',
  },
  dirText: { fontSize: 13, fontWeight: '600', color: '#9e9e9e' },
  dirTextActive: { color: '#ff9800' },
  slider: { width: '100%', height: 40 },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#ff9800',
    marginTop: 8,
  },
  submitText: { color: '#000', fontWeight: '700', fontSize: 14 },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 16,
  },
  grade: { fontSize: 52, fontWeight: '900' },
  scoreText: { fontSize: 18, fontWeight: '600', color: '#9e9e9e' },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  compareHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#616161',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  compareYou: { color: '#ff9800' },
  compareActual: { color: '#4caf50' },
  compareLabel: { flex: 1, fontSize: 13, color: '#9e9e9e', fontWeight: '600' },
  compareVal: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },
  correct: { color: '#4caf50' },
});
