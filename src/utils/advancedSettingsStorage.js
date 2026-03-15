const STORAGE_KEY = '@greenreader/advanced-settings/v1';
const memoryFallback = new Map();

let AsyncStorage = null;

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (_) {
  AsyncStorage = null;
}

export async function loadAdvancedSettings() {
  try {
    const raw = AsyncStorage
      ? await AsyncStorage.getItem(STORAGE_KEY)
      : memoryFallback.get(STORAGE_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export async function saveAdvancedSettings(settings) {
  const raw = JSON.stringify(settings);

  try {
    if (AsyncStorage) {
      await AsyncStorage.setItem(STORAGE_KEY, raw);
      return;
    }

    memoryFallback.set(STORAGE_KEY, raw);
  } catch (_) {
    // Ignore persistence failures so the read flow keeps working.
  }
}
