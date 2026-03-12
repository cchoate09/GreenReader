import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';

const HOW_TO = [
  'Tap Enable to grant camera & motion access.',
  'Tap Read Slope → lay phone flat on the green near your ball.',
  'Tap Capture Slope to lock in the reading.',
  'Pick up phone, set distance, and aim at the hole.',
  'Follow the yellow aim line and speed guide.',
];

/**
 * Initial permission / welcome screen.
 * Props:
 *   onEnable – called when user taps Enable
 */
export default function PermissionScreen({ onEnable }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <Text style={styles.icon}>⛳</Text>
        <Text style={styles.title}>GreenReader</Text>
        <Text style={styles.subtitle}>
          AR putting line, break detection, and speed recommendations — powered by your phone's sensors.
        </Text>

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>HOW IT WORKS</Text>
          {HOW_TO.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumContainer}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            📷 Camera is used for AR overlay only — no video is stored or transmitted.
          </Text>
        </View>

        <TouchableOpacity style={styles.enableBtn} onPress={onEnable} activeOpacity={0.8}>
          <Text style={styles.enableText}>Enable Camera &amp; Sensors</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071207',
  },
  content: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 48,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  icon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4caf50',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#9e9e9e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 300,
  },
  howTo: {
    backgroundColor: 'rgba(76,175,80,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 340,
    marginBottom: 16,
  },
  howToTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4caf50',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepNumContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(76,175,80,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4caf50',
  },
  stepText: {
    fontSize: 14,
    color: '#b0bec5',
    lineHeight: 20,
    flex: 1,
  },
  noteBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    maxWidth: 340,
    marginBottom: 28,
  },
  noteText: {
    fontSize: 12,
    color: '#78909c',
    lineHeight: 18,
    textAlign: 'center',
  },
  enableBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#4caf50',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  enableText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
});
