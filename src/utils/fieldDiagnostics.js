import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@greenreader/field-diagnostics/v1';
const MAX_ENTRIES = 40;
const subscribers = new Set();

let cachedEntries = null;
let writeQueue = Promise.resolve();

function normalizeNumber(value) {
  if (!Number.isFinite(value)) return value;
  return Number.isInteger(value) ? value : Number(value.toFixed(3));
}

function sanitizeDetails(details) {
  if (details == null) return {};
  if (Array.isArray(details)) return details.map(sanitizeDetails);
  if (typeof details === 'number') return normalizeNumber(details);
  if (typeof details !== 'object') return details;

  return Object.fromEntries(
    Object.entries(details)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, sanitizeDetails(value)]),
  );
}

function createEntry(level, type, message, details = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    type,
    message,
    details: sanitizeDetails(details),
    timestamp: new Date().toISOString(),
  };
}

async function ensureLoaded() {
  if (cachedEntries) return cachedEntries;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cachedEntries = raw ? JSON.parse(raw) : [];
  } catch (_) {
    cachedEntries = [];
  }

  return cachedEntries;
}

function notifySubscribers() {
  const nextEntries = cachedEntries ?? [];
  subscribers.forEach((listener) => listener(nextEntries));
}

function queueWrite(mutator) {
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const currentEntries = await ensureLoaded();
      cachedEntries = mutator(currentEntries);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedEntries));
      notifySubscribers();
      return cachedEntries;
    })
    .catch(() => {
      notifySubscribers();
      return cachedEntries ?? [];
    });

  return writeQueue;
}

function serializeError(error) {
  if (!error) {
    return {
      name: 'UnknownError',
      message: 'Unknown error',
      stack: null,
    };
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: typeof error.stack === 'string' ? error.stack.split('\n').slice(0, 8).join('\n') : null,
  };
}

function formatScalar(value) {
  if (value == null) return 'n/a';
  if (Array.isArray(value)) return value.map(formatScalar).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatDiagnosticTimestamp(timestamp) {
  if (!timestamp) return '--:--';

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildDiagnosticSnapshot({
  readState,
  readQuality,
  settings,
  slope,
  hole,
  ui,
}) {
  return sanitizeDetails({
    readState: readState?.title ?? null,
    readMeta: readState?.meta ?? null,
    readQuality: readQuality?.label ?? null,
    readScore: readQuality?.score ?? null,
    distanceFt: settings?.distance ?? null,
    greenSpeed: settings?.greenSpeed ?? null,
    grainDir: settings?.grainDir ?? null,
    slopeReady: slope?.hasSlope ?? false,
    slopeReadings: slope?.readings?.length ?? 0,
    holeStatus: hole?.status ?? null,
    holeSource: hole?.source ?? null,
    previewMode: ui?.isPreviewMode ?? false,
    advancedOpen: ui?.advancedOpen ?? false,
  });
}

export function formatDiagnosticReport({
  entries = [],
  readState,
  readQuality,
  settings,
  slope,
  hole,
  ui,
  header = 'GreenReader field diagnostic report',
  extraLines = [],
}) {
  const summaryLines = [
    header,
    `Generated: ${new Date().toISOString()}`,
    readState?.title ? `Read state: ${readState.title}` : null,
    readState?.meta ? `Context: ${readState.meta}` : null,
    readQuality?.label ? `Read quality: ${readQuality.label}${readQuality.score ? ` ${readQuality.score}` : ''}` : null,
    settings?.distance != null ? `Distance: ${settings.distance} ft` : null,
    settings?.greenSpeed != null ? `Green speed: ${settings.greenSpeed}` : null,
    settings?.grainDir ? `Grain: ${settings.grainDir}` : null,
    hole?.status ? `Hole: ${hole.status}${hole.source ? ` (${hole.source})` : ''}` : null,
    slope?.hasSlope ? `Slope: ${formatScalar(slope.slopeX)}, ${formatScalar(slope.slopeY)} (${slope.readings?.length ?? 0} readings)` : null,
    ui?.isPreviewMode != null ? `Preview mode: ${ui.isPreviewMode ? 'on' : 'off'}` : null,
    ...extraLines.filter(Boolean),
    '',
    'Recent events:',
  ].filter(Boolean);

  const eventLines = entries.length
    ? entries.slice(0, 10).map((entry) => {
        const details = entry.details && Object.keys(entry.details).length
          ? ` | ${Object.entries(entry.details).map(([key, value]) => `${key}=${formatScalar(value)}`).join(', ')}`
          : '';

        return `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${details}`;
      })
    : ['No diagnostics recorded yet.'];

  return [...summaryLines, ...eventLines].join('\n');
}

export async function getDiagnosticEntries() {
  return ensureLoaded();
}

export function subscribeDiagnosticEntries(listener) {
  subscribers.add(listener);
  ensureLoaded().then((entries) => listener(entries));

  return () => {
    subscribers.delete(listener);
  };
}

export function recordDiagnosticEvent(type, message, details = {}) {
  const entry = createEntry('info', type, message, details);
  queueWrite((entries) => [entry, ...entries].slice(0, MAX_ENTRIES));
  return entry;
}

export function recordDiagnosticSnapshot(message, details = {}) {
  return recordDiagnosticEvent('snapshot', message, details);
}

export function recordDiagnosticError(source, error, details = {}) {
  const serialized = serializeError(error);
  const entry = createEntry('error', 'error', `${source}: ${serialized.message}`, {
    ...details,
    errorName: serialized.name,
    stack: serialized.stack,
  });
  queueWrite((entries) => [entry, ...entries].slice(0, MAX_ENTRIES));
  return entry;
}

export function clearDiagnosticEntries() {
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      cachedEntries = [];
      await AsyncStorage.removeItem(STORAGE_KEY);
      notifySubscribers();
      return cachedEntries;
    })
    .catch(() => {
      cachedEntries = [];
      notifySubscribers();
      return cachedEntries;
    });

  return writeQueue;
}

export function installGlobalErrorMonitoring() {
  const errorUtils = global.ErrorUtils;

  if (
    !errorUtils
    || typeof errorUtils.getGlobalHandler !== 'function'
    || typeof errorUtils.setGlobalHandler !== 'function'
  ) {
    return () => {};
  }

  const defaultHandler = errorUtils.getGlobalHandler();
  const nextHandler = (error, isFatal) => {
    recordDiagnosticError(isFatal ? 'fatal-js' : 'global-js', error, { isFatal });

    if (typeof defaultHandler === 'function') {
      defaultHandler(error, isFatal);
    }
  };

  errorUtils.setGlobalHandler(nextHandler);

  return () => {
    errorUtils.setGlobalHandler(defaultHandler);
  };
}
