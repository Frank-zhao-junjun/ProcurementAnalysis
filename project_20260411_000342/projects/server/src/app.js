import express from 'express';
import { createRequire } from 'node:module';
import { attachRequestContext } from './middleware/request-context.js';
import { applySecurity } from './middleware/security.js';
import { createHealthRouter } from './routes/health.js';
import { createAiProxyRouter } from './routes/ai-proxy.js';
import { createDevAuthRouter } from './routes/dev-auth.js';
import { getConfig } from './config.js';

const require = createRequire(import.meta.url);
/** Dashboard 路由仍为 CommonJS（demo-data 同源），用 createRequire 加载 */
const dashboardRouter = require('./routes/dashboard.cjs');

export function createApp(options = {}) {
  const app = express();
  getConfig();

  applySecurity(app);
  app.use(attachRequestContext);
  app.use(express.json());
  
  // 健康检查
  app.use('/api/health', createHealthRouter());
  
  // AI代理（集成规则引擎 + LLM）；测试可注入 cozeService / breaker / cacheTtlMs 等
  const aiProxyOptions = {};
  if (options.cozeService !== undefined) aiProxyOptions.cozeService = options.cozeService;
  if (options.breaker !== undefined) aiProxyOptions.breaker = options.breaker;
  if (options.cache !== undefined) aiProxyOptions.cache = options.cache;
  if (options.cacheTtlMs !== undefined) aiProxyOptions.cacheTtlMs = options.cacheTtlMs;
  if (options.logger !== undefined) aiProxyOptions.logger = options.logger;

  app.use('/api/ai-proxy', createAiProxyRouter(aiProxyOptions));

  app.use('/api/auth', createDevAuthRouter());
  
  // Dashboard数据API
  app.use('/api/dashboard', dashboardRouter);
  
  // 静态数据文件访问（开发用）
  app.use('/data', express.static('data'));
  
  // API文档/信息
  app.get('/api', (req, res) => {
    res.json({
      name: 'Procurement Analysis Dashboard API',
      version: '3.0.0',
      endpoints: [
        { path: '/api/health', desc: '健康检查' },
        { path: '/api/auth/dev-token', desc: '内网演示用 JWT（需 ALLOW_DEV_TOKEN）' },
        { path: '/api/ai-proxy/health', desc: 'AI 代理健康检查' },
        { path: '/api/ai-proxy/chat', desc: 'AI对话（规则引擎+LLM）' },
        { path: '/api/ai-proxy/rules', desc: '支持的规则列表' },
        { path: '/api/dashboard/kpi-cards', desc: 'KPI数据' },
        { path: '/api/dashboard/alerts', desc: '预警数据' },
        { path: '/api/dashboard/rankings', desc: '组织排名' },
        { path: '/api/dashboard/charts/:id', desc: '图表数据' }
      ]
    });
  });

  return app;
}
