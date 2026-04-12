export const SCENARIO_REGISTRY = {
  purchase_ratio: {
    id: 'purchase_ratio',
    title: '采购比例调整',
    description: '模拟调整现货与长约采购比例后的季度成本变化',
    paramLabels: {
      currentSpotRatio: '当前现货比例',
      targetSpotRatio: '目标现货比例',
      currentSpotPrice: '当前现货价',
      contractPrice: '长约价',
      monthlyVolume: '月采购量'
    },
    defaultParams: {
      currentSpotRatio: 0.6,
      targetSpotRatio: 0.3,
      currentSpotPrice: 5200,
      contractPrice: 4800,
      monthlyVolume: 10000
    },
    limits: {
      currentSpotRatio: { min: 0, max: 1, step: 0.05 },
      targetSpotRatio: { min: 0, max: 1, step: 0.05 },
      currentSpotPrice: { min: 0, max: 20000, step: 10 },
      contractPrice: { min: 0, max: 20000, step: 10 },
      monthlyVolume: { min: 100, max: 1000000, step: 100 }
    },
    engineMethod: 'calculatePurchaseRatioChange'
  }
};

export function getScenarioConfig(scenarioId) {
  const config = SCENARIO_REGISTRY[scenarioId];

  if (!config) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  return config;
}