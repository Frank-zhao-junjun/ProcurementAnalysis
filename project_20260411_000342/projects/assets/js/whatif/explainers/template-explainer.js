function formatRatio(value) {
  const percent = Number((Number(value || 0) * 100).toFixed(1));
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent}%`.replace(/\.0%(?=$)/, '%');
}

function buildRiskSummary(result) {
  if (!Array.isArray(result?.risks) || result.risks.length === 0) {
    return '当前未触发新增风险规则。';
  }

  const riskText = result.risks
    .map((risk) => `${risk.code} ${risk.message}`)
    .join('；');

  return `已识别 ${result.risks.length} 项风险：${riskText}。`;
}

function buildRecommendation(result) {
  const monthlySavingWan = Number(result?.metrics?.monthlySavingWan || 0);
  const targetRatio = formatRatio(result?.inputs?.targetSpotRatio);

  if (monthlySavingWan > 0) {
    return `建议按目标现货比例 ${targetRatio} 推进执行，并同步跟踪风险项和关键假设是否发生变化。`;
  }

  if (monthlySavingWan < 0) {
    return `建议暂缓推进目标现货比例 ${targetRatio}，先复核价格条件、风险项和执行前提。`;
  }

  return `建议维持当前采购比例安排，并持续监控价格波动与风险信号。`;
}

export function createTemplateExplainer() {
  return function explainWithTemplate(result) {
    if (!result) {
      return '运行模拟后将在此展示情景解释。';
    }

    const assumptions = Array.isArray(result.assumptions) && result.assumptions.length > 0
      ? result.assumptions.join('；')
      : '暂无额外假设说明';

    return [
      `1. 结论\n本次${result.scenarioName}模拟预计单月影响 ${result.metrics.monthlySavingWan} 万元，季度影响 ${result.metrics.quarterlySavingWan} 万元，节约比例 ${result.metrics.savingPercent}%。`,
      `2. 数据解读\n现货比例由 ${formatRatio(result.inputs.currentSpotRatio)} 调整至 ${formatRatio(result.inputs.targetSpotRatio)} 后，当前月度成本由 ${result.metrics.currentMonthlyCostWan} 万元变化为 ${result.metrics.targetMonthlyCostWan} 万元；敏感性区间显示乐观 ${result.sensitivity.bestCaseWan} 万元、基准 ${result.sensitivity.baseCaseWan} 万元、保守 ${result.sensitivity.worstCaseWan} 万元。`,
      `3. 风险提示\n${buildRiskSummary(result)} 当前测算基于以下假设：${assumptions}。`,
      `4. 执行建议\n${buildRecommendation(result)}`
    ].join('\n\n');
  };
}