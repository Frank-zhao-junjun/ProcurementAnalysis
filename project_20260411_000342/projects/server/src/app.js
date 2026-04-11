import express from 'express';
import { attachRequestContext } from './middleware/request-context.js';
import { applySecurity } from './middleware/security.js';
import { createHealthRouter } from './routes/health.js';
import { createAiProxyRouter } from './routes/ai-proxy.js';
import { createCircuitBreaker } from './lib/circuit-breaker.js';
import { getConfig } from './config.js';

export function createApp(options = {}) {
  const app = express();
  const config = getConfig();
  const aiProxyOptions = {
    cacheTtlMs: config.aiProxy.cacheTtlMs,
    breaker: createCircuitBreaker({
      failureThreshold: config.aiProxy.breakerFailureThreshold,
      recoveryWindowMs: config.aiProxy.breakerRecoveryWindowMs
    }),
    ...options
  };

  applySecurity(app);
  app.use(attachRequestContext);
  app.use(express.json());
  app.use('/api/ai-proxy', createHealthRouter());
  app.use('/api/ai-proxy', createAiProxyRouter(aiProxyOptions));

  return app;
}
