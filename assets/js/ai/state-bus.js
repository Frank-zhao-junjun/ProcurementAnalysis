function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function cloneValue(value) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function mergeState(current, partial) {
  if (!isPlainObject(partial)) {
    return cloneValue(partial);
  }

  const base = isPlainObject(current) ? { ...current } : {};

  for (const [key, value] of Object.entries(partial)) {
    if (isPlainObject(value)) {
      base[key] = mergeState(base[key], value);
      continue;
    }

    base[key] = cloneValue(value);
  }

  return base;
}

export function createInitialDashboardState(overrides = {}) {
  return mergeState({
    session: {
      userRole: null,
      dateRange: null
    },
    ui: {
      activeTab: 'tabHome',
      activeModule: '首页驾驶舱',
      selectedDimension: '集团',
      activeFilters: {},
      selectedEntity: null,
      highlightedChart: null
    }
  }, overrides);
}

export function createDashboardStateBus({ initialState = createInitialDashboardState() } = {}) {
  let state = cloneValue(initialState);
  const listeners = new Set();

  function notify() {
    const snapshot = cloneValue(state);
    listeners.forEach((listener) => listener(cloneValue(snapshot)));
    return snapshot;
  }

  return {
    update(partialState) {
      state = mergeState(state, partialState);
      return notify();
    },
    getSnapshot() {
      return cloneValue(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

if (typeof window !== 'undefined') {
  window.PIDashboardAI = {
    ...(window.PIDashboardAI || {}),
    createInitialDashboardState,
    createDashboardStateBus
  };
}