import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const specsRoot = path.join(projectRoot, 'docs', 'superpowers', 'specs');
const envExamplePath = path.join(projectRoot, 'server', '.env.example');

function readSpec(name) {
  return fs.readFileSync(path.join(specsRoot, name), 'utf8');
}

test('production readiness checklist exists and records release gates', () => {
  const checklistPath = path.join(specsRoot, '2026-04-11-ai-assistant-production-readiness-checklist.md');
  assert.equal(fs.existsSync(checklistPath), true);

  const content = fs.readFileSync(checklistPath, 'utf8');
  assert.match(content, /Coze 平台持久化存储边界/);
  assert.match(content, /非生产|测试数据|脱敏数据/);
  assert.match(content, /隐私门槛|Privacy gate|同意并使用/i);
});

test('gate review doc references conditional release and production recheck', () => {
  const content = readSpec('2026-04-11-ai-assistant-integration-v2-review-gate-check.md');

  assert.match(content, /带条件放行/);
  assert.match(content, /生产放行前/);
  assert.match(content, /Coze 平台持久化存储边界/);
  assert.match(content, /生产-readiness|production readiness|ready/i);
});

test('.env.example contains non-production and privacy gate guardrails', () => {
  const content = fs.readFileSync(envExamplePath, 'utf8');

  assert.match(content, /^NON_PRODUCTION_ONLY=true$/m);
  assert.match(content, /^CORS_ORIGIN=/m);
  assert.match(content, /^JWT_SECRET=/m);
  assert.match(content, /^COZE_API_(TOKEN|KEY)=/m);
  assert.match(content, /^AI_PRIVACY_GATE_REQUIRED=true$/m);
});