export function formatWan(amountYuan) {
  return Math.round((Number(amountYuan) || 0) / 10000);
}

export function formatPercent(value, digits = 1) {
  return Number((Number(value) || 0).toFixed(digits));
}

export function clampRatio(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export function buildSensitivityRange(baseCaseWan) {
  const base = Number(baseCaseWan) || 0;

  return {
    bestCaseWan: Math.round(base * 1.15),
    baseCaseWan: Math.round(base),
    worstCaseWan: Math.round(base * 0.85)
  };
}