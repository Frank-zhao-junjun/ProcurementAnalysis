import { formatWan, formatPercent, buildSensitivityRange } from './formatter.js';
import { validatePurchaseRatioParams, evaluatePurchaseRatioRisks } from './risk-rules.js';

function cloneValue(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizePurchaseRatioInputs(params = {}) {
  return {
    currentSpotRatio: Number(params.currentSpotRatio),
    targetSpotRatio: Number(params.targetSpotRatio),
    currentSpotPrice: Number(params.currentSpotPrice),
    contractPrice: Number(params.contractPrice),
    monthlyVolume: Number(params.monthlyVolume)
  };
}

export class WhatIfEngine {
  constructor(baselineSnapshot = {}) {
    this.baselineSnapshot = cloneValue(baselineSnapshot);
  }

  calculatePurchaseRatioChange(params = {}) {
    const errors = validatePurchaseRatioParams(params);

    if (errors.length > 0) {
      throw new Error(`参数校验失败: ${errors.map((item) => item.field).join(', ')}`);
    }

    const normalizedInputs = normalizePurchaseRatioInputs(params);
    const {
      currentSpotRatio,
      targetSpotRatio,
      currentSpotPrice,
      contractPrice,
      monthlyVolume
    } = normalizedInputs;

    const currentMonthlyCostYuan =
      (monthlyVolume * currentSpotRatio * currentSpotPrice) +
      (monthlyVolume * (1 - currentSpotRatio) * contractPrice);

    const targetMonthlyCostYuan =
      (monthlyVolume * targetSpotRatio * currentSpotPrice) +
      (monthlyVolume * (1 - targetSpotRatio) * contractPrice);

    const monthlySavingYuan = currentMonthlyCostYuan - targetMonthlyCostYuan;
    const quarterlySavingWan = formatWan(monthlySavingYuan * 3);
    const savingPercent = currentMonthlyCostYuan === 0
      ? 0
      : formatPercent((monthlySavingYuan / currentMonthlyCostYuan) * 100);

    return {
      scenarioId: 'purchase_ratio',
      scenarioName: '采购比例调整',
      inputs: { ...normalizedInputs },
      metrics: {
        currentMonthlyCostWan: formatWan(currentMonthlyCostYuan),
        targetMonthlyCostWan: formatWan(targetMonthlyCostYuan),
        monthlySavingWan: formatWan(monthlySavingYuan),
        quarterlySavingWan,
        savingPercent
      },
      sensitivity: buildSensitivityRange(quarterlySavingWan),
      risks: evaluatePurchaseRatioRisks({ params: normalizedInputs }),
      assumptions: [
        '月用量按当前预测不变',
        '长约价在季度内保持稳定'
      ],
      generatedAt: new Date().toISOString(),
      version: 'v1',
      baselineSnapshot: cloneValue(this.baselineSnapshot)
    };
  }
}