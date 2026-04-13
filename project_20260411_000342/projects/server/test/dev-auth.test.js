import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

test('GET /api/auth/dev-token returns 404 when ALLOW_DEV_TOKEN is not true', async () => {
  delete process.env.ALLOW_DEV_TOKEN;
  process.env.JWT_SECRET = 'test-secret';

  const app = createApp();
  const response = await request(app).get('/api/auth/dev-token');

  assert.equal(response.statusCode, 404);
});

test('GET /api/auth/dev-token returns JWT when ALLOW_DEV_TOKEN=true and JWT_SECRET set', async () => {
  process.env.ALLOW_DEV_TOKEN = 'true';
  process.env.JWT_SECRET = 'test-secret-dev-auth';

  const app = createApp();
  const response = await request(app).get('/api/auth/dev-token');

  assert.equal(response.statusCode, 200);
  assert.ok(typeof response.body.token === 'string');
  const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.sub, 'dev-demo');
});
