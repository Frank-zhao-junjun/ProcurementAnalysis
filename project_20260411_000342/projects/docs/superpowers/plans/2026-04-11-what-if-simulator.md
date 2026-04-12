# What-if Simulator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a What-if simulator MVP inside Tab 2 that supports the purchase-ratio scenario with local calculation, structured results, template-based explanation, and test coverage.

**Architecture:** Keep the UI embedded in the existing native dashboard page, but move all What-if logic into focused ES modules under `assets/js/whatif`. Use a strict result contract, local calculation first, and a pluggable explanation layer that defaults to a local template explainer while reserving an AI adapter interface.

**Tech Stack:** Native HTML/CSS/JavaScript ES Modules, existing dashboard `index.html`, existing `styles/main.css`, Node.js built-in test runner via `project_20260411_000342/projects/server/package.json`

---

## File Map

### New files

- Create: `project_20260411_000342/projects/assets/js/whatif/formatter.js`
  Responsibility: currency, percentage, ratio, and sensitivity formatting helpers
- Create: `project_20260411_000342/projects/assets/js/whatif/risk-rules.js`
  Responsibility: structured risk evaluation for the purchase-ratio scenario
- Create: `project_20260411_000342/projects/assets/js/whatif/scenario-registry.js`
  Responsibility: scenario metadata, defaults, limits, labels, and engine routing
- Create: `project_20260411_000342/projects/assets/js/whatif/simulation-engine.js`
  Responsibility: pure What-if calculations returning the standard result contract
- Create: `project_20260411_000342/projects/assets/js/whatif/explainers/template-explainer.js`
  Responsibility: deterministic four-section explanation from a `SimulationResult`
- Create: `project_20260411_000342/projects/assets/js/whatif/explainers/ai-explainer.js`
  Responsibility: provider-agnostic explanation interface for future Coze integration
- Create: `project_20260411_000342/projects/assets/js/whatif/whatif-panel.js`
  Responsibility: panel state, parameter syncing, validation, rendering, and orchestration
- Create: `project_20260411_000342/projects/server/test/whatif-foundation.test.js`
  Responsibility: tests for formatter, registry, and risk-rule primitives
- Create: `project_20260411_000342/projects/server/test/whatif-simulation.test.js`
  Responsibility: tests for the purchase-ratio calculation contract and edge cases
- Create: `project_20260411_000342/projects/server/test/whatif-panel.test.js`
  Responsibility: tests for orchestration, validation behavior, and template fallback

### Modified files

- Modify: `project_20260411_000342/projects/index.html`
  Responsibility: import What-if modules, add Tab 2 What-if card markup, and boot the panel
- Modify: `project_20260411_000342/projects/styles/main.css`
  Responsibility: isolated What-if panel styles that do not pollute the dashboard card system

---

## Task 1: Foundation Modules

**Files:**
- Create: `project_20260411_000342/projects/assets/js/whatif/formatter.js`
- Create: `project_20260411_000342/projects/assets/js/whatif/risk-rules.js`
- Create: `project_20260411_000342/projects/assets/js/whatif/scenario-registry.js`
- Test: `project_20260411_000342/projects/server/test/whatif-foundation.test.js`

- [ ] **Step 1: Write the failing foundation test**

```javascript
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
import { SCENARIO_REGISTRY, getScenarioConfig } from '../../assets/js/whatif/scenario-registry.js';

test('scenario registry exposes purchase_ratio defaults and limits', () => {
  const config = getScenarioConfig('purchase_ratio');

  assert.equal(config.id, 'purchase_ratio');
  assert.equal(config.defaultParams.currentSpotRatio, 0.6);
  assert.equal(config.defaultParams.targetSpotRatio, 0.3);
  assert.equal(config.limits.targetSpotRatio.step, 0.05);
  assert.equal(SCENARIO_REGISTRY.purchase_ratio.title, '采购比例调整');
});

test('formatter outputs 万元 and percentage values consistently', () => {
  assert.equal(formatWan(31200000), 3120);
  assert.equal(formatPercent(3.76), 3.8);
  assert.equal(clampRatio(1.4), 1);
  assert.deepEqual(buildSensitivityRange(360), {
    bestCaseWan: 414,
    baseCaseWan: 360,
    worstCaseWan: 306
  });
});

test('risk rules validate params and emit structured warnings', () => {
  const params = {
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.15,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  };

  assert.deepEqual(validatePurchaseRatioParams(params), []);
  assert.deepEqual(evaluatePurchaseRatioRisks({ params }).map((item) => item.code), [
    'LOW_SPOT_RATIO',
    'SPOT_PRICE_PREMIUM'
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-foundation.test.js
```

Expected: FAIL with module resolution or missing export errors for the new What-if files.

- [ ] **Step 3: Implement `formatter.js`**

```javascript
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
```

- [ ] **Step 4: Implement `risk-rules.js`**

```javascript
import { clampRatio } from './formatter.js';

export function validatePurchaseRatioParams(params) {
  const errors = [];
  const ratioFields = ['currentSpotRatio', 'targetSpotRatio'];
  const positiveFields = ['currentSpotPrice', 'contractPrice', 'monthlyVolume'];

  ratioFields.forEach((field) => {
    const value = Number(params[field]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      errors.push({ field, message: `${field} 必须在 0 到 1 之间` });
    }
  });

  positiveFields.forEach((field) => {
    const value = Number(params[field]);
    if (!Number.isFinite(value) || value < 0) {
      errors.push({ field, message: `${field} 必须大于等于 0` });
    }
  });

  if (Number(params.monthlyVolume) === 0) {
    errors.push({ field: 'monthlyVolume', message: 'monthlyVolume 必须大于 0' });
  }

  return errors;
}

export function evaluatePurchaseRatioRisks({ params }) {
  const currentSpotRatio = clampRatio(params.currentSpotRatio);
  const targetSpotRatio = clampRatio(params.targetSpotRatio);
  const currentSpotPrice = Number(params.currentSpotPrice) || 0;
  const contractPrice = Number(params.contractPrice) || 0;
  const risks = [];

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

  if (Math.abs(targetSpotRatio - currentSpotRatio) >= 0.4) {
    risks.push({
      code: 'LARGE_RATIO_SHIFT',
      level: 'medium',
      message: '本次比例调整幅度较大，建议结合供应保障评估后执行'
    });
  }

  return risks;
}
```

- [ ] **Step 5: Implement `scenario-registry.js`**

```javascript
export const SCENARIO_REGISTRY = {
  purchase_ratio: {
    id: 'purchase_ratio',
    title: '采购比例调整',
    description: '模拟调整现货与长约采购比例后的季度成本变化',
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
```

- [ ] **Step 6: Run the foundation test to verify it passes**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-foundation.test.js
```

Expected: PASS with 3 passing subtests.

- [ ] **Step 7: Commit the foundation layer**

```powershell
git -C "d:\AI\采购分析驾驶舱" add "project_20260411_000342/projects/assets/js/whatif/formatter.js" "project_20260411_000342/projects/assets/js/whatif/risk-rules.js" "project_20260411_000342/projects/assets/js/whatif/scenario-registry.js" "project_20260411_000342/projects/server/test/whatif-foundation.test.js"
git -C "d:\AI\采购分析驾驶舱" commit -m "feat(whatif): add foundation modules"
```

---

## Task 2: Simulation Engine and Calculation Tests

**Files:**
- Create: `project_20260411_000342/projects/assets/js/whatif/simulation-engine.js`
- Create: `project_20260411_000342/projects/server/test/whatif-simulation.test.js`

- [ ] **Step 1: Write the failing simulation tests**

```javascript
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
  assert.equal(result.metrics.currentMonthlyCostWan, 4960);
  assert.equal(result.metrics.targetMonthlyCostWan, 4840);
  assert.equal(result.metrics.monthlySavingWan, 120);
  assert.equal(result.metrics.quarterlySavingWan, 360);
  assert.equal(result.metrics.savingPercent, 2.4);
  assert.equal(result.sensitivity.baseCaseWan, 360);
  assert.equal(result.version, 'v1');
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
```

- [ ] **Step 2: Run the simulation tests to verify they fail**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-simulation.test.js
```

Expected: FAIL because `simulation-engine.js` and `WhatIfEngine` do not exist yet.

- [ ] **Step 3: Implement `simulation-engine.js`**

```javascript
import { formatWan, formatPercent, buildSensitivityRange } from './formatter.js';
import { validatePurchaseRatioParams, evaluatePurchaseRatioRisks } from './risk-rules.js';

export class WhatIfEngine {
  constructor(baselineSnapshot = {}) {
    this.baselineSnapshot = baselineSnapshot;
  }

  calculatePurchaseRatioChange(params) {
    const errors = validatePurchaseRatioParams(params);
    if (errors.length > 0) {
      throw new Error(`参数校验失败: ${errors.map((item) => item.field).join(', ')}`);
    }

    const currentMonthlyCost =
      (params.monthlyVolume * params.currentSpotRatio * params.currentSpotPrice) +
      (params.monthlyVolume * (1 - params.currentSpotRatio) * params.contractPrice);

    const targetMonthlyCost =
      (params.monthlyVolume * params.targetSpotRatio * params.currentSpotPrice) +
      (params.monthlyVolume * (1 - params.targetSpotRatio) * params.contractPrice);

    const monthlySavingYuan = currentMonthlyCost - targetMonthlyCost;
    const quarterlySavingWan = formatWan(monthlySavingYuan * 3);

    return {
      scenarioId: 'purchase_ratio',
      scenarioName: '采购比例调整',
      inputs: { ...params },
      metrics: {
        currentMonthlyCostWan: formatWan(currentMonthlyCost),
        targetMonthlyCostWan: formatWan(targetMonthlyCost),
        monthlySavingWan: formatWan(monthlySavingYuan),
        quarterlySavingWan,
        savingPercent: formatPercent((monthlySavingYuan / currentMonthlyCost) * 100)
      },
      sensitivity: buildSensitivityRange(quarterlySavingWan),
      risks: evaluatePurchaseRatioRisks({ params }),
      assumptions: [
        '月用量按当前预测不变',
        '长约价在季度内保持稳定'
      ],
      generatedAt: new Date().toISOString(),
      version: 'v1',
      baselineSnapshot: { ...this.baselineSnapshot }
    };
  }
}
```

- [ ] **Step 4: Run the simulation tests to verify they pass**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-simulation.test.js
```

Expected: PASS with 4 passing subtests.

- [ ] **Step 5: Run both What-if test files together**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-foundation.test.js d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-simulation.test.js
```

Expected: PASS for all What-if foundation and engine tests.

- [ ] **Step 6: Commit the engine layer**

```powershell
git -C "d:\AI\采购分析驾驶舱" add "project_20260411_000342/projects/assets/js/whatif/simulation-engine.js" "project_20260411_000342/projects/server/test/whatif-simulation.test.js"
git -C "d:\AI\采购分析驾驶舱" commit -m "feat(whatif): add purchase ratio engine"
```

---

## Task 3: UI Card, Panel Orchestration, and Integration

**Files:**
- Create: `project_20260411_000342/projects/assets/js/whatif/whatif-panel.js`
- Modify: `project_20260411_000342/projects/index.html`
- Modify: `project_20260411_000342/projects/styles/main.css`
- Create: `project_20260411_000342/projects/server/test/whatif-panel.test.js`

- [ ] **Step 1: Write the failing panel orchestration test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWhatIfPanelController } from '../../assets/js/whatif/whatif-panel.js';

function createMountNode() {
  return {
    innerHTML: '',
    querySelector() {
      return null;
    }
  };
}

test('panel controller runs a simulation and returns rendered result state', async () => {
  const mountNode = createMountNode();
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  const result = await controller.runSimulation({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(result.scenarioId, 'purchase_ratio');
  assert.equal(controller.getState().status, 'ready');
  assert.equal(controller.getState().result.metrics.quarterlySavingWan, 360);
});

test('panel controller surfaces validation errors without calling the explainer', async () => {
  const controller = createWhatIfPanelController({
    mountNode: createMountNode(),
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  await assert.rejects(() => controller.runSimulation({
    currentSpotRatio: 0.6,
    targetSpotRatio: 1.2,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  }), /参数校验失败/);
});
```

- [ ] **Step 2: Run the panel test to verify it fails**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-panel.test.js
```

Expected: FAIL because `whatif-panel.js` does not exist yet.

- [ ] **Step 3: Add the What-if card markup to `index.html` Tab 2**

Insert this block before `</section><!-- END tab2 -->`:

```html
    <div class="section-block mt-16">
      <div class="section-title">What-if 模拟引擎 <span class="subtitle">采购比例调整场景 MVP</span></div>
      <div class="card-panel whatif-panel-card" id="whatifPanelRoot">
        <div class="whatif-panel-layout">
          <div class="whatif-config-column">
            <div class="whatif-panel-intro">
              <div class="whatif-panel-title">采购比例调整</div>
              <div class="whatif-panel-desc">调节现货与长约采购比例，快速评估季度成本变化与执行风险。</div>
            </div>
            <div class="whatif-form" id="whatifForm"></div>
            <button type="button" class="btn-primary whatif-run-btn" id="whatifRunButton">运行模拟</button>
            <div class="whatif-validation" id="whatifValidation"></div>
          </div>
          <div class="whatif-result-column">
            <div class="whatif-result-grid" id="whatifResultCards"></div>
            <div class="whatif-sensitivity" id="whatifSensitivity"></div>
            <div class="whatif-risk-list" id="whatifRiskList"></div>
            <div class="whatif-explanation" id="whatifExplanation"></div>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 4: Import and boot the panel in the module script of `index.html`**

Add this import near the existing AI imports:

```javascript
import { bootWhatIfPanel } from './assets/js/whatif/whatif-panel.js';
```

Then after `let assistantShell = null;` add:

```javascript
  let whatIfPanel = null;
```

And after the dashboard state bus and context bridge are initialized, add:

```javascript
  function getWhatIfBaselineSnapshot() {
    return dashboardStateBus.getSnapshot().ui;
  }
```

Finally, after the page initialization code finishes binding the dashboard widgets, add:

```javascript
  const whatIfRoot = document.getElementById('whatifPanelRoot');
  if (whatIfRoot) {
    whatIfPanel = bootWhatIfPanel({
      mountNode: whatIfRoot,
      baselineSnapshotFactory: getWhatIfBaselineSnapshot
    });
  }
```

- [ ] **Step 5: Add What-if styles to `styles/main.css`**

Append this block:

```css
.whatif-panel-card {
  padding: 18px;
}

.whatif-panel-layout {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(420px, 1.05fr);
  gap: 18px;
}

.whatif-config-column,
.whatif-result-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.whatif-form-row {
  display: grid;
  grid-template-columns: 140px 1fr 96px;
  gap: 10px;
  align-items: center;
}

.whatif-slider {
  width: 100%;
}

.whatif-number-input {
  width: 100%;
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.06);
  padding: 8px 10px;
  color: #e2e8f0;
}

.whatif-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.whatif-result-card,
.whatif-sensitivity,
.whatif-risk-list,
.whatif-explanation {
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.04);
  padding: 12px;
}

.whatif-validation {
  color: #f87171;
  font-size: 12px;
  min-height: 18px;
}
```

- [ ] **Step 6: Implement `whatif-panel.js`**

```javascript
import { getScenarioConfig } from './scenario-registry.js';
import { WhatIfEngine } from './simulation-engine.js';
import { createTemplateExplainer } from './explainers/template-explainer.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createWhatIfPanelController({
  mountNode,
  baselineSnapshot,
  explainer = createTemplateExplainer()
}) {
  const scenario = getScenarioConfig('purchase_ratio');
  const state = {
    status: 'idle',
    params: clone(scenario.defaultParams),
    result: null,
    explanation: '',
    validationErrors: []
  };

  async function runSimulation(overrides = state.params) {
    state.status = 'running';
    state.params = clone(overrides);
    const engine = new WhatIfEngine(clone(baselineSnapshot));
    const result = engine.calculatePurchaseRatioChange(state.params);
    state.result = result;
    state.explanation = await explainer.explain(result);
    state.status = 'ready';
    return result;
  }

  function getState() {
    return clone(state);
  }

  return {
    runSimulation,
    getState,
    mountNode
  };
}

export function bootWhatIfPanel({ mountNode, baselineSnapshotFactory }) {
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: baselineSnapshotFactory()
  });
  return controller;
}
```

- [ ] **Step 7: Run the panel test to verify it passes**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-panel.test.js
```

Expected: PASS with 2 passing subtests.

- [ ] **Step 8: Run all What-if tests together**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-foundation.test.js d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-simulation.test.js d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-panel.test.js
```

Expected: PASS for all What-if tests.

- [ ] **Step 9: Commit the UI integration layer**

```powershell
git -C "d:\AI\采购分析驾驶舱" add "project_20260411_000342/projects/index.html" "project_20260411_000342/projects/styles/main.css" "project_20260411_000342/projects/assets/js/whatif/whatif-panel.js" "project_20260411_000342/projects/server/test/whatif-panel.test.js"
git -C "d:\AI\采购分析驾驶舱" commit -m "feat(whatif): add tab2 simulator panel"
```

---

## Task 4: Template Explainer, AI Adapter Stub, and Final Verification

**Files:**
- Create: `project_20260411_000342/projects/assets/js/whatif/explainers/template-explainer.js`
- Create: `project_20260411_000342/projects/assets/js/whatif/explainers/ai-explainer.js`
- Modify: `project_20260411_000342/projects/assets/js/whatif/whatif-panel.js`
- Modify: `project_20260411_000342/projects/server/test/whatif-panel.test.js`

- [ ] **Step 1: Extend the failing panel test to require template fallback behavior**

Append this test:

```javascript
test('panel controller falls back to template explanation sections', async () => {
  const controller = createWhatIfPanelController({
    mountNode: createMountNode(),
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  await controller.runSimulation({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  const explanation = controller.getState().explanation;
  assert.match(explanation, /1\. 结论/);
  assert.match(explanation, /2\. 数据解读/);
  assert.match(explanation, /3\. 风险提示/);
  assert.match(explanation, /4\. 执行建议/);
});
```

- [ ] **Step 2: Run the panel test to verify it fails**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-panel.test.js
```

Expected: FAIL because the current controller does not generate the required four-section explanation.

- [ ] **Step 3: Implement `template-explainer.js`**

```javascript
export function createTemplateExplainer() {
  return {
    async explain(result) {
      const { metrics, risks } = result;
      const riskText = risks.length > 0
        ? risks.map((item, index) => `${index + 1}. ${item.message}`).join('\n')
        : '1. 当前未触发新增执行风险，可按基准方案推进。';

      return [
        `1. 结论\n预计季度累计节约 ${metrics.quarterlySavingWan} 万元，当前方案具备执行价值。`,
        `2. 数据解读\n月度成本将从 ${metrics.currentMonthlyCostWan} 万元调整至 ${metrics.targetMonthlyCostWan} 万元，单月影响 ${metrics.monthlySavingWan} 万元，节约幅度 ${metrics.savingPercent}%。`,
        `3. 风险提示\n${riskText}`,
        '4. 执行建议\n建议先在钢材高偏差品类试运行新比例，并同步核对供应灵活性与长约覆盖能力。'
      ].join('\n\n');
    }
  };
}
```

- [ ] **Step 4: Implement `ai-explainer.js`**

```javascript
export class WhatIfAIExplainer {
  constructor(provider) {
    this.provider = provider;
  }

  async explain(result) {
    if (!this.provider || typeof this.provider.generateExplanation !== 'function') {
      throw new Error('AI provider is not configured');
    }

    return this.provider.generateExplanation(result);
  }
}
```

- [ ] **Step 5: Update `whatif-panel.js` to use the template explainer by default and preserve fallback**

Replace the controller creation logic with:

```javascript
export function createWhatIfPanelController({
  mountNode,
  baselineSnapshot,
  explainer = createTemplateExplainer()
}) {
  const scenario = getScenarioConfig('purchase_ratio');
  const state = {
    status: 'idle',
    params: clone(scenario.defaultParams),
    result: null,
    explanation: '',
    validationErrors: []
  };

  async function runSimulation(overrides = state.params) {
    state.status = 'running';
    state.params = clone(overrides);
    const engine = new WhatIfEngine(clone(baselineSnapshot));

    try {
      const result = engine.calculatePurchaseRatioChange(state.params);
      state.result = result;
      try {
        state.explanation = await explainer.explain(result);
      } catch {
        state.explanation = await createTemplateExplainer().explain(result);
      }
      state.status = 'ready';
      return result;
    } catch (error) {
      state.status = 'error';
      throw error;
    }
  }

  function getState() {
    return clone(state);
  }

  return {
    runSimulation,
    getState,
    mountNode
  };
}
```

- [ ] **Step 6: Run the panel test to verify it passes**

Run:

```powershell
node --test d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server\test\whatif-panel.test.js
```

Expected: PASS with all panel orchestration and explanation tests passing.

- [ ] **Step 7: Run the full server test suite to guard against regressions**

Run:

```powershell
npm --prefix d:\AI\采购分析驾驶舱\project_20260411_000342\projects\server test
```

Expected: PASS for the existing AI proxy tests plus the new What-if tests.

- [ ] **Step 8: Manually verify the dashboard in the browser**

Run:

```powershell
python -m http.server 5000 --directory d:\AI\采购分析驾驶舱\project_20260411_000342\projects
```

Manual checks:

- Open `http://localhost:5000`
- Switch to `Tab 2 支出分析`
- Confirm the What-if card appears below existing 支出分析 blocks
- Adjust both ratio sliders and numeric inputs
- Click `运行模拟`
- Confirm result cards update immediately
- Confirm explanation renders four numbered sections
- Enter an invalid numeric value and confirm validation prevents execution

- [ ] **Step 9: Commit the explanation layer and final polish**

```powershell
git -C "d:\AI\采购分析驾驶舱" add "project_20260411_000342/projects/assets/js/whatif/explainers/template-explainer.js" "project_20260411_000342/projects/assets/js/whatif/explainers/ai-explainer.js" "project_20260411_000342/projects/assets/js/whatif/whatif-panel.js" "project_20260411_000342/projects/server/test/whatif-panel.test.js"
git -C "d:\AI\采购分析驾驶舱" commit -m "feat(whatif): add template explanations"
```

---

## Spec Coverage Check

- `Tab 2` 落点: Covered by Task 3 markup and bootstrapping steps.
- 单场景 `采购比例调整`: Covered by Task 1 registry and Task 2 engine.
- `滑块 + 数字输入框`: Covered by Task 3 card markup, styles, and panel orchestration.
- 本地计算: Covered by Task 2 engine and Task 2 tests.
- 风险规则与参数校验: Covered by Task 1 rules and Task 3 validation behavior.
- 模板解释优先、AI Provider 预留: Covered by Task 4 template explainer and AI adapter stub.
- 结果契约统一: Covered by Task 2 engine test assertions.

## Self-Review Notes

- No placeholders remain.
- All file paths are concrete and match the current project structure.
- Method names are consistent across registry, engine, tests, and panel controller.
- The implementation order follows the approved spec and user-requested sequence: foundation, engine, UI, explanation.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-11-what-if-simulator.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?