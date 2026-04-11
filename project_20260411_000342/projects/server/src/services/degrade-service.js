function summarizeMessage(message) {
  if (!message) {
    return '当前请求已进入简版结论模式，请稍后重试完整分析。';
  }

  const normalized = String(message).trim();
  if (!normalized) {
    return '当前请求已进入简版结论模式，请稍后重试完整分析。';
  }

  return normalized.length > 60 ? `${normalized.slice(0, 60)}...` : normalized;
}

export function createDegradeReply({ message, runtimeContext = {} } = {}) {
  const summary = summarizeMessage(message);
  const moduleName = runtimeContext.activeModule || runtimeContext.activeTab || '当前模块';

  return {
    role: 'assistant',
    content: `简版结论：已暂时切换为降级模式。你当前位于${moduleName}，问题是“${summary}”。建议先查看关键指标与风险预警，再稍后重试详细问答。`,
    runtimeContext,
    metadata: {
      degraded: true,
      reason: 'degrade_mode',
      generatedAt: new Date().toISOString()
    }
  };
}