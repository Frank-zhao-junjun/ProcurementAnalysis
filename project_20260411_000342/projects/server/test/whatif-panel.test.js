import test from 'node:test';
import assert from 'node:assert/strict';
import { bootWhatIfPanel, createWhatIfPanelController } from '../../assets/js/whatif/whatif-panel.js';
import { createTemplateExplainer } from '../../assets/js/whatif/explainers/template-explainer.js';

function createMountNode() {
  return {
    innerHTML: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function syncFieldValuesFromMarkup(markup, fields) {
  const inputPattern = /<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*data-whatif-field="([^"]+)"[^>]*>/g;
  let match;

  while ((match = inputPattern.exec(markup)) !== null) {
    const [, name, value] = match;
    const field = fields.get(name);

    if (field) {
      field.value = value;
    }
  }
}

function createInteractiveMountNode() {
  const listeners = new Map();
  const fields = new Map();
  let innerHTML = '';

  function createElement(name = '') {
    const elementListeners = new Map();

    return {
      name,
      value: '',
      addEventListener(eventName, handler) {
        elementListeners.set(eventName, handler);
      },
      dispatch(eventName) {
        const handler = elementListeners.get(eventName);

        if (!handler) {
          throw new Error(`No listener registered for ${eventName}`);
        }

        return handler({ target: this });
      }
    };
  }

  const runButton = createElement();
  const inputNames = [
    'currentSpotRatio',
    'targetSpotRatio',
    'currentSpotPrice',
    'contractPrice',
    'monthlyVolume'
  ];

  inputNames.forEach((name) => {
    fields.set(name, createElement(name));
  });

  listeners.set('[data-whatif-run]', runButton);

  return {
    get innerHTML() {
      return innerHTML;
    },
    set innerHTML(value) {
      innerHTML = value;
      syncFieldValuesFromMarkup(value, fields);
    },
    fields,
    runButton,
    querySelector(selector) {
      return listeners.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-whatif-field]') {
        return Array.from(fields.values());
      }

      return [];
    }
  };
}

function createRerenderingMountNode() {
  let currentRunButton = null;
  const currentFields = new Map();

  function createElement(name = '') {
    const elementListeners = new Map();
    let active = true;

    return {
      name,
      value: '',
      addEventListener(eventName, handler) {
        elementListeners.set(eventName, handler);
      },
      deactivate() {
        active = false;
      },
      dispatch(eventName) {
        if (!active) {
          return undefined;
        }

        const handler = elementListeners.get(eventName);

        if (!handler) {
          throw new Error(`No listener registered for ${eventName}`);
        }

        return handler({ target: this });
      }
    };
  }

  function refreshInteractiveNodes() {
    if (currentRunButton) {
      currentRunButton.deactivate();
    }

    currentFields.forEach((field) => field.deactivate());
    currentFields.clear();

    ['currentSpotRatio', 'targetSpotRatio', 'currentSpotPrice', 'contractPrice', 'monthlyVolume']
      .forEach((name) => currentFields.set(name, createElement(name)));

    currentRunButton = createElement();
  }

  refreshInteractiveNodes();

  const mountNode = {
    _innerHTML: '',
    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(value) {
      this._innerHTML = value;
      refreshInteractiveNodes();
      syncFieldValuesFromMarkup(value, currentFields);
    },
    get fields() {
      return currentFields;
    },
    get runButton() {
      return currentRunButton;
    },
    querySelector(selector) {
      if (selector === '[data-whatif-run]') {
        return currentRunButton;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-whatif-field]') {
        return Array.from(currentFields.values());
      }

      return [];
    }
  };

  return mountNode;
}

function waitForDeferredRender() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test('panel controller runs a simulation and returns result state with ready status', async () => {
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
  assert.match(controller.getState().explanation, /^1\. 结论/m);
  assert.match(controller.getState().explanation, /^2\. 数据解读/m);
  assert.match(controller.getState().explanation, /^3\. 风险提示/m);
  assert.match(controller.getState().explanation, /^4\. 执行建议/m);
});

test('panel controller rejects invalid params and surfaces error state', async () => {
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

  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.ok(state.validationErrors.length > 0);
  assert.equal(state.validationErrors[0].field, 'targetSpotRatio');
});

test('boot path defers simulation until user run and resolves baseline snapshot at run time', async () => {
  const mountNode = createInteractiveMountNode();
  let activeTab = 'tabHome';
  let factoryCallCount = 0;
  const controller = bootWhatIfPanel({
    mountNode,
    baselineSnapshotFactory() {
      factoryCallCount += 1;
      return {
        activeTab,
        activeModule: activeTab === 'tab2' ? '支出分析' : '驾驶舱'
      };
    }
  });

  assert.ok(controller);
  assert.equal(factoryCallCount, 0);
  assert.equal(controller.getState().status, 'idle');
  assert.equal(controller.getState().result, null);

  activeTab = 'tab2';

  const result = await controller.runSimulation();

  assert.equal(factoryCallCount, 1);
  assert.equal(result.baselineSnapshot.activeTab, 'tab2');
  assert.equal(result.baselineSnapshot.activeModule, '支出分析');
});

test('changing params clears stale result and explanation until the next simulation run', async () => {
  const mountNode = createInteractiveMountNode();
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  await controller.runSimulation({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(controller.getState().status, 'ready');
  assert.ok(controller.getState().result);
  assert.match(controller.getState().explanation, /^1\. 结论/m);

  mountNode.fields.get('targetSpotRatio').value = '0.25';
  mountNode.fields.get('targetSpotRatio').dispatch('change');

  const state = controller.getState();
  assert.equal(state.status, 'idle');
  assert.equal(state.result, null);
  assert.equal(state.explanation, '运行模拟后将在此展示情景解释。');
  assert.deepEqual(state.validationErrors, []);
});

test('failing custom explainer falls back to template output', async () => {
  const templateExplainer = createTemplateExplainer();
  const controller = createWhatIfPanelController({
    mountNode: createMountNode(),
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' },
    explainer: async () => {
      throw new Error('provider unavailable');
    }
  });

  const result = await controller.runSimulation({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  assert.equal(controller.getState().status, 'ready');
  assert.equal(controller.getState().explanation, templateExplainer(result));
});

test('invalid browser-triggered run path stays in error state without uncaught rejection', async () => {
  const mountNode = createInteractiveMountNode();
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  mountNode.fields.get('targetSpotRatio').value = '1.2';
  mountNode.fields.get('targetSpotRatio').dispatch('change');

  let unhandledError = null;
  const onUnhandledRejection = (error) => {
    unhandledError = error;
  };

  process.once('unhandledRejection', onUnhandledRejection);
  const clickResult = mountNode.runButton.dispatch('click');
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener('unhandledRejection', onUnhandledRejection);

  assert.equal(clickResult, undefined);
  assert.equal(unhandledError, null);
  assert.equal(controller.getState().status, 'error');
  assert.equal(controller.getState().result, null);
  assert.ok(controller.getState().validationErrors.length > 0);
});

test('delayed explainer keeps results visible immediately and ignores stale completion after params change', async () => {
  const mountNode = createInteractiveMountNode();
  let resolveExplanation;
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' },
    explainer: () => new Promise((resolve) => {
      resolveExplanation = resolve;
    })
  });

  const runPromise = controller.runSimulation({
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  });

  await new Promise((resolve) => setImmediate(resolve));

  const pendingState = controller.getState();
  assert.equal(pendingState.result?.metrics.quarterlySavingWan, 360);
  assert.equal(pendingState.status, 'running');
  assert.equal(pendingState.explanation, '运行模拟后将在此展示情景解释。');
  assert.match(mountNode.innerHTML, /360<span>万元<\/span>/);

  mountNode.fields.get('targetSpotRatio').value = '0.25';
  mountNode.fields.get('targetSpotRatio').dispatch('change');

  resolveExplanation('stale explanation should not win');
  await runPromise;

  const state = controller.getState();
  assert.equal(state.result, null);
  assert.equal(state.explanation, '运行模拟后将在此展示情景解释。');
  assert.equal(state.status, 'idle');
  assert.doesNotMatch(mountNode.innerHTML, /stale explanation should not win/);
});

test('changing a field and immediately clicking run still executes the simulation', async () => {
  const mountNode = createRerenderingMountNode();
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  const staleRunButton = mountNode.runButton;
  mountNode.fields.get('targetSpotRatio').value = '0.2';
  mountNode.fields.get('targetSpotRatio').dispatch('change');
  staleRunButton.dispatch('click');

  await new Promise((resolve) => setTimeout(resolve, 10));

  const state = controller.getState();
  assert.equal(state.status, 'ready');
  assert.equal(state.params.targetSpotRatio, '0.2');
  assert.equal(state.result?.metrics.quarterlySavingWan, 480);
});

test('pointer activation runs the latest DOM value before blur rerender can replace the button', async () => {
  const mountNode = createRerenderingMountNode();
  const controller = createWhatIfPanelController({
    mountNode,
    baselineSnapshot: { activeTab: 'tab2', activeModule: '支出分析' }
  });

  mountNode.fields.get('targetSpotRatio').value = '0.2';
  mountNode.runButton.dispatch('pointerdown');

  await waitForDeferredRender();
  await waitForDeferredRender();

  const state = controller.getState();
  assert.equal(state.status, 'ready');
  assert.equal(state.params.targetSpotRatio, '0.2');
  assert.equal(state.result?.metrics.quarterlySavingWan, 480);
  assert.match(state.explanation, /^1\. 结论/m);
});