import fs from 'node:fs';
import path from 'node:path';

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      continue;
    }

    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function getConfig() {
  loadLocalEnv();

  return {
    port: parsePositiveInt(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    aiProxy: {
      cacheTtlMs: parsePositiveInt(process.env.AI_PROXY_CACHE_TTL_MS, 30_000),
      breakerFailureThreshold: parsePositiveInt(process.env.AI_PROXY_BREAKER_FAILURE_THRESHOLD, 5),
      breakerRecoveryWindowMs: parsePositiveInt(process.env.AI_PROXY_BREAKER_RECOVERY_WINDOW_MS, 30_000)
    }
  };
}