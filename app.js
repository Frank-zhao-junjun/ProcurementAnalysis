import express from 'express';
import { attachRequestContext } from './middleware/request-context.js';
import { applySecurity } from './middleware/security.js';
import healthRouter from './routes/health.js';
import aiProxyRouter from './routes/ai-proxy.js';
import dashboardRouter from './routes/dashboard.js';
import { getConfig } from './config.js';

export function createApp(options = {}) {
  const app = express();
  const config = getConfig();

  applySecurity(app);
  app.use(attachRequestContext);
  app.use(express.json());
  
  // 健康检查
  app.use('/api/health', healthRouter);
  
  // AI代理（集成规则引擎 + LLM）
  app.use('/api/ai-proxy', aiProxyRouter);
  
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
