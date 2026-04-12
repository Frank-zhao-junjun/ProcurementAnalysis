import { getScenarioConfig } from './scenario-registry.js';
import { WhatIfEngine } from './simulation-engine.js';
import { validatePurchaseRatioParams } from './risk-rules.js';
import { createTemplateExplainer } from './explainers/template-explainer.js';

const SCENARIO_ID = 'purchase_ratio';
const FIELD_ORDER = [
  'currentSpotRatio',
  'targetSpotRatio',
  'currentSpotPrice',
  'contractPrice',
  'monthlyVolume'
];
const RATIO_FIELDS = new Set(['currentSpotRatio', 'targetSpotRatio']);
const STATUS_LABELS = {
  idle: '待运行',
  running: '计算中',
  ready: '已更新',
  error: '需修正'
};
const STATUS_CLASS_NAMES = {
  idle: 'is-idle',
  running: 'is-running',
  ready: 'is-ready',
  error: 'is-error',
  low: 'is-low',
  medium: 'is-medium',
  high: 'is-high'
};
const RESULT_METRICS = [
  { key: 'currentMonthlyCostWan', label: '当前月度成本', unit: '万元' },
  { key: 'targetMonthlyCostWan', label: '目标月度成本', unit: '万元' },
  { key: 'monthlySavingWan', label: '单月影响', unit: '万元' },
  { key: 'quarterlySavingWan', label: '季度影响', unit: '万元' },
  { key: 'savingPercent', label: '节约比例', unit: '%' }
];
const TEMPLATE_EXPLAINER = createTemplateExplainer();

function cloneValue(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInputValue(field, value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }

  if (RATIO_FIELDS.has(field)) {
    return numeric.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  return String(Math.round(numeric));
}

function buildFallbackExplanation(result) {
  return result ? TEMPLATE_EXPLAINER(result) : '运行模拟后将在此展示情景解释。';
}

function formatExplanationHtml(content) {
  return escapeHtml(content).replace(/\n/g, '<br/>');
}

function resolveExplainerHandler(explainer) {
  if (typeof explainer === 'function') {
    return explainer;
  }

  if (explainer && typeof explainer.explain === 'function') {
    return (result) => explainer.explain(result);
  }

  return TEMPLATE_EXPLAINER;
}

function resolveBaselineSnapshot(baselineSnapshot, baselineSnapshotFactory) {
  if (typeof baselineSnapshotFactory === 'function') {
    return cloneValue(baselineSnapshotFactory() || {});
  }

  return cloneValue(baselineSnapshot || {});
}

function resolveScenarioMethod(engine, scenario) {
  const method = engine?.[scenario.engineMethod];

  if (typeof method !== 'function') {
    throw new Error(`Scenario engine method is unavailable: ${scenario.engineMethod}`);
  }

  return method.bind(engine);
}

function renderParameterRow(field, scenario, value) {
  const limits = scenario.limits[field];
  const label = scenario.paramLabels[field] || field;
  const inputValue = formatInputValue(field, value);

  if (RATIO_FIELDS.has(field)) {
    return `
      <label class="whatif-form-row" for="whatif-${field}-number">
        <span class="whatif-label">${escapeHtml(label)}</span>
        <input
          class="whatif-slider"
          id="whatif-${field}-slider"
          name="${field}"
          type="range"
          min="${limits.min}"
          max="${limits.max}"
          step="${limits.step}"
          value="${escapeHtml(inputValue || limits.min)}"
          data-whatif-field="${field}"
        />
        <div class="whatif-input-wrap">
          <input
            class="whatif-number-input"
            id="whatif-${field}-number"
            name="${field}"
            type="number"
            min="${limits.min}"
            max="${limits.max}"
            step="${limits.step}"
            value="${escapeHtml(inputValue)}"
            data-whatif-field="${field}"
          />
          <span class="whatif-input-unit">比例</span>
        </div>
      </label>`;
  }

  return `
    <label class="whatif-form-row whatif-form-row-single" for="whatif-${field}-number">
      <span class="whatif-label">${escapeHtml(label)}</span>
      <div class="whatif-single-input">
        <input
          class="whatif-number-input"
          id="whatif-${field}-number"
          name="${field}"
          type="number"
          min="${limits.min}"
          max="${limits.max}"
          step="${limits.step}"
          value="${escapeHtml(inputValue)}"
          data-whatif-field="${field}"
        />
      </div>
      <span class="whatif-input-unit">${field === 'monthlyVolume' ? '吨/月' : '元/吨'}</span>
    </label>`;
}

function renderResultCards(result) {
  if (!result) {
    return RESULT_METRICS.map(({ label }) => `
      <div class="whatif-result-card is-placeholder">
        <div class="whatif-result-label">${escapeHtml(label)}</div>
        <div class="whatif-result-value">--</div>
      </div>`).join('');
  }

  return RESULT_METRICS.map(({ key, label, unit }) => `
    <div class="whatif-result-card ${key === 'quarterlySavingWan' || key === 'savingPercent' ? 'is-highlight' : ''}">
      <div class="whatif-result-label">${escapeHtml(label)}</div>
      <div class="whatif-result-value">${escapeHtml(result.metrics[key])}<span>${escapeHtml(unit)}</span></div>
    </div>`).join('');
}

function renderSensitivity(result) {
  if (!result) {
    return '<div class="whatif-empty">运行模拟后展示敏感性区间。</div>';
  }

  return `
    <div class="whatif-section-title">敏感性区间</div>
    <div class="whatif-sensitivity-grid">
      <div class="whatif-sensitivity-item"><span>乐观</span><strong>${escapeHtml(result.sensitivity.bestCaseWan)} 万元</strong></div>
      <div class="whatif-sensitivity-item"><span>基准</span><strong>${escapeHtml(result.sensitivity.baseCaseWan)} 万元</strong></div>
      <div class="whatif-sensitivity-item"><span>保守</span><strong>${escapeHtml(result.sensitivity.worstCaseWan)} 万元</strong></div>
    </div>`;
}

function renderRiskList(result) {
  if (!result) {
    return '<div class="whatif-empty">风险提示将在结果生成后显示。</div>';
  }

  if (!Array.isArray(result.risks) || result.risks.length === 0) {
    return '<div class="whatif-section-title">风险提示</div><div class="whatif-empty">当前未触发新增风险规则。</div>';
  }

  return `
    <div class="whatif-section-title">风险提示</div>
    <ul class="whatif-risk-items">
      ${result.risks.map((risk) => `
        <li class="whatif-risk-item ${STATUS_CLASS_NAMES[risk.level] || ''}">
          <span class="whatif-risk-code">${escapeHtml(risk.code)}</span>
          <span class="whatif-risk-message">${escapeHtml(risk.message)}</span>
        </li>`).join('')}
    </ul>`;
}

function renderValidation(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '<span class="whatif-validation-hint">参数已就绪，可直接运行本地模拟。</span>';
  }

  return errors.map((item) => `<div>${escapeHtml(item.message)}</div>`).join('');
}

function renderExplanation(state) {
  const content = state.explanation || buildFallbackExplanation(null);

  return `
    <div class="whatif-section-title">解释说明</div>
    <div class="whatif-explanation-copy">${formatExplanationHtml(content)}</div>`;
}

function createPanelMarkup(state, scenario) {
  return `
    <div class="whatif-panel" data-whatif-panel>
      <div class="whatif-panel-header">
        <div>
          <div class="whatif-panel-title">${escapeHtml(scenario.title)}</div>
          <div class="whatif-panel-desc">${escapeHtml(scenario.description)}</div>
        </div>
        <div class="whatif-status-chip ${STATUS_CLASS_NAMES[state.status] || STATUS_CLASS_NAMES.idle}">${escapeHtml(STATUS_LABELS[state.status] || STATUS_LABELS.idle)}</div>
      </div>
      <div class="whatif-panel-layout">
        <div class="whatif-config-column">
          <div class="whatif-form" data-whatif-form>
            ${FIELD_ORDER.map((field) => renderParameterRow(field, scenario, state.params[field])).join('')}
          </div>
          <button type="button" class="whatif-run-btn" data-whatif-run ${state.status === 'running' ? 'disabled' : ''}>${state.status === 'running' ? '计算中...' : '运行模拟'}</button>
          <div class="whatif-validation ${state.validationErrors.length > 0 ? 'is-visible' : ''}" data-whatif-validation>
            ${renderValidation(state.validationErrors)}
          </div>
        </div>
        <div class="whatif-result-column">
          <div class="whatif-result-grid" data-whatif-results>
            ${renderResultCards(state.result)}
          </div>
          <div class="whatif-sensitivity" data-whatif-sensitivity>
            ${renderSensitivity(state.result)}
          </div>
          <div class="whatif-risk-list" data-whatif-risks>
            ${renderRiskList(state.result)}
          </div>
          <div class="whatif-explanation" data-whatif-explanation>
            ${renderExplanation(state)}
          </div>
        </div>
      </div>
    </div>`;
}

export function createWhatIfPanelController({
  mountNode,
  baselineSnapshot,
  baselineSnapshotFactory,
  scenarioId = SCENARIO_ID,
  explainer
} = {}) {
  if (!mountNode) {
    throw new Error('mountNode is required');
  }

  const scenario = getScenarioConfig(scenarioId);
  const state = {
    scenarioId,
    status: 'idle',
    params: cloneValue(scenario.defaultParams),
    result: null,
    explanation: buildFallbackExplanation(null),
    validationErrors: []
  };
  const activeExplainer = resolveExplainerHandler(explainer);
  let latestRunToken = 0;

  function resetDerivedState() {
    state.result = null;
    state.explanation = buildFallbackExplanation(null);
  }

  function invalidatePendingRun() {
    latestRunToken += 1;
  }

  function readLiveParamsFromMountNode() {
    if (typeof mountNode.querySelectorAll !== 'function') {
      return cloneValue(state.params);
    }

    const liveParams = {
      ...state.params
    };

    mountNode.querySelectorAll('[data-whatif-field]').forEach((input) => {
      if (!input || typeof input.name !== 'string' || input.name.length === 0) {
        return;
      }

      liveParams[input.name] = input.value;
    });

    return liveParams;
  }

  function syncFieldValuesInDom() {
    if (typeof mountNode.querySelectorAll !== 'function') {
      return false;
    }

    mountNode.querySelectorAll('[data-whatif-field]').forEach((input) => {
      if (!input || typeof input.name !== 'string' || input.name.length === 0) {
        return;
      }

      input.value = formatInputValue(input.name, state.params[input.name]);
    });

    return true;
  }

  function patchRenderedState() {
    if (typeof mountNode.querySelector !== 'function') {
      return false;
    }

    const statusChip = mountNode.querySelector('.whatif-status-chip');
    const runButton = mountNode.querySelector('[data-whatif-run]');
    const validationNode = mountNode.querySelector('[data-whatif-validation]');
    const resultsNode = mountNode.querySelector('[data-whatif-results]');
    const sensitivityNode = mountNode.querySelector('[data-whatif-sensitivity]');
    const risksNode = mountNode.querySelector('[data-whatif-risks]');
    const explanationNode = mountNode.querySelector('[data-whatif-explanation]');

    if (!statusChip || !runButton || !validationNode || !resultsNode || !sensitivityNode || !risksNode || !explanationNode) {
      return false;
    }

    syncFieldValuesInDom();
    statusChip.className = `whatif-status-chip ${STATUS_CLASS_NAMES[state.status] || STATUS_CLASS_NAMES.idle}`;
    statusChip.textContent = STATUS_LABELS[state.status] || STATUS_LABELS.idle;
    runButton.disabled = state.status === 'running';
    runButton.textContent = state.status === 'running' ? '计算中...' : '运行模拟';
    validationNode.className = `whatif-validation ${state.validationErrors.length > 0 ? 'is-visible' : ''}`;
    validationNode.innerHTML = renderValidation(state.validationErrors);
    resultsNode.innerHTML = renderResultCards(state.result);
    sensitivityNode.innerHTML = renderSensitivity(state.result);
    risksNode.innerHTML = renderRiskList(state.result);
    explanationNode.innerHTML = renderExplanation(state);
    return true;
  }

  function render() {
    mountNode.innerHTML = createPanelMarkup(state, scenario);

    if (typeof mountNode.querySelectorAll !== 'function') {
      return;
    }

    mountNode.querySelectorAll('[data-whatif-field]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const { name, value } = event.target;
        invalidatePendingRun();
        state.params[name] = value;
        resetDerivedState();
        state.validationErrors = validatePurchaseRatioParams(state.params);
        state.status = state.validationErrors.length > 0 ? 'error' : 'idle';
        patchRenderedState();
      });
    });

    const runButton = typeof mountNode.querySelector === 'function'
      ? mountNode.querySelector('[data-whatif-run]')
      : null;

    if (runButton) {
      const triggerRunFromDom = () => {
        void runSimulation(readLiveParamsFromMountNode()).catch(() => {});
      };

      runButton.addEventListener('pointerdown', triggerRunFromDom);
      runButton.addEventListener('click', () => {
        triggerRunFromDom();
      });
    }
  }

  async function runSimulation(overrides = {}) {
    const runToken = latestRunToken + 1;
    latestRunToken = runToken;
    state.params = {
      ...state.params,
      ...cloneValue(overrides)
    };
    resetDerivedState();
    state.validationErrors = validatePurchaseRatioParams(state.params);

    if (state.validationErrors.length > 0) {
      state.status = 'error';
      render();
      throw new Error(`参数校验失败: ${state.validationErrors.map((item) => item.field).join(', ')}`);
    }

    state.status = 'running';
    render();

    try {
      const engine = new WhatIfEngine(resolveBaselineSnapshot(baselineSnapshot, baselineSnapshotFactory));
      const calculate = resolveScenarioMethod(engine, scenario);
      const result = calculate(state.params);
      state.result = result;
      render();

      let explanation;

      try {
        explanation = await activeExplainer(result, state);
      } catch {
        explanation = TEMPLATE_EXPLAINER(result);
      }

      if (runToken !== latestRunToken) {
        return result;
      }

      state.explanation = explanation;
      state.validationErrors = [];
      state.status = 'ready';
      render();
      return result;
    } catch (error) {
      state.status = 'error';
      if (state.validationErrors.length === 0) {
        state.validationErrors = validatePurchaseRatioParams(state.params);
      }
      render();
      throw error;
    }
  }

  function getState() {
    return cloneValue(state);
  }

  render();

  return {
    getState,
    render,
    runSimulation
  };
}

export function bootWhatIfPanel({ mountNode, baselineSnapshotFactory, baselineSnapshot, explainer } = {}) {
  if (!mountNode) {
    return null;
  }

  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot,
    baselineSnapshotFactory,
    explainer
  });

  return controller;
}