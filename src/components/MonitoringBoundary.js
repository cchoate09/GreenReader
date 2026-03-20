import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import {
  formatDiagnosticReport,
  getDiagnosticEntries,
  recordDiagnosticError,
} from '../utils/fieldDiagnostics';

export default class MonitoringBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const componentStack = info?.componentStack ?? null;
    this.setState({ componentStack });
    recordDiagnosticError('react-boundary', error, { componentStack });
  }

  handleShare = async () => {
    try {
      const entries = await getDiagnosticEntries();
      const report = formatDiagnosticReport({
        entries,
        header: 'GreenReader crash report',
        extraLines: [
          this.state.error?.message ? `Crash message: ${this.state.error.message}` : null,
          this.state.componentStack ? `Component stack: ${this.state.componentStack}` : null,
        ],
      });
      await Share.share({ message: report });
    } catch (error) {
      recordDiagnosticError('crash-report-share', error);
    }
  };

  handleRetry = () => {
    this.setState({
      error: null,
      componentStack: null,
    });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>GreenReader hit an error</Text>
          <Text style={styles.body}>
            The latest diagnostics were saved on this device. Share the crash report, then reopen the app if the screen does not recover.
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={this.handleShare} activeOpacity={0.8}>
              <Text style={styles.primaryText}>Share Crash Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={this.handleRetry} activeOpacity={0.8}>
              <Text style={styles.secondaryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ff8a65',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cfd8dc',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#1565c0',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryText: {
    color: '#eceff1',
    fontSize: 14,
    fontWeight: '700',
  },
});
