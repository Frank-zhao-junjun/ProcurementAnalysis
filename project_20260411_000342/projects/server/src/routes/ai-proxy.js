import crypto from 'node:crypto';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCircuitBreaker } from '../lib/circuit-breaker.js';
import { createCacheStore } from '../lib/cache-store.js';
import { callCozeChat } from '../services/coze-service.js';
import { createDegradeReply } from '../services/degrade-service.js';

const DEFAULT_CACHE_TTL_MS = 30_000;
const DEFAULT_BREAKER_FAILURE_THRESHOLD = 5;
const DEFAULT_BREAKER_RECOVERY_WINDOW_MS = 30_000;

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDefaultCacheTtlMs() {
  return parsePositiveInt(process.env.AI_PROXY_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS);
}

function getDefaultBreaker() {
  return createCircuitBreaker({
    failureThreshold: parsePositiveInt(
      process.env.AI_PROXY_BREAKER_FAILURE_THRESHOLD,
      DEFAULT_BREAKER_FAILURE_THRESHOLD
    ),
    recoveryWindowMs: parsePositiveInt(
      process.env.AI_PROXY_BREAKER_RECOVERY_WINDOW_MS,
      DEFAULT_BREAKER_RECOVERY_WINDOW_MS
    )
  });
}

function toStableValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toStableValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        if (key === 'cacheable' || value[key] === undefined) {
          return result;
        }
        result[key] = toStableValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

function createCacheKey(req) {
  const runtimeContext = toStableValue(req.body?.runtimeContext ?? {});
  return crypto.createHash('sha256').update(JSON.stringify({
    message: req.body?.message ?? '',
    runtimeContext
  })).digest('hex');
}

function isCacheableRequest(req) {
  return Boolean(req.body?.runtimeContext?.cacheable);
}

function toDegradedPayload({ reply, traceId, cached, error }) {
  return {
    error,
    traceId,
    cached,
    degraded: true,
    reply
  };
}

function toCachedPayload({ entry, traceId }) {
  return {
    traceId,
    cached: true,
    degraded: Boolean(entry.reply?.metadata?.degraded),
    reply: entry.reply
  };
}

function logInfo(logger, event, details) {
  if (typeof logger?.info === 'function') {
    logger.info({ event, ...details });
  }
}

export function createAiProxyRouter({
  cache = createCacheStore(),
  breaker = getDefaultBreaker(),
  logger = console,
  cozeService = callCozeChat,
  cacheTtlMs = getDefaultCacheTtlMs()
} = {}) {
  const router = Router();

  router.post('/chat', requireAuth, async (req, res) => {
    const cacheKey = createCacheKey(req);
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry) {
      logInfo(logger, 'ai_proxy_cache_hit', { traceId: req.traceId });
      return res.status(200).json(toCachedPayload({ entry: cachedEntry, traceId: req.traceId }));
    }

    if (!breaker.canRequest()) {
      const reply = createDegradeReply({
        message: req.body?.message,
        runtimeContext: req.body?.runtimeContext
      });

      logInfo(logger, 'ai_proxy_breaker_open', { traceId: req.traceId, state: breaker.getState() });
      return res.status(503).json(
        toDegradedPayload({
          reply,
          traceId: req.traceId,
          cached: false,
          error: 'AI proxy is temporarily degraded'
        })
      );
    }

    logInfo(logger, 'ai_proxy_cache_miss', { traceId: req.traceId });

    try {
      if (typeof cozeService === 'function') {
        const upstreamReply = await cozeService({
          message: req.body?.message,
          runtimeContext: req.body?.runtimeContext,
          traceId: req.traceId
        });
        breaker.recordSuccess();

        if (isCacheableRequest(req)) {
          cache.set(cacheKey, { reply: upstreamReply }, cacheTtlMs);
        }

        return res.status(200).json({
          traceId: req.traceId,
          cached: false,
          degraded: false,
          reply: upstreamReply
        });
      }
    } catch (error) {
      breaker.recordFailure();
      logInfo(logger, 'ai_proxy_coze_error', {
        traceId: req.traceId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    const reply = createDegradeReply({
      message: req.body?.message,
      runtimeContext: req.body?.runtimeContext
    });

    return res.status(200).json(toDegradedPayload({ reply, traceId: req.traceId, cached: false }));
  });

  return router;
}