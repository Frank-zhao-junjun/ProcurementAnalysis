# AI Assistant Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready AI assistant to the procurement dashboard with real-time page context, privacy gating, a Node.js proxy, degraded-mode handling, and business glossary support.

**Architecture:** Keep the existing dashboard as a native static page, replace the built-in demo AI rule engine with modular front-end scripts, and add a separate Node.js proxy service for authentication, request shaping, caching, logging, and Coze integration. Build the knowledge layer as versioned markdown under the existing docs tree so the AI response chain can cite business glossary and FAQ sources.

**Tech Stack:** Native HTML/CSS/JavaScript, ECharts 5.5, Node.js 20+, Express, Redis-compatible cache abstraction, Fetch API, node:test, Supertest.

## Close-out Status

Status: Completed through Task 9 on 2026-04-11.

Task completion summary:

- [x] Task 1: Proxy service scaffolded with health route and tests.
- [x] Task 2: Auth, request context, and security middleware implemented.
- [x] Task 3: Coze proxy, cache, circuit breaker, and degrade mode implemented.
- [x] Task 4: Modular front-end shell, state bus, and context bridge integrated.
- [x] Task 5: Privacy gate and authenticated message sending integrated.
- [x] Task 6: Initial business glossary and FAQ seed set completed.
- [x] Task 7: Rollout guardrails and production-readiness checklist completed.
- [x] Task 8: KPI dictionary, mapping rules, and root-cause knowledge content completed.
- [x] Task 9: Dashboard-to-AI linkage completed, including context-aware prompts.

Latest verification evidence:

- [x] `npm test` in `server/` passed with 41/41 tests green.
- [x] Front-end integration regression includes context-aware prompt coverage in `server/test/frontend-state.test.js`.
- [x] Release guardrail checks cover production checklist and env guardrails.
- [x] Knowledge-base validation covers glossary, FAQ linking, and scenario cases.

Close-out notes:

- Inline task checkboxes below are preserved as the original execution template.
- Final implementation status should be read from this section plus the passing automated verification above.

---

## File structure

### Front-end

- Modify: `index.html`
- Modify: `styles/main.css`
- Create: `assets/js/ai/state-bus.js`
- Create: `assets/js/ai/context-bridge.js`
- Create: `assets/js/ai/privacy-gate.js`
- Create: `assets/js/ai/assistant-shell.js`

### Proxy service

- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/src/app.js`
- Create: `server/src/config.js`
- Create: `server/src/middleware/auth.js`
- Create: `server/src/middleware/request-context.js`
- Create: `server/src/middleware/security.js`
- Create: `server/src/lib/cache-store.js`
- Create: `server/src/lib/circuit-breaker.js`
- Create: `server/src/services/coze-service.js`
- Create: `server/src/services/degrade-service.js`
- Create: `server/src/routes/health.js`
- Create: `server/src/routes/ai-proxy.js`

### Knowledge and docs

- Create: `docs/superpowers/knowledge-base/00-index.md`
- Create: `docs/superpowers/knowledge-base/01-kpi-dictionary/savings-amount.md`
- Create: `docs/superpowers/knowledge-base/01-kpi-dictionary/budget-execution.md`
- Create: `docs/superpowers/knowledge-base/01-kpi-dictionary/material-cost-rate.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/cost-calculation.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/tco-boundary.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/price-benchmark-rule.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/alert-disposition-rule.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/category-commodity-mapping.md`
- Create: `docs/superpowers/knowledge-base/05-faq/scenario-based/root-cause-cases.md`
- Create: `docs/superpowers/knowledge-base/05-faq/top50-questions.md`
- Create: `docs/superpowers/knowledge-base/05-faq/scenario-based/morning-briefing.md`

### Tests

- Create: `server/test/health.test.js`
- Create: `server/test/ai-proxy.test.js`
- Create: `server/test/degrade-service.test.js`

## Dependency mapping

The user suggested two extra workstreams and a dependency chain. In this plan, the mapping to existing tasks is:

- Suggested `Task 2 (状态总线)` maps to **Task 4** in this plan.
- Suggested `Task 3 (AI 组件 UI)` maps to **Task 4 + Task 5** in this plan.
- Suggested `Task 7 (Coze 对接)` maps to **Task 3** in this plan.
- Suggested `Task 8 (知识库内容建设)` is added below as **Task 8**.
- Suggested `Task 9 (板块联动功能)` is added below as **Task 9**.

Execution dependencies:

- **Task 4** → **Task 9**
- **Task 4 + Task 5 + Task 3** → demoable prototype
- **Task 8** → improves answer quality and should land before broad UAT

---

### Task 1: Scaffold the proxy service

**Files:**

- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/src/app.js`
- Create: `server/src/config.js`
- Create: `server/src/routes/health.js`
- Test: `server/test/health.test.js`

- [ ] **Step 1: Write the failing health test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('GET /api/ai-proxy/health returns status ok', async () => {
  const app = createApp();
  const response = await request(app).get('/api/ai-proxy/health');

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(typeof response.body.timestamp, 'string');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- health.test.js`

Expected: FAIL with `Cannot find module '../src/app.js'`.

- [ ] **Step 3: Write the minimal service scaffold**

```javascript
// server/src/config.js
export function getConfig() {
  return {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

// server/src/routes/health.js
import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  return router;
}

// server/src/app.js
import express from 'express';
import { createHealthRouter } from './routes/health.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-proxy', createHealthRouter());
  return app;
}

// server/package.json
{
  "name": "procurement-ai-proxy",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/app.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "devDependencies": {
    "supertest": "^7.1.0"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm install && npm test -- health.test.js`

Expected: PASS with `GET /api/ai-proxy/health returns status ok`.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/.env.example server/src/app.js server/src/config.js server/src/routes/health.js server/test/health.test.js
git commit -m "feat: scaffold ai proxy service"
```

### Task 2: Add auth, request context, and security middleware

**Files:**

- Modify: `server/src/app.js`
- Create: `server/src/middleware/auth.js`
- Create: `server/src/middleware/request-context.js`
- Create: `server/src/middleware/security.js`
- Modify: `server/.env.example`
- Test: `server/test/ai-proxy.test.js`

- [ ] **Step 1: Write failing auth and security tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

test('POST /api/ai-proxy/chat rejects missing auth header', async () => {
  const app = createApp();
  const response = await request(app).post('/api/ai-proxy/chat').send({ message: 'hello' });
  assert.equal(response.statusCode, 401);
});

test('POST /api/ai-proxy/chat attaches trace id for authenticated request', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const app = createApp();
  const token = jwt.sign({ sub: 'u-1', role: 'procurement_manager' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'hello', runtimeContext: { activeTab: 'tab1' } });

  assert.equal(response.statusCode, 501);
  assert.equal(typeof response.body.traceId, 'string');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- ai-proxy.test.js`

Expected: FAIL with route or jwt dependency errors.

- [ ] **Step 3: Implement auth and security baseline**

```javascript
// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// server/src/middleware/request-context.js
import crypto from 'node:crypto';

export function attachRequestContext(req, res, next) {
  req.traceId = crypto.randomUUID();
  res.setHeader('x-trace-id', req.traceId);
  next();
}

// server/src/middleware/security.js
export function applySecurity(app) {
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5500');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
}

// server/src/app.js
import { requireAuth } from './middleware/auth.js';
import { attachRequestContext } from './middleware/request-context.js';
import { applySecurity } from './middleware/security.js';
import { Router } from 'express';

function createPlaceholderChatRouter() {
  const router = Router();
  router.post('/chat', requireAuth, (req, res) => {
    res.status(501).json({ traceId: req.traceId, error: 'Not implemented' });
  });
  return router;
}

export function createApp() {
  const app = express();
  applySecurity(app);
  app.use(express.json());
  app.use(attachRequestContext);
  app.use('/api/ai-proxy', createHealthRouter());
  app.use('/api/ai-proxy', createPlaceholderChatRouter());
  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm install jsonwebtoken && npm test -- ai-proxy.test.js`

Expected: PASS with 401 for unauthenticated request and 501 plus `traceId` for authenticated request.

- [ ] **Step 5: Commit**

```bash
git add server/src/app.js server/src/middleware/auth.js server/src/middleware/request-context.js server/src/middleware/security.js server/.env.example server/test/ai-proxy.test.js server/package.json
git commit -m "feat: add proxy auth and request context middleware"
```

### Task 3: Implement Coze proxy, cache, circuit breaker, and degrade mode

**Files:**

- Create: `server/src/lib/cache-store.js`
- Create: `server/src/lib/circuit-breaker.js`
- Create: `server/src/services/coze-service.js`
- Create: `server/src/services/degrade-service.js`
- Create: `server/src/routes/ai-proxy.js`
- Modify: `server/src/app.js`
- Test: `server/test/degrade-service.test.js`
- Modify: `server/test/ai-proxy.test.js`

- [ ] **Step 1: Write failing degrade and cache tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDegradeReply } from '../src/services/degrade-service.js';

test('createDegradeReply returns short fallback for timeout', () => {
  const result = createDegradeReply({
    message: '本月降本额是多少',
    runtimeContext: { activeModule: '降本分析', activeTab: 'tab1' },
  });

  assert.match(result.message.content, /简版结论|稍后/);
  assert.equal(result.message.metadata.degraded, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- degrade-service.test.js`

Expected: FAIL with missing service file.

- [ ] **Step 3: Implement minimal proxy pipeline**

```javascript
// server/src/lib/cache-store.js
const memory = new Map();

export function createCacheStore() {
  return {
    get(key) {
      const hit = memory.get(key);
      if (!hit || hit.expiresAt < Date.now()) return null;
      return hit.value;
    },
    set(key, value, ttlMs) {
      memory.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}

// server/src/lib/circuit-breaker.js
export function createCircuitBreaker() {
  let failures = 0;
  let openedAt = 0;

  return {
    canRequest() {
      if (failures < 5) return true;
      return Date.now() - openedAt > 30_000;
    },
    onSuccess() { failures = 0; openedAt = 0; },
    onFailure() { failures += 1; if (failures >= 5) openedAt = Date.now(); },
  };
}

// server/src/services/degrade-service.js
export function createDegradeReply({ message, runtimeContext }) {
  return {
    message: {
      role: 'assistant',
      content: `AI 分析超时，先返回简版结论。你当前位于${runtimeContext.activeModule || '当前模块'}，问题是“${message}”。请稍后重试或查看当前图表。`,
      metadata: { degraded: true, source: 'degrade-service' },
    },
  };
}

// server/src/services/coze-service.js
export async function callCozeChat({ config, payload }) {
  const response = await fetch(`${config.cozeBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.cozeApiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Coze request failed: ${response.status}`);
  return response.json();
}
```

- [ ] **Step 4: Wire route with cache and circuit breaker, then run tests**

```javascript
// server/src/routes/ai-proxy.js
import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { createDegradeReply } from '../services/degrade-service.js';

export function createAiProxyRouter({ cache, breaker, logger }) {
  const router = Router();

  router.post('/chat', requireAuth, async (req, res) => {
    const { message, runtimeContext } = req.body;
    const cacheKey = crypto.createHash('sha256').update(JSON.stringify({ message, runtimeContext })).digest('hex');
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ traceId: req.traceId, cached: true, data: cached });
    }

    if (!breaker.canRequest()) {
      const degraded = createDegradeReply({ message, runtimeContext });
      return res.status(503).json({ traceId: req.traceId, data: degraded, degraded: true });
    }

    logger.info({ traceId: req.traceId, category: 'ai_chat', module: runtimeContext?.activeModule || 'unknown' });
    const degraded = createDegradeReply({ message, runtimeContext });
    cache.set(cacheKey, degraded, 5 * 60 * 1000);
    return res.status(200).json({ traceId: req.traceId, data: degraded, degraded: true });
  });

  return router;
}
```

Run: `cd server && npm test -- ai-proxy.test.js && npm test -- degrade-service.test.js`

Expected: PASS with degrade reply and cache hit behavior testable after you extend `ai-proxy.test.js`.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/cache-store.js server/src/lib/circuit-breaker.js server/src/services/coze-service.js server/src/services/degrade-service.js server/src/routes/ai-proxy.js server/src/app.js server/test/ai-proxy.test.js server/test/degrade-service.test.js
git commit -m "feat: add ai proxy degrade and cache pipeline"
```

### Task 4: Replace the demo AI logic with a modular front-end shell and state bus

**Files:**

- Modify: `index.html`
- Modify: `styles/main.css`
- Create: `assets/js/ai/state-bus.js`
- Create: `assets/js/ai/context-bridge.js`
- Create: `assets/js/ai/assistant-shell.js`

- [ ] **Step 1: Write the front-end integration checklist as a failing acceptance test**

```markdown
- [ ] AI shell no longer uses getAIReply demo rule engine
- [ ] AI shell reads dashboardStateBus.getSnapshot()
- [ ] switchTab updates state bus activeTab and activeModule
- [ ] dim-toggle click updates selectedDimension in state bus
- [ ] AI shell can render degraded backend response
```

- [ ] **Step 2: Verify the current code still uses the demo AI engine**

Run: `rg "getAIReply|_aiState|createAIAssistant" index.html`

Expected: matches found in the existing inline `PART 5: AI 助手浮层` section.

- [ ] **Step 3: Create the state bus and context bridge, then patch tab and dimension events**

```javascript
// assets/js/ai/state-bus.js
const listeners = new Set();
const state = {
  session: { userRole: 'procurement_manager', dateRange: '2026-W15' },
  ui: { activeTab: 'tabHome', activeModule: '首页驾驶舱', selectedDimension: null, activeFilters: {}, selectedEntity: null, highlightedChart: null },
};

export const dashboardStateBus = {
  update(partial) {
    Object.assign(state.ui, partial.ui || {});
    Object.assign(state.session, partial.session || {});
    listeners.forEach((listener) => listener(this.getSnapshot()));
  },
  getSnapshot() {
    return structuredClone(state);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// assets/js/ai/context-bridge.js
import { dashboardStateBus } from './state-bus.js';

export function syncTabState(tabId, tabName) {
  dashboardStateBus.update({ ui: { activeTab: tabId, activeModule: tabName } });
}

export function syncDimensionState(dimName, chartId) {
  dashboardStateBus.update({ ui: { selectedDimension: dimName, highlightedChart: chartId } });
}
```

In `index.html`, add module scripts before `</body>`:

```html
<script type="module" src="./assets/js/ai/state-bus.js"></script>
<script type="module" src="./assets/js/ai/context-bridge.js"></script>
<script type="module" src="./assets/js/ai/privacy-gate.js"></script>
<script type="module" src="./assets/js/ai/assistant-shell.js"></script>
```

- [ ] **Step 4: Implement the shell and verify the demo engine is gone**

```javascript
// assets/js/ai/assistant-shell.js
import { dashboardStateBus } from './state-bus.js';

export function bootAssistantShell() {
  const snapshot = dashboardStateBus.getSnapshot();
  console.info('[ai-shell] boot with state', snapshot.ui.activeTab);
}

bootAssistantShell();
```

Run: `rg "getAIReply|_aiState|createAIAssistant" index.html`

Expected: no matches for `getAIReply` after removing or replacing the inline demo section.

- [ ] **Step 5: Commit**

```bash
git add index.html styles/main.css assets/js/ai/state-bus.js assets/js/ai/context-bridge.js assets/js/ai/assistant-shell.js
git commit -m "feat: replace demo ai with modular assistant shell"
```

### Task 5: Add privacy gating and authenticated message sending

**Files:**

- Create: `assets/js/ai/privacy-gate.js`
- Modify: `assets/js/ai/assistant-shell.js`
- Modify: `styles/main.css`
- Modify: `index.html`

- [ ] **Step 1: Write the acceptance test for privacy gate behavior**

```markdown
- [ ] First click on AI entry opens privacy modal instead of chat panel
- [ ] User must click "同意并使用" before chat panel becomes interactive
- [ ] If user declines, AI shell remains disabled
- [ ] AI request body contains runtimeContext from dashboardStateBus.getSnapshot()
```

- [ ] **Step 2: Verify the current UI has no mandatory consent gate**

Run: `rg "privacy-modal|同意并使用|暂不使用" index.html assets/js/ai styles/main.css`

Expected: no required consent implementation or incomplete placeholders.

- [ ] **Step 3: Implement privacy gate and message sender**

```javascript
// assets/js/ai/privacy-gate.js
let consent = false;

export function hasAiConsent() {
  return consent || localStorage.getItem('aiPrivacyAccepted') === 'true';
}

export function grantAiConsent(remember) {
  consent = true;
  if (remember) localStorage.setItem('aiPrivacyAccepted', 'true');
}

export function denyAiConsent() {
  consent = false;
}

// assets/js/ai/assistant-shell.js
import { dashboardStateBus } from './state-bus.js';
import { hasAiConsent } from './privacy-gate.js';

async function sendMessage(message) {
  if (!hasAiConsent()) throw new Error('AI consent required');

  const runtimeContext = dashboardStateBus.getSnapshot();
  const response = await fetch('/api/ai-proxy/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.__AI_JWT__}`,
    },
    body: JSON.stringify({ message, runtimeContext }),
  });

  return response.json();
}
```

- [ ] **Step 4: Verify acceptance flow manually**

Run: open the dashboard in the browser and verify:

- first click shows privacy modal
- decline keeps panel disabled
- agree opens chat shell
- message payload includes `runtimeContext.ui.activeTab`

Expected: all four checks pass.

- [ ] **Step 5: Commit**

```bash
git add assets/js/ai/privacy-gate.js assets/js/ai/assistant-shell.js styles/main.css index.html
git commit -m "feat: add ai privacy gate and authenticated send flow"
```

### Task 6: Build the initial business glossary and FAQ set

**Files:**

- Create: `docs/superpowers/knowledge-base/00-index.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/cost-calculation.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/tco-boundary.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/price-benchmark-rule.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/alert-disposition-rule.md`
- Create: `docs/superpowers/knowledge-base/05-faq/top50-questions.md`
- Create: `docs/superpowers/knowledge-base/05-faq/scenario-based/morning-briefing.md`

- [ ] **Step 1: Write the glossary acceptance checklist**

```markdown
- [ ] cost-calculation.md states that savings exclude logistics cost
- [ ] tco-boundary.md enumerates included and excluded cost items
- [ ] price-benchmark-rule.md names market price source and update frequency
- [ ] alert-disposition-rule.md includes owner, status, and ETA fields
- [ ] FAQ contains at least one追问型 example for each of the four business logic files
```

- [ ] **Step 2: Verify the files do not already exist**

Run: `rg --files docs/superpowers/knowledge-base`

Expected: no files, or only empty scaffolding.

- [ ] **Step 3: Write the minimal glossary docs**

```markdown
# docs/superpowers/knowledge-base/04-business-logic/cost-calculation.md

## 定义
降本额 = (基准采购单价 - 本期采购单价) × 本期采购量。

## 纳入项
- 采购价差
- 批量采购带来的议价收益

## 排除项
- 物流费用
- 税费
- 包装费用
- 返利

## 示例问答
Q: 本月降本是否包含物流费用？
A: 不包含。物流费用归入 TCO 口径。
```

- [ ] **Step 4: Review glossary docs for required fields**

Run: `rg "## 定义|## 纳入项|## 排除项|## 示例问答|## 常见误解|版本" docs/superpowers/knowledge-base -n`

Expected: all business-logic docs contain every required heading.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/knowledge-base/00-index.md docs/superpowers/knowledge-base/04-business-logic docs/superpowers/knowledge-base/05-faq
git commit -m "docs: add ai assistant glossary and faq seed content"
```

### Task 7: End-to-end verification and rollout guardrails

**Files:**

- Modify: `docs/superpowers/specs/2026-04-11-ai-assistant-integration-v2-review-gate-check.md`
- Create: `docs/superpowers/specs/2026-04-11-ai-assistant-production-readiness-checklist.md`
- Modify: `server/.env.example`

- [ ] **Step 1: Write the production-readiness checklist**

```markdown
# AI Assistant Production Readiness Checklist

- [ ] Coze storage-boundary confirmation attached
- [ ] JWT secret configured outside repo
- [ ] CORS origin restricted to production host
- [ ] Real data masked in non-production logs
- [ ] Privacy gate enabled in production build
- [ ] Health endpoint and degrade path tested
```

- [ ] **Step 2: Verify the non-production limits are documented**

Run: `rg "带条件放行|生产放行前提|测试数据|脱敏数据" docs/superpowers/specs -n`

Expected: matches found in the v2 gate and security addendum docs.

- [ ] **Step 3: Add environment and release guardrails**

```dotenv
# server/.env.example
PORT=3000
JWT_SECRET=replace-me
COZE_API_KEY=replace-me
COZE_BASE_URL=https://api.coze.cn/v1
CORS_ORIGIN=http://localhost:5500
NON_PRODUCTION_ONLY=true
```

```markdown
# docs/superpowers/specs/2026-04-11-ai-assistant-production-readiness-checklist.md

## 放行门槛
- 仅在 Coze 平台持久化存储边界确认后允许接入真实数据。
- 仅在安全专家复核后允许业务试点。
```

- [ ] **Step 4: Run the verification commands**

Run:

```bash
cd server
npm test
cd ..
rg "getAIReply|_aiState" index.html
rg "Coze 平台持久化存储边界" docs/superpowers/specs -n
```

Expected:

- all server tests PASS
- `rg "getAIReply|_aiState" index.html` returns no results
- spec docs still mention the production gate for Coze storage-boundary confirmation

- [ ] **Step 5: Commit**

```bash
git add server/.env.example docs/superpowers/specs/2026-04-11-ai-assistant-production-readiness-checklist.md docs/superpowers/specs/2026-04-11-ai-assistant-integration-v2-review-gate-check.md
git commit -m "docs: add ai assistant production readiness checks"
```

### Task 8: Build knowledge content for answer quality

**Files:**

- Create: `docs/superpowers/knowledge-base/01-kpi-dictionary/savings-amount.md`
- Create: `docs/superpowers/knowledge-base/01-kpi-dictionary/budget-execution.md`
- Create: `docs/superpowers/knowledge-base/01-kpi-dictionary/material-cost-rate.md`
- Create: `docs/superpowers/knowledge-base/04-business-logic/category-commodity-mapping.md`
- Create: `docs/superpowers/knowledge-base/05-faq/scenario-based/root-cause-cases.md`
- Modify: `docs/superpowers/knowledge-base/00-index.md`
- Modify: `docs/superpowers/knowledge-base/05-faq/top50-questions.md`

- [ ] **Step 1: Write the acceptance checklist for the new knowledge content**

```markdown
- [ ] KPI dictionary includes at least savings amount, budget execution, and material cost rate
- [ ] Root-cause cases include at least three explainable scenarios: price increase, quantity increase, and supplier delivery degradation
- [ ] Category-to-commodity mapping links dashboard categories to steel, PP, MDI, crude oil, and exchange-rate risk where relevant
- [ ] top50-questions.md includes references to the new glossary and case files
```

- [ ] **Step 2: Verify these content files do not already exist**

Run: `rg --files docs/superpowers/knowledge-base`

Expected: the new KPI dictionary and mapping files are absent, or need to be created from scratch.

- [ ] **Step 3: Write the KPI dictionary, root-cause cases, and mapping docs**

```markdown
# docs/superpowers/knowledge-base/01-kpi-dictionary/savings-amount.md

## 指标名称
降本额

## 定义
降本额 = (基准采购单价 - 本期采购单价) × 本期采购量。

## 常见追问
Q: 是否包含物流费用？
A: 不包含，物流费用属于 TCO 口径。

# docs/superpowers/knowledge-base/04-business-logic/category-commodity-mapping.md

## 品类到大宗商品映射
- 钢材 -> 热轧卷板、螺纹钢
- 塑料粒子 -> PP 拉丝、原油
- 化工原料 -> MDI、原油、汇率

## 用途
当用户询问“这个品类受什么市场因素影响”时，优先按此映射补全解释链路。

# docs/superpowers/knowledge-base/05-faq/scenario-based/root-cause-cases.md

## 归因案例 1：价格上涨导致预算偏差
- 现象：预算执行率恶化
- 根因：市场价上涨，长约覆盖不足
- 建议：复核锁价与供应商议价策略
```

- [ ] **Step 4: Run the content validation searches**

Run:

```bash
rg "## 指标名称|## 定义|## 常见追问" docs/superpowers/knowledge-base/01-kpi-dictionary -n
rg "品类到大宗商品映射|热轧卷板|PP 拉丝|MDI" docs/superpowers/knowledge-base/04-business-logic/category-commodity-mapping.md -n
rg "归因案例" docs/superpowers/knowledge-base/05-faq/scenario-based/root-cause-cases.md -n
```

Expected:

- KPI dictionary files include the required headings
- mapping doc references the expected commodities
- root-cause cases doc includes at least one named case section

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/knowledge-base/00-index.md docs/superpowers/knowledge-base/01-kpi-dictionary docs/superpowers/knowledge-base/04-business-logic/category-commodity-mapping.md docs/superpowers/knowledge-base/05-faq/top50-questions.md docs/superpowers/knowledge-base/05-faq/scenario-based/root-cause-cases.md
git commit -m "docs: add ai knowledge content for glossary and root cause cases"
```

### Task 9: Add dashboard-to-AI interaction hooks

**Files:**

- Modify: `assets/js/ai/state-bus.js`
- Modify: `assets/js/ai/context-bridge.js`
- Modify: `assets/js/ai/assistant-shell.js`
- Modify: `index.html`
- Modify: `styles/main.css`

- [ ] **Step 1: Write the interaction acceptance checklist**

```markdown
- [ ] Clicking a KPI card updates dashboardStateBus.selectedEntity
- [ ] Clicking an ECharts data point updates dashboardStateBus.highlightedChart and selectedEntity
- [ ] AI shell can offer a context-aware prompt based on the selected KPI or chart
- [ ] Board linkage works without breaking existing tab switching or drilldown modal behavior
```

- [ ] **Step 2: Verify the current dashboard does not yet publish KPI/chart selections into the AI state bus**

Run: `rg "selectedEntity|highlightedChart|chart\.on\(|kpi-card" index.html assets/js/ai -n`

Expected: either missing selection hooks or only partial state references exist.

- [ ] **Step 3: Implement KPI click and chart selection hooks**

```javascript
// assets/js/ai/context-bridge.js
import { dashboardStateBus } from './state-bus.js';

export function syncSelectedKpi(metricId, label, value) {
  dashboardStateBus.update({
    ui: {
      selectedEntity: {
        type: 'kpi',
        id: metricId,
        label,
        value,
      },
    },
  });
}

export function syncSelectedChart(chartId, dataName, dataValue) {
  dashboardStateBus.update({
    ui: {
      highlightedChart: chartId,
      selectedEntity: {
        type: 'chart-point',
        id: chartId,
        label: dataName,
        value: dataValue,
      },
    },
  });
}
```

In `index.html`, add hooks where charts are initialized and KPI cards are rendered:

```javascript
chart.on('click', (params) => {
  syncSelectedChart(id, params.name, params.value);
});

document.querySelectorAll('.kpi-card').forEach((card) => {
  card.addEventListener('click', () => {
    syncSelectedKpi(card.dataset.metricId, card.querySelector('.kpi-label')?.textContent, card.querySelector('.kpi-value')?.textContent);
  });
});
```

- [ ] **Step 4: Make the AI shell react to selected board context**

```javascript
// assets/js/ai/assistant-shell.js
function getSuggestedQuestion(snapshot) {
  const selected = snapshot.ui.selectedEntity;
  if (!selected) return null;

  if (selected.type === 'kpi') {
    return `解释一下 ${selected.label} 的当前表现和原因`;
  }

  if (selected.type === 'chart-point') {
    return `分析 ${selected.label} 这个点位的变化原因和建议动作`;
  }

  return null;
}
```

- [ ] **Step 5: Verify linkage behavior manually and commit**

Run manual checks in the browser:

- click one KPI card and confirm AI suggestion changes
- click one ECharts data point and confirm selected context updates
- switch tabs and confirm selection does not break tab resize or modal logic

Then commit:

```bash
git add assets/js/ai/state-bus.js assets/js/ai/context-bridge.js assets/js/ai/assistant-shell.js index.html styles/main.css
git commit -m "feat: link dashboard selections to ai assistant context"
```

---

## Self-review

- Spec coverage: the plan covers proxy scaffolding, security middleware, degrade mode, front-end state sync, privacy gating, glossary content, extra knowledge-content construction, dashboard-to-AI linkage, and production guardrails from v2 and v2.1.
- Placeholder scan: no `TODO`, `TBD`, or deferred implementation markers are intentionally left in task steps.
- Type consistency: `dashboardStateBus`, `runtimeContext`, `/api/ai-proxy/chat`, `traceId`, and degrade metadata naming are consistent across tasks.
