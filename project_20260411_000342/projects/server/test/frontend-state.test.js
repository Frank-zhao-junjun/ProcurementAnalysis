import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createDashboardStateBus,
  createInitialDashboardState
} from '../../assets/js/ai/state-bus.js';
import { createContextBridge, buildRuntimeContext } from '../../assets/js/ai/context-bridge.js';
import { createAssistantShell, createProxyMessageSender } from '../../assets/js/ai/assistant-shell.js';
import { createAiPrivacyGate } from '../../assets/js/ai/privacy-gate.js';

const projectRoot = path.resolve(import.meta.dirname, '../..');

function createClassListDouble() {
  const classNames = new Set();

  return {
    toggle(className, force) {
      if (force) {
        classNames.add(className);
        return;
      }

      classNames.delete(className);
    },
    contains(className) {
      return classNames.has(className);
    }
  };
}

function createAssistantDomMount() {
  const refs = {
    '#ai-assistant-wrapper': {},
    '#ai-panel': {
      style: { display: 'none' },
      classList: createClassListDouble()
    },
    '#ai-messages': {
      innerHTML: '',
      scrollTop: 0,
      scrollHeight: 160
    },
    '#ai-input': {
      focusCount: 0,
      focus() {
        this.focusCount += 1;
      }
    },
    '#ai-context-hint': {
      textContent: ''
    },
    '#ai-suggestions': {
      innerHTML: ''
    }
  };

  return {
    refs,
    appendChild() {},
    querySelector(selector) {
      return refs[selector] || null;
    }
  };
}

test('dashboard state bus updates snapshots and notifies subscribers with cloned state', () => {
  const stateBus = createDashboardStateBus({
    initialState: createInitialDashboardState({
      session: { userRole: 'procurement_manager', dateRange: '2026-W15' }
    })
  });
  const seen = [];

  const unsubscribe = stateBus.subscribe((snapshot) => {
    seen.push(snapshot);
  });

  stateBus.update({
    ui: {
      activeTab: 'tab2',
      activeModule: '支出分析',
      activeFilters: { category: '钢材' }
    }
  });

  const snapshot = stateBus.getSnapshot();
  snapshot.ui.activeFilters.category = '塑料粒子';
  unsubscribe();

  assert.equal(seen.length, 1);
  assert.equal(seen[0].ui.activeTab, 'tab2');
  assert.equal(seen[0].ui.activeModule, '支出分析');
  assert.equal(stateBus.getSnapshot().ui.activeFilters.category, '钢材');
});

test('dashboard state bus isolates subscriber mutations from later listeners', () => {
  const stateBus = createDashboardStateBus();
  const seen = [];

  stateBus.subscribe((snapshot) => {
    snapshot.ui.activeModule = 'mutated';
    seen.push(snapshot.ui.activeModule);
  });
  stateBus.subscribe((snapshot) => {
    seen.push(snapshot.ui.activeModule);
  });

  stateBus.update({ ui: { activeModule: '支出分析' } });

  assert.deepEqual(seen, ['mutated', '支出分析']);
});

test('context bridge syncs tab, dimension, and chart selection into runtime context', () => {
  const stateBus = createDashboardStateBus();
  const contextBridge = createContextBridge({
    stateBus,
    resolveModuleName: (tabId) => ({ tab2: '支出分析' }[tabId] || '首页驾驶舱'),
    getChartDimension: (chartId) => ({ chartPriceDeviation: '按品类' }[chartId] || '集团')
  });

  contextBridge.syncTab('tab2');
  contextBridge.syncDimension({ chartId: 'chartPriceDeviation', dimName: '按品类' });
  contextBridge.syncChartSelection({
    chartId: 'chartPriceDeviation',
    params: {
      name: '钢材',
      seriesName: '偏离度',
      value: 5.8
    }
  });

  const runtimeContext = contextBridge.getRuntimeContext();

  assert.equal(runtimeContext.activeTab, 'tab2');
  assert.equal(runtimeContext.activeModule, '支出分析');
  assert.equal(runtimeContext.selectedDimension, '按品类');
  assert.equal(runtimeContext.highlightedChart, 'chartPriceDeviation');
  assert.deepEqual(runtimeContext.selectedEntity, {
    type: 'chart',
    id: 'chartPriceDeviation',
    name: '钢材',
    seriesName: '偏离度',
    value: 5.8,
    dimension: '按品类'
  });
});

test('context bridge can track KPI focus without clearing active tab context', () => {
  const stateBus = createDashboardStateBus();
  const contextBridge = createContextBridge({
    stateBus,
    resolveModuleName: (tabId) => ({ tabHome: '首页驾驶舱' }[tabId] || '首页驾驶舱')
  });

  contextBridge.syncTab('tabHome');
  contextBridge.syncChartSelection({
    chartId: 'chartPriceDeviation',
    params: { name: '钢材', value: 5.8 }
  });
  contextBridge.syncKpiSelection({ label: '年度采购额', value: '48.67亿' });

  const runtimeContext = contextBridge.getRuntimeContext();

  assert.equal(runtimeContext.activeTab, 'tabHome');
  assert.equal(runtimeContext.activeModule, '首页驾驶舱');
  assert.equal(runtimeContext.highlightedChart, null);
  assert.deepEqual(runtimeContext.selectedEntity, {
    type: 'kpi',
    id: '年度采购额',
    name: '年度采购额',
    value: '48.67亿'
  });
});

test('index.html no longer contains the inline demo AI engine symbols', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

  assert.equal(/getAIReply|_aiState|createAIAssistant/.test(html), false);
});

test('index.html declares COLORS before DIM_DATA in the module script', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

  assert.ok(html.indexOf('const COLORS = {') < html.indexOf('const DIM_DATA = {'));
});

test('assistant shell renders degraded responses and reads runtime context from the state bus', () => {
  const stateBus = createDashboardStateBus({
    initialState: createInitialDashboardState({
      ui: {
        activeTab: 'tab7',
        activeModule: '供应源分析'
      }
    })
  });
  const sentPayloads = [];
  const root = {
    innerHTML: '',
    querySelector() {
      return null;
    }
  };

  const shell = createAssistantShell({
    stateBus,
    mountNode: root,
    onSendMessage: async ({ message, runtimeContext }) => {
      sentPayloads.push({ message, runtimeContext });
      return {
        degraded: true,
        reply: {
          content: '降级处理中',
          metadata: {
            degraded: true
          }
        }
      };
    }
  });

  return shell.sendMessage('现在风险最大的供应商是谁？').then(() => {
    assert.equal(sentPayloads.length, 1);
    assert.equal(sentPayloads[0].runtimeContext.activeModule, '供应源分析');
    assert.match(root.innerHTML, /降级处理中/);
  });
});

test('assistant shell offers context-aware prompts for selected KPI and chart points', () => {
  const stateBus = createDashboardStateBus({
    initialState: createInitialDashboardState({
      ui: {
        activeTab: 'tab2',
        activeModule: '支出分析'
      }
    })
  });
  const contextBridge = createContextBridge({
    stateBus,
    resolveModuleName: (tabId) => ({ tab2: '支出分析' }[tabId] || '首页驾驶舱'),
    getChartDimension: (chartId) => ({ chartPriceDeviation: '按品类' }[chartId] || '集团')
  });
  const shell = createAssistantShell({
    stateBus,
    mountNode: {
      innerHTML: '',
      querySelector() {
        return null;
      }
    }
  });

  assert.equal(shell.getState().suggestions[0], '本周最差 3 项指标');
  assert.match(shell.getState().contextHint, /支出分析/);

  contextBridge.syncKpiSelection({ label: '预算执行率', value: '93.6%' });

  assert.match(shell.getState().suggestions[0], /预算执行率/);
  assert.match(shell.getState().contextHint, /预算执行率/);

  contextBridge.syncChartSelection({
    chartId: 'chartPriceDeviation',
    params: {
      name: '钢材',
      seriesName: '偏离度',
      value: 5.8
    }
  });

  assert.match(shell.getState().suggestions[0], /钢材/);
  assert.match(shell.getState().contextHint, /钢材/);
  assert.match(shell.getState().contextHint, /偏离度/);
});

test('privacy gate persists acceptance and clears it on deny', () => {
  const storage = new Map();
  const privacyGate = createAiPrivacyGate({
    storage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
      removeItem(key) {
        storage.delete(key);
      }
    }
  });

  assert.equal(privacyGate.hasConsent(), false);
  privacyGate.grantConsent({ remember: true });
  assert.equal(privacyGate.hasConsent(), true);
  assert.equal(storage.get('aiPrivacyAccepted'), 'true');

  privacyGate.denyConsent();
  assert.equal(privacyGate.hasConsent(), false);
  assert.equal(storage.has('aiPrivacyAccepted'), false);
});

test('assistant shell open respects the privacy gate before showing the panel', async () => {
  const stateBus = createDashboardStateBus();
  let allowed = false;
  const shell = createAssistantShell({
    stateBus,
    mountNode: { innerHTML: '' },
    privacyGate: {
      hasConsent: () => allowed,
      requestConsent: async () => allowed
    }
  });

  assert.equal(await shell.open(), false);
  assert.equal(shell.getState().open, false);

  allowed = true;
  assert.equal(await shell.open(), true);
  assert.equal(shell.getState().open, true);
});

test('assistant shell open renders a visible panel for DOM mounts', async () => {
  const stateBus = createDashboardStateBus({
    initialState: createInitialDashboardState({
      ui: {
        activeTab: 'tab2',
        activeModule: '支出分析'
      }
    })
  });
  const mountNode = createAssistantDomMount();
  const shell = createAssistantShell({
    stateBus,
    mountNode
  });

  assert.equal(await shell.open(), true);
  assert.equal(shell.getState().open, true);
  assert.equal(mountNode.refs['#ai-panel'].style.display, 'flex');
  assert.equal(mountNode.refs['#ai-panel'].classList.contains('show'), true);
  assert.match(mountNode.refs['#ai-context-hint'].textContent, /支出分析/);
  assert.match(mountNode.refs['#ai-messages'].innerHTML, /采购智能助手/);
  assert.match(mountNode.refs['#ai-suggestions'].innerHTML, /本周最差 3 项指标/);
  assert.equal(mountNode.refs['#ai-input'].focusCount, 1);

  shell.close();
  assert.equal(mountNode.refs['#ai-panel'].style.display, 'none');
  assert.equal(mountNode.refs['#ai-panel'].classList.contains('show'), false);
});

test('proxy message sender posts auth header and runtime context to ai-proxy', async () => {
  const requests = [];
  const sendMessage = createProxyMessageSender({
    endpoint: '/api/ai-proxy/chat',
    getAuthToken: () => 'jwt-token',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return { reply: { content: 'ok' } };
        }
      };
    }
  });

  const runtimeContext = {
    activeTab: 'tab1',
    activeModule: '降本分析'
  };

  await sendMessage({ message: '本月降本达成率是多少？', runtimeContext });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/ai-proxy/chat');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer jwt-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    message: '本月降本达成率是多少？',
    runtimeContext
  });
});

test('buildRuntimeContext includes kpiSnapshot for AI proxy payload (Ralph US-005)', () => {
  const snapshot = createInitialDashboardState({
    session: { userRole: 'procurement_manager' },
    ui: {
      activeTab: 'tab1',
      activeModule: '降本分析',
      kpiSnapshot: {
        kpis: { savingsRate: 5.2, savingsAmount: 1240 },
        source: 'api',
        updatedAt: '2026-04-13T00:00:00.000Z'
      }
    }
  });
  const ctx = buildRuntimeContext(snapshot);
  assert.equal(ctx.kpiSnapshot.source, 'api');
  assert.equal(ctx.kpiSnapshot.kpis.savingsRate, 5.2);
});