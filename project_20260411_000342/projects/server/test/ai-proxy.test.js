import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createCircuitBreaker } from '../src/lib/circuit-breaker.js';
import { callCozeChat } from '../src/services/coze-service.js';

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

const silentLogger = {
  info() {}
};

function createToken(payload = { sub: 'u-1', role: 'procurement_manager' }) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function createTestApp(options = {}) {
  return createApp({ logger: silentLogger, ...options });
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
  global.fetch = originalFetch;
});

test('POST /api/ai-proxy/chat rejects missing auth header', async () => {
  const app = createTestApp();
  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .send({ message: 'hello' });

  assert.equal(response.statusCode, 401);
});

test('POST /api/ai-proxy/chat rejects invalid jwt token', async () => {
  process.env.JWT_SECRET = 'test-secret';

  const app = createTestApp();
  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', 'Bearer invalid-token')
    .send({ message: 'hello' });

  assert.equal(response.statusCode, 403);
});

test('POST /api/ai-proxy/chat accepts lowercase bearer scheme', async () => {
  process.env.JWT_SECRET = 'test-secret';

  const app = createTestApp();
  const token = createToken({ sub: 'u-2', role: 'procurement_manager' });

  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `bearer ${token}`)
    .send({ message: 'hello' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.degraded, true);
});

test('POST /api/ai-proxy/chat fails closed when jwt secret is placeholder', async () => {
  process.env.JWT_SECRET = 'replace-me';

  const app = createTestApp();
  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', 'Bearer any-token')
    .send({ message: 'hello' });

  assert.equal(response.statusCode, 503);
});

test('POST /api/ai-proxy/chat attaches trace id for authenticated request', async () => {
  process.env.JWT_SECRET = 'test-secret';

  const app = createTestApp();
  const token = createToken();

  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'hello', runtimeContext: { activeTab: 'tab1' } });

  assert.equal(response.statusCode, 200);
  assert.equal(typeof response.body.traceId, 'string');
  assert.equal(typeof response.headers['x-trace-id'], 'string');
  assert.equal(response.body.degraded, true);
});

test('POST /api/ai-proxy/chat returns cached=true on repeated successful upstream request', async () => {
  process.env.JWT_SECRET = 'test-secret';

  const app = createTestApp({
    cozeService: async ({ message }) => ({
      role: 'assistant',
      content: `upstream:${message}`,
      metadata: { degraded: false }
    })
  });
  const token = createToken();
  const payload = {
    message: 'summarize supplier risk',
    runtimeContext: { activeTab: 'tab7', view: 'summary', cacheable: true }
  };

  const firstResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  const secondResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.cached, false);
  assert.equal(firstResponse.body.degraded, false);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.cached, true);
  assert.equal(secondResponse.body.degraded, false);
  assert.deepEqual(secondResponse.body.reply, firstResponse.body.reply);
});

test('POST /api/ai-proxy/chat does not cache degraded fallback after upstream failure', async () => {
  process.env.JWT_SECRET = 'test-secret';

  let attempts = 0;
  const app = createTestApp({
    cozeService: async () => {
      attempts += 1;
      throw new Error('timeout');
    }
  });
  const token = createToken();
  const payload = {
    message: 'summarize supplier risk',
    runtimeContext: { activeTab: 'tab7', activeModule: '供应源分析', view: 'summary', cacheable: true }
  };

  const firstResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  const secondResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.cached, false);
  assert.equal(firstResponse.body.degraded, true);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.cached, false);
  assert.equal(secondResponse.body.degraded, true);
  assert.equal(attempts, 2);
});

test('POST /api/ai-proxy/chat does not cache successful response when request is not cacheable', async () => {
  process.env.JWT_SECRET = 'test-secret';

  let attempts = 0;
  const app = createTestApp({
    cozeService: async ({ message }) => {
      attempts += 1;
      return {
        role: 'assistant',
        content: `upstream:${message}`,
        metadata: { degraded: false }
      };
    }
  });
  const token = createToken();
  const payload = {
    message: '实时图表分析',
    runtimeContext: { activeTab: 'tab3', activeModule: '价格趋势分析' }
  };

  const firstResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  const secondResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.cached, false);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.cached, false);
  assert.equal(attempts, 2);
});

test('POST /api/ai-proxy/chat returns 503 degraded reply when breaker is open', async () => {
  process.env.JWT_SECRET = 'test-secret';

  const breaker = createCircuitBreaker();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    breaker.recordFailure();
  }

  const app = createTestApp({ breaker });
  const token = createToken();
  const response = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'what changed this week?' });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.degraded, true);
  assert.equal(response.body.cached, false);
  assert.equal(response.body.error, 'AI proxy is temporarily degraded');
});

test('POST /api/ai-proxy/chat cache entry expires after ttl window', async () => {
  process.env.JWT_SECRET = 'test-secret';

  let attempts = 0;
  const app = createTestApp({
    cacheTtlMs: 5,
    cozeService: async ({ message }) => {
      attempts += 1;
      return {
        role: 'assistant',
        content: `upstream:${message}:${attempts}`,
        metadata: { degraded: false }
      };
    }
  });
  const token = createToken();
  const payload = {
    message: 'stable glossary question',
    runtimeContext: { activeTab: 'tab1', activeModule: '降本分析', cacheable: true }
  };

  const firstResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const secondResponse = await request(app)
    .post('/api/ai-proxy/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.cached, false);
  assert.equal(attempts, 2);
});

test('circuit breaker recovers after recovery window', async () => {
  const breaker = createCircuitBreaker({ failureThreshold: 1, recoveryWindowMs: 5 });
  breaker.recordFailure();

  assert.equal(breaker.canRequest(), false);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(breaker.canRequest(), true);
});

test('callCozeChat aborts when upstream timeout is exceeded', async () => {
  process.env.COZE_API_BASE_URL = 'https://api.coze.cn';
  process.env.COZE_API_TOKEN = 'token';
  process.env.COZE_BOT_ID = 'bot';
  process.env.COZE_TIMEOUT_MS = '5';

  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      reject(new Error('timeout'));
    }, { once: true });
  });

  await assert.rejects(
    () => callCozeChat({ message: 'hello', runtimeContext: {}, traceId: 'trace-1' }),
    /timeout/
  );
});

test('OPTIONS /api/ai-proxy/chat returns cors security headers', async () => {
  process.env.CORS_ORIGIN = 'http://localhost:5500';

  const app = createTestApp();
  const response = await request(app)
    .options('/api/ai-proxy/chat')
    .set('Origin', 'http://localhost:5500');

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5500');
  assert.equal(response.headers['access-control-allow-methods'], 'GET,POST,OPTIONS');
  assert.equal(response.headers['access-control-expose-headers'], 'x-trace-id');
  assert.match(response.headers['strict-transport-security'], /max-age=31536000/);
});