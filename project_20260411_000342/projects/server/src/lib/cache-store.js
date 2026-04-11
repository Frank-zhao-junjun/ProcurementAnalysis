const DEFAULT_MAX_ENTRIES = 250;

export function createCacheStore({ maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
  const store = new Map();

  function sweepExpired(now = Date.now()) {
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  }

  function get(key) {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }

    return entry.value;
  }

  function set(key, value, ttlMs) {
    const now = Date.now();
    const expiresAt = now + Math.max(ttlMs ?? 0, 0);

    sweepExpired(now);

    while (!store.has(key) && store.size >= maxEntries) {
      const oldestKey = store.keys().next().value;
      if (!oldestKey) {
        break;
      }
      store.delete(oldestKey);
    }

    store.set(key, { value, expiresAt });
    return value;
  }

  function clear() {
    store.clear();
  }

  return {
    get,
    set,
    clear,
    sweepExpired
  };
}