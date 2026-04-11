# 采购驾驶舱AI助手集成设计方案

**版本**: v1.0  
**日期**: 2026-04-11  
**状态**: 待评审  

---

## 1. 概述

### 1.1 背景
采购经营分析驾驶舱已完成Phase 1建设，包含8大功能模块、37个ECharts图表、P0预警系统。当前痛点在于数据展示丰富但缺乏智能解读能力，用户需要培训才能理解复杂图表。

### 1.2 目标
通过Coze Bot API集成智能对话助手，实现：
- **智能问数**：用户用自然语言查询采购数据（"本月降本额是多少"）
- **智能解读**：AI主动分析图表和预警，给出业务建议
- **上下文感知**：AI能感知用户当前查看的页面和选中的数据

### 1.3 范围
**第一阶段（本设计覆盖）**：
- 驾驶舱页面内嵌AI聊天组件
- 支持8大模块、37个图表的问答
- 6条P0预警的智能解读
- 快捷操作按钮预设

**不在第一阶段**：
- 工作流自动化（如自动补货申请）
- 多轮复杂对话（如"对比去年"）
- 移动端独立APP

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户层                                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ 驾驶舱页面        │  │ 企业微信/钉钉     │ (二期)            │
│  │  (index.html)    │  │                  │                   │
│  └────────┬─────────┘  └──────────────────┘                   │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────┐              │
│  │            AI聊天组件 (Web SDK)               │              │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │              │
│  │  │快捷按钮│ │对话窗口│ │输入框  │ │历史记录│  │              │
│  │  └────────┘ └────────┘ └────────┘ └────────┘  │              │
│  └────────┬───────────────────────────────────────┘              │
└───────────┼─────────────────────────────────────────────────────┘
            │
            │ HTTPS
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     后端代理层 (Node.js/Python)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  职责：                                                    │  │
│  │  1. 转发Coze API请求 (保护API Key)                         │  │
│  │  2. 注入驾驶舱上下文数据                                   │  │
│  │  3. 请求/响应日志记录                                      │  │
│  │  4. 限流与缓存                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ HTTPS
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Coze平台层                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │     Bot API          │    │        知识库 (RAG)          │  │
│  │  - 对话管理           │    │  ┌────────────────────────┐  │  │
│  │  - 意图识别           │    │  │ 图表解读文档 (37个)    │  │  │
│  │  - 响应生成           │    │  │ P0预警规则 (6条)       │  │  │
│  │  - 插件调用           │    │  │ KPI指标词典 (10个)     │  │  │
│  └──────────────────────┘    │ │ 业务规则文档           │  │  │
│                              │ └────────────────────────┘  │  │
│                              └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 组件职责

| 组件 | 职责 | 技术选型 |
|------|------|---------|
| AI聊天组件 | 渲染对话UI、处理用户输入、展示AI回复 | Coze Web SDK + 自定义CSS |
| 后端代理 | API转发、密钥管理、数据注入、日志 | Node.js Express / Python FastAPI |
| Coze Bot | 自然语言处理、意图识别、知识库检索 | Coze平台配置 |
| 知识库 | 存储业务知识，支持RAG检索 | Coze知识库 + Markdown文档 |

---

## 3. 详细设计

### 3.1 前端集成设计

#### 3.1.1 页面嵌入位置

在`index.html`右下角添加悬浮AI助手组件，尺寸：380×500px，支持收起/展开。

```html
<!-- AI助手容器 -->
<div id="ai-assistant-widget" class="ai-widget collapsed">
  <div class="widget-header">
    <span class="title">
      <svg class="icon-ai" viewBox="0 0 24 24">...</svg>
      AI采购助手
    </span>
    <button class="btn-toggle" onclick="toggleWidget()">−</button>
  </div>
  
  <div class="widget-body" id="coze-chat-container"></div>
  
  <div class="quick-actions">
    <button class="quick-btn" onclick="quickAsk('本月降本情况')">本月降本</button>
    <button class="quick-btn" onclick="quickAsk('P0预警解读')">预警解读</button>
    <button class="quick-btn" onclick="quickAsk('当前图表分析')">分析图表</button>
    <button class="quick-btn" onclick="quickAsk('供应商绩效')">供应商</button>
  </div>
</div>
```

#### 3.1.2 样式规范（匹配驾驶舱设计系统）

```css
/* 颜色变量（继承驾驶舱） */
:root {
  --ai-primary: #38bdf8;        /* Cyan - 主色调 */
  --ai-secondary: #f59e0b;       /* Gold - 辅助色 */
  --ai-success: #10b981;         /* Green - 成功 */
  --ai-danger: #ef4444;          /* Red - 危险 */
  --ai-bg-dark: #0a0e1a;        /* 背景色 */
  --ai-bg-card: rgba(17,24,39,0.95);
  --ai-border: rgba(56,189,248,0.3);
}

/* 组件样式 */
.ai-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  height: 500px;
  background: var(--ai-bg-card);
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(56,189,248,0.2);
  z-index: 1000;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.ai-widget.collapsed {
  height: 48px;
  width: 160px;
}

.widget-header {
  background: linear-gradient(135deg, #0a0e1a 0%, #1a2332 100%);
  color: var(--ai-primary);
  padding: 12px 16px;
  border-bottom: 1px solid var(--ai-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px 12px 0 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--ai-border);
}

.quick-btn {
  background: rgba(56,189,248,0.15);
  border: 1px solid var(--ai-border);
  color: var(--ai-primary);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: rgba(56,189,248,0.3);
}
```

#### 3.1.3 Coze Web SDK初始化

```javascript
// ai-assistant.js
class ProcurementAIAssistant {
  constructor(config) {
    this.botId = config.botId;
    this.apiBase = config.apiBase;  // 指向我们的后端代理，而非直接Coze
    this.container = document.getElementById(config.containerId);
    this.currentContext = {};
    this.init();
  }

  init() {
    // 初始化Coze Web SDK
    this.cozeClient = new CozeWebSDK.CozeChat({
      bot_id: this.botId,
      container: this.container,
      api_base: this.apiBase,
      auth_type: 'jwt',
      
      // 消息发送前回调 - 注入上下文
      onBeforeSend: (message) => {
        message.metadata = this.collectContext();
        return message;
      },
      
      // 接收消息回调 - 处理特殊指令
      onMessage: (message) => {
        this.handleAIResponse(message);
      }
    });
  }

  // 收集当前驾驶舱上下文
  collectContext() {
    const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab || 'home';
    const activeModule = this.getModuleName(activeTab);
    
    return {
      // 基础信息
      timestamp: new Date().toISOString(),
      user_role: 'procurement_manager',  // 可扩展不同角色视图
      
      // 页面状态
      active_module: activeModule,
      active_tab: activeTab,
      selected_date_range: this.getCurrentDateRange(),
      
      // 数据状态（从驾驶舱全局变量获取）
      current_kpis: window.dashboardData?.[activeTab]?.kpis || {},
      visible_charts: this.getVisibleCharts(activeTab),
      p0_alerts: window.alertsData || [],
      selected_dimension: this.getSelectedDimension(),
      
      // 用户可能选中的特定数据
      selected_supplier: window.selectedSupplier || null,
      selected_category: window.selectedCategory || null,
      highlighted_metric: window.highlightedMetric || null
    };
  }

  getModuleName(tab) {
    const map = {
      'home': '首页驾驶舱',
      'tab1': '降本分析',
      'tab2': '支出分析',
      'tab3': '价格趋势分析',
      'tab4': '需求趋势分析',
      'tab5': '材料成本率',
      'tab6': '其他降本机会',
      'tab7': '供应源分析'
    };
    return map[tab] || '未知模块';
  }

  getVisibleCharts(tab) {
    // 返回当前Tab可见的图表ID列表
    const chartMap = {
      'tab1': ['chartMonthlySavings', 'chartBuSavings', 'chartMroSavings'],
      'tab2': ['chartCoreSpend', 'chartPriceDeviation', 'chartVMI'],
      // ... 其他模块
    };
    return chartMap[tab] || [];
  }

  // 快捷提问
  quickAsk(question) {
    const context = this.collectContext();
    
    // 根据问题类型增强上下文
    if (question.includes('降本')) {
      context.focus_metric = 'savings';
    } else if (question.includes('预警')) {
      context.focus_metric = 'alerts';
    }
    
    this.cozeClient.sendMessage({
      content: question,
      metadata: context
    });
  }

  // 处理AI特殊响应（如导航指令）
  handleAIResponse(message) {
    // 如果AI建议跳转到某个Tab，执行切换
    if (message.metadata?.suggested_tab) {
      this.switchTab(message.metadata.suggested_tab);
    }
    
    // 如果AI要求高亮某个图表
    if (message.metadata?.highlight_chart) {
      this.highlightChart(message.metadata.highlight_chart);
    }
  }
}

// 初始化
const aiAssistant = new ProcurementAIAssistant({
  botId: 'YOUR_BOT_ID',
  apiBase: '/api/ai-proxy',  // 我们的后端代理
  containerId: 'coze-chat-container'
});

// 全局快捷提问函数
function quickAsk(question) {
  aiAssistant.quickAsk(question);
}

function toggleWidget() {
  document.getElementById('ai-assistant-widget').classList.toggle('collapsed');
}
```

### 3.2 后端代理设计

#### 3.2.1 API端点

```
POST /api/ai-proxy/chat
Content-Type: application/json
Authorization: Bearer <user_jwt>

{
  "message": "本月降本额是多少",
  "metadata": {
    "active_module": "降本分析",
    "current_kpis": {...},
    "visible_charts": [...]
  }
}
```

#### 3.2.2 代理服务代码（Node.js示例）

```javascript
// server.js - Express后端代理
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();

// Coze配置（环境变量存储）
const COZE_API_KEY = process.env.COZE_API_KEY;
const COZE_BOT_ID = process.env.COZE_BOT_ID;
const COZE_API_BASE = 'https://api.coze.cn/v1';

// JWT验证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// AI对话代理端点
app.post('/api/ai-proxy/chat', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  const { message, metadata } = req.body;
  
  try {
    // 1. 构造系统消息（注入上下文）
    const systemMessage = buildSystemMessage(metadata);
    
    // 2. 转发到Coze API
    const cozeResponse = await axios.post(
      `${COZE_API_BASE}/chat/completions`,
      {
        bot_id: COZE_BOT_ID,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        stream: false,
        additional_messages: [  // Coze支持的多轮上下文
          // 可添加历史消息
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000  // 10秒超时
      }
    );
    
    // 3. 记录日志
    logger.info({
      event: 'ai_chat',
      user: req.user.id,
      question: message,
      module: metadata.active_module,
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
    // 4. 返回给前端
    res.json({
      success: true,
      data: cozeResponse.data,
      latency: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error({
      event: 'ai_chat_error',
      error: error.message,
      user: req.user.id,
      question: message
    });
    
    res.status(500).json({
      success: false,
      error: 'AI服务暂时不可用，请稍后重试'
    });
  }
});

// 构造系统消息（注入驾驶舱上下文）
function buildSystemMessage(context) {
  return `
你是采购经营分析驾驶舱的AI助手，负责帮助用户理解采购数据、分析业务情况。

## 当前页面状态
- 用户当前所在模块：${context.active_module}
- 数据时间范围：${context.selected_date_range || '未指定'}
- 当前维度：${context.selected_dimension || '品类'}

## 当前页面数据
${JSON.stringify(context.current_kpis, null, 2)}

## P0预警状态
${JSON.stringify(context.p0_alerts, null, 2)}

## 回答规则
1. 金额单位统一为"万元"，保留2位小数
2. 百分比保留1位小数
3. 必须注明数据来源（如"来自降本分析模块"）
4. 如果涉及预警，说明预警级别和处置建议
5. 不确定时回复："该数据在当前视图不可见，请切换到[正确模块]查看"
6. 用中文回答，保持专业但友好的语气

## 可用图表
用户当前页面可见的图表：${context.visible_charts?.join(', ')}
`;
}

// 健康检查端点
app.get('/api/ai-proxy/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log('AI Proxy Server running on port 3000');
});
```

### 3.3 Coze Bot配置

#### 3.3.1 Bot基础配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Bot名称 | 采购分析AI助手 | |
| 头像 | 建议用Cyan色系的机器人图标 | 匹配驾驶舱主题 |
| 人设 | 采购数据分析专家 | |

#### 3.3.2 系统提示词（Persona）

```markdown
# 角色
你是采购经营分析驾驶舱的智能AI助手，专注于帮助采购总监和业务人员理解数据、发现问题、做出决策。

# 核心能力
1. **数据查询**：回答采购额、降本额、库存、供应商绩效等指标
2. **图表解读**：解释当前页面图表的含义和趋势
3. **预警分析**：解读P0预警，给出处置建议
4. **业务建议**：基于数据给出采购策略建议

# 回答规范

## 格式规范
- 金额单位：统一使用"万元"，保留2位小数（如"1,234.56万元"）
- 百分比：保留1位小数（如"12.5%"）
- 日期格式：YYYY-MM-DD
- 数据来源：必须注明来自哪个模块（如"根据支出分析模块数据"）

## 内容规范
- 回答前先确认用户所在的模块和数据范围
- 涉及多个指标时，用表格或列表呈现
- 涉及预警时，说明：预警级别（高危/中危/正常）、触发原因、建议措施
- 不确定或数据缺失时，明确告知"当前视图无法获取该数据，建议切换到XX模块"

## 语气规范
- 专业、简洁、友好
- 避免使用"根据数据显示"等套话
- 直接给出结论，必要时补充解释

# 知识范围

## 8大模块
1. 首页驾驶舱：10个KPI、6条P0预警、事业部/子公司排名
2. 降本分析：月度追踪、事业部对比、七大品类、非生产品类
3. 支出分析：核心品类分布、价格偏差、VMI覆盖、TCO分析
4. 价格趋势：市场价格、期货价格、宏观指标、锁价建议
5. 需求趋势：库存消耗、库存健康度、未来4周预测
6. 材料成本率：成本率明细、趋势对比、事业部对比
7. 其他降本：长尾供应商、分散分析、整合机会
8. 供应源分析：供应商绩效、交付及时率、单一供应风险

## 6条P0预警规则
- AL_PRICE_001：价格偏离度 >5%（高危）/ >8%（中危）
- AL_SPEND_001：预算执行偏离 >10pp
- AL_SPEND_002：支出突增 YoY>25% 或 MoM>20%
- AL_SUPPLIER_002：交付及时率 <95%（中危）/ <92%（高危）
- AL_SUPPLIER_003：单一供应风险（年采购>500万）
- AL_INVENTORY_003：缺货风险 <15天（中危）/ <10天（高危）

## 10个核心KPI
1. 年度采购额
2. 降本额
3. 降本比例
4. 预测降本
5. 预算执行率
6. 材料成本率
7. 供应商绩效
8. 交付及时率
9. VMI覆盖率
10. 长约占比
```

### 3.4 知识库（RAG）设计

#### 3.4.1 文档结构

```
knowledge-base/
├── 00-index.md                 # 知识库索引和使用指南
├── 01-kpi-dictionary/          # KPI指标词典
│   ├── 01-annual-procurement.md
│   ├── 02-savings-amount.md
│   ├── 03-savings-ratio.md
│   ├── 04-forecast-savings.md
│   ├── 05-budget-execution.md
│   ├── 06-material-cost-rate.md
│   ├── 07-supplier-performance.md
│   ├── 08-delivery-rate.md
│   ├── 09-vmi-coverage.md
│   └── 10-long-contract-ratio.md
├── 02-chart-interpretation/    # 37个图表解读
│   ├── module1-cost-savings/   # 降本分析模块
│   │   ├── chartMonthlySavings.md
│   │   ├── chartBuSavings.md
│   │   └── ...
│   ├── module2-spend-analysis/ # 支出分析模块
│   ├── module3-price-trend/    # 价格趋势模块
│   ├── module4-demand-trend/   # 需求趋势模块
│   ├── module5-material-cost/  # 材料成本率模块
│   ├── module6-other-savings/  # 其他降本模块
│   └── module7-supplier/       # 供应源分析模块
├── 03-alert-rules/             # 预警规则
│   ├── AL_PRICE_001.md
│   ├── AL_SPEND_001.md
│   ├── AL_SPEND_002.md
│   ├── AL_SUPPLIER_002.md
│   ├── AL_SUPPLIER_003.md
│   └── AL_INVENTORY_003.md
├── 04-business-logic/          # 业务规则
│   ├── cost-calculation.md     # 成本计算口径
│   ├── supplier-evaluation.md  # 供应商评估规则
│   └── savings-recognition.md  # 降本认定标准
└── 05-faq/                     # 高频问答
    ├── top50-questions.md
    └── department-specific/    # 各事业部专属问题
```

#### 3.4.2 示例文档：chartMonthlySavings.md

```markdown
# 图表：月度降本追踪 (chartMonthlySavings)

## 基本信息
- **所属模块**：降本分析 (Tab 1)
- **图表类型**：柱状图 + 折线图组合
- **数据维度**：时间（月份）

## 图表构成
- **蓝色柱状图**：实际降本额（万元）
- **橙色柱状图**：预算降本额（万元）
- **绿色折线**：达成率（%）

## 如何解读
1. **整体趋势**：柱状图高度反映降本规模，对比蓝色和橙色判断是否达成预算
2. **达成情况**：绿色折线>100%表示超额完成，<100%表示未达标
3. **重点关注**：连续2个月达成率<90%需要预警

## 常见问题

Q: "本月降本达成率是多少？"
A: 查看图表最右侧月份的绿色折线数值，格式如"108.5%"

Q: "为什么某个月实际降本比预算低很多？"
A: 可能原因：
- 采购量下降（需求减少）
- 市场价格反弹（降价空间收窄）
- 长约到期重新谈判

## 数据口径
- 实际降本 = (上期采购单价 - 本期采购单价) × 本期采购量
- 预算降本 = 年度预算按月分摊
- 达成率 = 实际降本 / 预算降本 × 100%

## 关联指标
- 相关图表：chartBuSavings（事业部降本对比）
- 相关KPI：降本额、降本比例、达成率
```

#### 3.4.3 示例文档：AL_PRICE_001.md

```markdown
# 预警规则：AL_PRICE_001 价格偏离度

## 预警名称
价格偏离度异常

## 触发条件
- **高危**：采购价偏离市场价 > +8%（买贵了）或 < -8%（异常低价）
- **中危**：采购价偏离市场价 > +5% 或 < -5%
- **正常**：偏离度在 ±5% 以内

## 计算公式
价格偏离度 = (实际采购价 - 市场公允价) / 市场公允价 × 100%

## 当前示例
- **品类**：钢材
- **偏离度**：+5.8%
- **级别**：高危
- **含义**：当前钢材采购价比市场公允价高出5.8%，存在优化空间

## 处置建议
1. **立即行动**：联系供应商重新谈判价格
2. **中期措施**：启动询比价流程，引入竞争
3. **长期措施**：评估长约锁价的必要性

## 相关数据
- 市场价格来源：XX钢铁网日均价
- 更新频率：每日
- 责任部门：采购一部（钢材品类）
```

---

## 4. 数据流设计

### 4.1 正常对话流程

```
用户提问
    │
    ▼
┌────────────────────────────────────────────────────────────┐
│ 1. 前端收集上下文                                          │
│    - 当前Tab、选中维度、可见图表                           │
│    - KPI数据、预警数据                                     │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 2. 发送到后端代理                                          │
│    POST /api/ai-proxy/chat                                 │
│    { message, metadata: {...} }                            │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 3. 后端构造系统消息                                          │
│    将metadata格式化为系统提示词                            │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 4. 转发到Coze API                                          │
│    - 携带系统消息和用户问题                                │
│    - 触发RAG检索知识库                                     │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Coze处理                                                │
│    - 意图识别                                              │
│    - 知识库检索                                            │
│    - 生成回答                                              │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 6. 返回给前端                                              │
│    - 展示AI回答                                            │
│    - 可选：执行页面操作（如跳转Tab、高亮图表）             │
└────────────────────────────────────────────────────────────┘
```

### 4.2 快捷提问流程

```
用户点击"本月降本"快捷按钮
    │
    ▼
前端直接发送预设问题 + 当前上下文
    │
    ▼
...（后续同正常对话流程）
```

---

## 5. API接口规范

### 5.1 前端→后端代理

#### POST /api/ai-proxy/chat

**请求**：
```json
{
  "message": "本月降本情况如何",
  "metadata": {
    "active_module": "降本分析",
    "active_tab": "tab1",
    "selected_date_range": "2024-Q1",
    "current_kpis": {
      "annual_procurement": 12580.5,
      "savings_amount": 892.3,
      "savings_ratio": 12.5
    },
    "p0_alerts": [
      { "id": "AL_PRICE_001", "level": "high", "message": "..." }
    ],
    "visible_charts": ["chartMonthlySavings", "chartBuSavings"],
    "selected_dimension": "category"
  }
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "根据降本分析模块数据，本月（2024年3月）降本情况如下：\n\n**实际降本额：156.8万元**\n**预算降本额：145.0万元**\n**达成率：108.1%**\n\n本月超额完成预算，主要得益于：\n1. 钢材品类谈判取得5.8%降幅\n2. 新能源事业部集中采购效应\n\n建议关注：塑料粒子品类降本进度滞后（达成率仅85%）",
      "metadata": {
        "sources": ["chartMonthlySavings", "kpi_savings"],
        "suggested_actions": []
      }
    }
  },
  "latency": 1250
}
```

### 5.2 错误处理

| 错误场景 | HTTP状态码 | 前端处理 |
|---------|-----------|---------|
| 用户未登录 | 401 | 跳转登录页 |
| 无权限 | 403 | 提示联系管理员 |
| Coze服务异常 | 502 | 提示"AI服务暂时不可用" |
| 请求超时 | 504 | 提示"请求超时，请重试" |
| 参数错误 | 400 | 提示"请求参数错误" |

---

## 6. 实施计划

### 6.1 里程碑

| 里程碑 | 时间 | 交付物 | 验收标准 |
|--------|------|--------|---------|
| M1：环境准备 | W1 | Coze Bot配置、后端代理框架 | Bot可响应测试消息 |
| M2：知识库 | W2-W3 | 50篇知识库文档 | 文档评审通过 |
| M3：前端集成 | W3-W4 | 聊天组件嵌入驾驶舱 | UI匹配设计规范 |
| M4：联调测试 | W5 | 端到端测试报告 | 50个高频问题准确率>85% |
| M5：灰度上线 | W6 | 上线报告 | 10名用户试用无阻塞问题 |
| M6：正式发布 | W7 | 正式发布 | 全员可用 |

### 6.2 任务分解

**Week 1: 环境准备**
- [ ] 注册Coze企业版账号
- [ ] 创建Bot并配置基础人设
- [ ] 搭建后端代理框架（Node.js/Python）
- [ ] 配置API Key环境变量
- [ ] 部署测试环境

**Week 2-3: 知识库建设**
- [ ] 编写10个KPI指标文档
- [ ] 编写37个图表解读文档（优先级：首页>降本>支出>价格>其他）
- [ ] 编写6条P0预警规则文档
- [ ] 编写业务规则文档
- [ ] 整理50个高频Q&A
- [ ] 上传至Coze知识库并测试检索

**Week 3-4: 前端开发**
- [ ] 创建AI聊天组件HTML/CSS
- [ ] 集成Coze Web SDK
- [ ] 实现上下文收集功能
- [ ] 添加快捷操作按钮
- [ ] 实现收起/展开动画
- [ ] 样式适配深色科技风

**Week 5: 联调测试**
- [ ] 前后端API对接
- [ ] 上下文注入测试
- [ ] 50个高频问题测试
- [ ] 性能测试（响应时间<2s）
- [ ] 安全测试（API Key保护）

**Week 6: 灰度上线**
- [ ] 部署到预发布环境
- [ ] 10名种子用户试用
- [ ] 收集反馈并修复问题
- [ ] 知识库补充调优

**Week 7: 正式发布**
- [ ] 生产环境部署
- [ ] 全员培训（操作手册）
- [ ] 正式上线
- [ ] 监控和反馈收集

### 6.3 资源需求

| 资源 | 数量 | 说明 |
|------|------|------|
| Coze企业版 | 1个 | 支持知识库和API调用 |
| 后端服务器 | 1台 | 运行代理服务（2C4G足够） |
| 开发人力 | 2人 | 前端1人 + 后端1人 |
| 业务专家 | 1人 | 运营经理，负责知识库内容 |
| 测试人力 | 1人 | 负责QA和UAT |

---

## 7. 风险评估与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|---------|
| Coze API响应慢 | 中 | 高 | 添加加载动画；设置超时降级（返回"思考中"提示）；本地缓存高频回答 |
| 知识库覆盖不全 | 高 | 中 | 建立反馈机制，用户可标记"未解决问题"；每周迭代补充知识库 |
| API Key泄露 | 低 | 高 | 必须通过后端代理，禁止前端直连；定期轮换Key；监控异常调用 |
| 与驾驶舱样式冲突 | 中 | 低 | 严格遵循CSS变量规范；充分测试各Tab下的显示效果 |
| 用户不接受AI回答 | 中 | 中 | 添加"有用/无用"反馈按钮；保留"联系人工"入口；持续优化回答质量 |

---

## 8. 成功指标

### 8.1 技术指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| API响应时间 | P95 < 2秒 | 后端日志 |
| 服务可用性 | > 99.5% | 健康检查 |
| 错误率 | < 1% | 错误日志 |

### 8.2 业务指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 问题回答准确率 | > 85% | 用户反馈+抽样评测 |
| 用户满意度 | > 4.0/5.0 | 每次对话后评分 |
| 周活跃用户 | > 60% | 使用日志统计 |
| 高频问题覆盖率 | > 90% | 对话日志分析 |
| 晨会准备时间 | 缩短50% | 用户调研 |

---

## 9. 附录

### 9.1 术语表

| 术语 | 说明 |
|------|------|
| Coze | 字节跳动旗下的AI Bot开发平台 |
| Bot | 智能对话机器人 |
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| Web SDK | 用于Web端集成的软件开发工具包 |
| KPI | Key Performance Indicator，关键绩效指标 |
| P0预警 | 最高优先级预警（来自驾驶舱预警系统） |

### 9.2 参考文档

- [Coze官方文档](https://www.coze.cn/docs)
- [Coze Web SDK指南](https://www.coze.cn/docs/developer_tools/web_sdk)
- [驾驶舱Phase 1 PRD](./dashboard-phase1-prd.md)
- [驾驶舱AGENTS.md](../../AGENTS.md)

### 9.3 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-04-11 | 初始版本 | IT经理 |

---

**评审状态**: 待评审  
**下次评审日期**: 2026-04-15  
**文档负责人**: IT经理
