const NS = 'tvetgrid.';

function isAvailable() {
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, '1');
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const available = typeof window !== 'undefined' && isAvailable();

function readRaw(key) {
  if (!available) return null;
  try {
    return window.localStorage.getItem(`${NS}${key}`);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  if (!available) return false;
  try {
    window.localStorage.setItem(`${NS}${key}`, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key) {
  if (!available) return;
  try {
    window.localStorage.removeItem(`${NS}${key}`);
  } catch {
    // ignore
  }
}

export const storage = {
  get(key, fallback = null) {
    const raw = readRaw(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },

  set(key, value) {
    return writeRaw(key, JSON.stringify(value));
  },

  remove(key) {
    removeRaw(key);
  },

  has(key) {
    return readRaw(key) !== null;
  },

  clear() {
    if (!available) return;
    try {
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(NS));
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};