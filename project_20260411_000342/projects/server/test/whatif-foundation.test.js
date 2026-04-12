import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWan,
  formatPercent,
  clampRatio,
  buildSensitivityRange
} from '../../assets/js/whatif/formatter.js';
import {
  evaluatePurchaseRatioRisks,
  validatePurchaseRatioParams
} from '../../assets/js/whatif/risk-rules.js';
import {
  SCENARIO_REGISTRY,
  getScenarioConfig
} from '../../assets/js/whatif/scenario-registry.js';

test('scenario registry exposes purchase_ratio defaults and limits', () => {
  const config = getScenarioConfig('purchase_ratio');

  assert.equal(config.id, 'purchase_ratio');
  assert.equal(config.defaultParams.currentSpotRatio, 0.6);
  assert.equal(config.defaultParams.targetSpotRatio, 0.3);
  assert.equal(config.defaultParams.currentSpotPrice, 5200);
  assert.equal(config.defaultParams.contractPrice, 4800);
  assert.equal(config.defaultParams.monthlyVolume, 10000);
  assert.deepEqual(config.paramLabels, {
    currentSpotRatio: '当前现货比例',
    targetSpotRatio: '目标现货比例',
    currentSpotPrice: '当前现货价',
    contractPrice: '长约价',
    monthlyVolume: '月采购量'
  });
  assert.deepEqual(config.limits.targetSpotRatio, { min: 0, max: 1, step: 0.05 });
  assert.equal(SCENARIO_REGISTRY.purchase_ratio.title, '采购比例调整');
});

test('formatter outputs 万元, percentages, clamps, and sensitivity range consistently', () => {
  assert.equal(formatWan(31200000), 3120);
  assert.equal(formatPercent(3.76), 3.8);
  assert.equal(formatPercent(3.764, 2), 3.76);
  assert.equal(clampRatio(-0.2), 0);
  assert.equal(clampRatio(1.4), 1);
  assert.deepEqual(buildSensitivityRange(360), {
    bestCaseWan: 414,
    baseCaseWan: 360,
    worstCaseWan: 306
  });
});

test('risk rules validate params and emit structured warnings', () => {
  const validParams = {
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.15,
    currentSpotPrice: 5400,
    contractPrice: 4800,
    monthlyVolume: 10000
  };

  assert.deepEqual(validatePurchaseRatioParams(validParams), []);
  assert.deepEqual(evaluatePurchaseRatioRisks({ params: validParams }), [
    {
      code: 'LOW_SPOT_RATIO',
      level: 'medium',
      message: '现货比例过低可能导致交付灵活性下降'
    },
    {
      code: 'SPOT_PRICE_PREMIUM',
      level: 'low',
      message: '当前现货价显著高于长约价，调整方向有利于节约'
    },
    {
      code: 'LARGE_RATIO_SHIFT',
      level: 'medium',
      message: '本次比例调整幅度较大，建议结合供应保障评估后执行'
    }
  ]);

  const invalidParams = {
    currentSpotRatio: 1.2,
    targetSpotRatio: -0.1,
    currentSpotPrice: Number.NaN,
    contractPrice: -1,
    monthlyVolume: 0
  };

  assert.deepEqual(
    validatePurchaseRatioParams(invalidParams).map((item) => item.field),
    ['currentSpotRatio', 'targetSpotRatio', 'currentSpotPrice', 'contractPrice', 'monthlyVolume']
  );
});

test('risk rules reject blank strings for required numeric fields', () => {
  const errors = validatePurchaseRatioParams({
    currentSpotRatio: '',
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: ''
  });

  assert.deepEqual(errors, [
    { field: 'currentSpotRatio', message: 'currentSpotRatio 必须在 0 到 1 之间' },
    { field: 'monthlyVolume', message: 'monthlyVolume 必须大于 0' }
  ]);
});

test('risk rules treat an exact 0.4 ratio shift as LARGE_RATIO_SHIFT', () => {
  const risks = evaluatePurchaseRatioRisks({
    params: {
      currentSpotRatio: 0.6,
      targetSpotRatio: 0.2,
      currentSpotPrice: 5200,
      contractPrice: 4800,
      monthlyVolume: 10000
    }
  });

  assert.ok(risks.some((risk) => risk.code === 'LARGE_RATIO_SHIFT'));
});