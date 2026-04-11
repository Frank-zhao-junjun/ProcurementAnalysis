import test from 'node:test';
import assert from 'node:assert/strict';
import { createDegradeReply } from '../src/services/degrade-service.js';

test('createDegradeReply returns a compact degraded conclusion', () => {
  const reply = createDegradeReply({
    message: '请总结本周采购风险',
    runtimeContext: { activeTab: 'home', activeModule: '首页驾驶舱', severity: 'high' }
  });

  assert.equal(reply.role, 'assistant');
  assert.equal(reply.metadata.degraded, true);
  assert.match(reply.content, /简版结论/);
  assert.match(reply.content, /采购风险/);
  assert.match(reply.content, /首页驾驶舱/);
  assert.deepEqual(reply.runtimeContext, { activeTab: 'home', activeModule: '首页驾驶舱', severity: 'high' });
});