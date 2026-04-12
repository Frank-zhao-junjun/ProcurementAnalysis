import { clampRatio } from './formatter.js';

const LARGE_RATIO_SHIFT_THRESHOLD = 0.4;
const FLOAT_COMPARISON_EPSILON = 1e-9;

function isBlankNumericInput(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export function validatePurchaseRatioParams(params = {}) {
  const errors = [];
  const ratioFields = ['currentSpotRatio', 'targetSpotRatio'];
  const nonNegativeFields = ['currentSpotPrice', 'contractPrice', 'monthlyVolume'];

  ratioFields.forEach((field) => {
    if (isBlankNumericInput(params[field])) {
      errors.push({ field, message: `${field} 必须在 0 到 1 之间` });
      return;
    }

    const value = Number(params[field]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      errors.push({ field, message: `${field} 必须在 0 到 1 之间` });
    }
  });

  nonNegativeFields.forEach((field) => {
    if (isBlankNumericInput(params[field])) {
      errors.push({ field, message: field === 'monthlyVolume' ? 'monthlyVolume 必须大于 0' : `${field} 必须大于等于 0` });
      return;
    }

    const value = Number(params[field]);
    if (!Number.isFinite(value) || value < 0) {
      errors.push({ field, message: `${field} 必须大于等于 0` });
    }
  });

  if (!isBlankNumericInput(params.monthlyVolume) && Number(params.monthlyVolume) === 0) {
    errors.push({ field: 'monthlyVolume', message: 'monthlyVolume 必须大于 0' });
  }

  return errors;
}

export function evaluatePurchaseRatioRisks({ params } = {}) {
  const currentSpotRatio = clampRatio(params?.currentSpotRatio);
  const targetSpotRatio = clampRatio(params?.targetSpotRatio);
  const currentSpotPrice = Number(params?.currentSpotPrice) || 0;
  const contractPrice = Number(params?.contractPrice) || 0;
  const risks = [];
  const ratioShift = Math.abs(targetSpotRatio - currentSpotRatio);

  if (targetSpotRatio < 0.2) {
    risks.push({
      code: 'LOW_SPOT_RATIO',
      level: 'medium',
      message: '现货比例过低可能导致交付灵活性下降'
    });
  }

  if (currentSpotPrice > contractPrice * 1.1) {
    risks.push({
      code: 'SPOT_PRICE_PREMIUM',
      level: 'low',
      message: '当前现货价显著高于长约价，调整方向有利于节约'
    });
  }

  if (ratioShift + FLOAT_COMPARISON_EPSILON >= LARGE_RATIO_SHIFT_THRESHOLD) {
    risks.push({
      code: 'LARGE_RATIO_SHIFT',
      level: 'medium',
      message: '本次比例调整幅度较大，建议结合供应保障评估后执行'
    });
  }

  return risks;
}