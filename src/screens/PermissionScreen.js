import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';

const ANDROID_STATUS_BAR = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

const HOW_TO = [
  'Tap Enable to grant camera and motion access.',
  'Tap Read Slope and lay the phone flat near your ball.',
  'Tap Set Hole and stand at the ball to place the cup.',
  'Use Aim and Play As as a practice read, then confirm with your eyes.',
  'Open Advanced only when you want grain, speed testing, or training mode.',
];

export default function PermissionScreen({ onEnable }) {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>GR</Text>
        </View>
        <Text style={styles.title}>GreenReader</Text>
        <Text style={styles.subtitle}>
          Practice green-reading aid with quick AR aim and pace guidance powered by your phone sensors.
        </Text>

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>HOW IT WORKS</Text>
          {HOW_TO.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumContainer}>
                <Text style={styles.stepNum}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Camera is used for the live overlay only. GreenReader is designed for practice and training, and camera or sensor data is not stored.
          </Text>
        </View>

        <TouchableOpacity style={styles.enableBtn} onPress={onEnable} activeOpacity={0.8}>
          <Text style={styles.enableText}>Enable Camera and Sensors</Text>
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
    paddingTop: Platform.OS === 'ios' ? 80 : ANDROID_STATUS_BAR + 36,
    paddingBottom: Platform.OS === 'android' ? 48 : 40,
    paddingHorizontal: 24,
  },
  badge: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: 'rgba(76,175,80,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  badgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4caf50',
    letterSpacing: 0.5,
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
    maxWidth: 320,
  },
  howTo: {
    backgroundColor: 'rgba(76,175,80,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 348,
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
    maxWidth: 348,
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
    maxWidth: 348,
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
