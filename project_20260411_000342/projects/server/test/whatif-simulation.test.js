import test from 'node:test';
import assert from 'node:assert/strict';
import { WhatIfEngine } from '../../assets/js/whatif/simulation-engine.js';

function createEngine() {
  return new WhatIfEngine({
    category: '钢材',
    source: 'tab2',
    baselineDateRange: '2026-W15'
  });
}

test('purchase ratio simulation returns the standard result contract', () => {
  const engine = createEngine();
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(result.scenarioId, 'purchase_ratio');
  assert.equal(result.scenarioName, '采购比例调整');
  assert.deepEqual(result.inputs, {
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });
  assert.deepEqual(result.metrics, {
    currentMonthlyCostWan: 5040,
    targetMonthlyCostWan: 4920,
    monthlySavingWan: 120,
    quarterlySavingWan: 360,
    savingPercent: 2.4
  });
  assert.deepEqual(result.sensitivity, {
    bestCaseWan: 414,
    baseCaseWan: 360,
    worstCaseWan: 306
  });
  assert.deepEqual(result.risks, []);
  assert.deepEqual(result.assumptions, [
    '月用量按当前预测不变',
    '长约价在季度内保持稳定'
  ]);
  assert.equal(typeof result.generatedAt, 'string');
  assert.equal(Number.isNaN(Date.parse(result.generatedAt)), false);
  assert.equal(result.version, 'v1');
  assert.deepEqual(result.baselineSnapshot, {
    category: '钢材',
    source: 'tab2',
    baselineDateRange: '2026-W15'
  });
});

test('purchase ratio simulation returns zero saving when ratios are unchanged', () => {
  const engine = createEngine();
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.5,
    targetSpotRatio: 0.5,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(result.metrics.monthlySavingWan, 0);
  assert.equal(result.metrics.quarterlySavingWan, 0);
  assert.equal(result.metrics.savingPercent, 0);
});

test('purchase ratio simulation can represent a negative outcome when spot is cheaper than contract', () => {
  const engine = createEngine();
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.2,
    currentSpotPrice: 4500,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(result.metrics.monthlySavingWan < 0, true);
  assert.equal(result.metrics.quarterlySavingWan < 0, true);
});

test('purchase ratio simulation normalizes string inputs in returned inputs', () => {
  const engine = createEngine();
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: '0.6',
    targetSpotRatio: '0.3',
    currentSpotPrice: '5200',
    contractPrice: '4800',
    monthlyVolume: '10000'
  });

  assert.deepEqual(result.inputs, {
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });
  assert.equal(typeof result.inputs.currentSpotRatio, 'number');
  assert.equal(typeof result.inputs.monthlyVolume, 'number');
});

test('purchase ratio simulation isolates nested baseline snapshot from later mutation', () => {
  const baselineSnapshot = {
    category: '钢材',
    source: 'tab2',
    filters: {
      businessUnit: '新能源事业部',
      supplier: '宝钢'
    }
  };
  const engine = new WhatIfEngine(baselineSnapshot);
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  baselineSnapshot.filters.businessUnit = '家电事业部';
  result.baselineSnapshot.filters.supplier = '河钢';

  assert.deepEqual(result.baselineSnapshot, {
    category: '钢材',
    source: 'tab2',
    filters: {
      businessUnit: '新能源事业部',
      supplier: '河钢'
    }
  });

  const nextResult = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.deepEqual(nextResult.baselineSnapshot, {
    category: '钢材',
    source: 'tab2',
    filters: {
      businessUnit: '新能源事业部',
      supplier: '宝钢'
    }
  });
});

test('purchase ratio simulation returns representative risk objects when scenario warrants it', () => {
  const engine = createEngine();
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.7,
    targetSpotRatio: 0.1,
    currentSpotPrice: 5600,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(Array.isArray(result.risks), true);
  assert.ok(result.risks.length > 0);
  result.risks.forEach((risk) => {
    assert.equal(typeof risk, 'object');
    assert.equal(typeof risk.code, 'string');
    assert.equal(typeof risk.level, 'string');
    assert.equal(typeof risk.message, 'string');
    assert.ok(risk.code.length > 0);
    assert.ok(risk.level.length > 0);
    assert.ok(risk.message.length > 0);
  });
});

test('purchase ratio simulation includes LARGE_RATIO_SHIFT on an exact 0.4 ratio change', () => {
  const engine = createEngine();
  const result = engine.calculatePurchaseRatioChange({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.2,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.ok(result.risks.some((risk) => risk.code === 'LARGE_RATIO_SHIFT'));
});

test('purchase ratio simulation rejects invalid inputs', () => {
  const engine = createEngine();

  assert.throws(() => {
    engine.calculatePurchaseRatioChange({
      currentSpotRatio: 1.2,
      targetSpotRatio: 0.3,
      currentSpotPrice: 5200,
      contractPrice: 4800,
      monthlyVolume: 10000
    });
  }, /参数校验失败/);
});