import { Router } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 内网演示：签发短期 JWT，避免每次在控制台手动设置 window.__AI_JWT__。
 * 仅当环境变量 ALLOW_DEV_TOKEN=true 且 JWT_SECRET 已正确配置时可用；否则返回 404。
 */
export function createDevAuthRouter() {
  const router = Router();

  router.get('/dev-token', (_req, res) => {
    if (process.env.ALLOW_DEV_TOKEN !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'replace-me') {
      return res.status(503).json({ error: 'JWT_SECRET is not configured' });
    }

    const token = jwt.sign(
      { sub: 'dev-demo', role: 'procurement_manager' },
      secret,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      expiresIn: '8h'
    });
  });

  return router;
}
