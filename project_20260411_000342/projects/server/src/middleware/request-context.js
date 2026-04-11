import { randomUUID } from 'node:crypto';

export function attachRequestContext(req, res, next) {
  req.traceId = randomUUID();
  res.setHeader('x-trace-id', req.traceId);
  next();
}