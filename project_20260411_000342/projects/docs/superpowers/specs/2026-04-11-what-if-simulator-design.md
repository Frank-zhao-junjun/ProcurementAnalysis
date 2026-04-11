# What-if 模拟引擎设计方案

**版本**: v0.1  
**日期**: 2026-04-11  
**状态**: 方案已确认，待评审后进入实施计划  
**适用范围**: 采购经营分析驾驶舱 Phase 1 原生 HTML/CSS/JavaScript 大屏

---

## 1. 概述

### 1.1 背景

当前驾驶舱已经具备支出分析、价格趋势、供应商分析等经营看板能力，但仍偏向“看结果”。对客户演示而言，缺少一个能够直接回答“如果我把参数调一下，会发生什么”的交互式模拟能力。

What-if 模拟引擎的目标不是替代 BI 图表，也不是在第一阶段引入复杂预测模型，而是补齐以下缺口：

- 让用户在页面内直接调整关键参数并得到即时结果
- 让模拟结果可解释、可追溯、可演示
- 让计算逻辑不依赖第三方 AI 服务即可工作
- 为后续多场景扩展和 Coze 接入预留稳定边界

### 1.2 目标

本方案要实现以下目标：

1. 在 `Tab 2 支出分析` 内新增 What-if 模拟区域。
2. MVP 仅支持 `采购比例调整` 一个场景。
3. 计算在前端本地完成，保证即时响应与可控性。
4. AI 解释层采用可插拔架构，MVP 默认使用本地模板解释。
5. 模拟结果以统一结构化契约输出，供 UI 和解释层复用。
6. 后续可平滑扩展到 `供应商份额调整`、`锁价策略`、`VMI 转换` 等场景。

### 1.3 范围

**本阶段覆盖**

- `Tab 2 支出分析` 新增模拟卡片
- 单场景 `采购比例调整`
- `滑块 + 数字输入框` 参数交互
- 本地公式计算、风险规则、结果卡片、敏感性分析
- 本地模板解释器
- AI Provider 抽象接口预留

**本阶段不覆盖**

- 多场景切换 UI
- 真实 Coze/LLM 联网解释
- 历史训练模型与时间序列预测
- 跨 tab 联动写回
- 审批流、寻源流程、自动下单等写操作

---

## 2. 设计原则

### 2.1 计算与 AI 分离

所有金额、比例、敏感性、风险判断的基础运算均在本地 JavaScript 完成。AI 只负责解释结果和给出建议，不参与公式运算。

### 2.2 先结果后解释

用户点击“运行模拟”后，应先看到结构化计算结果，再异步补充解释文本。解释失败不得影响结果展示。

### 2.3 单场景 MVP，统一架构预留

MVP 只交付一个高价值场景，但底层采用统一注册表、统一结果契约和统一解释接口，避免后续扩展时推翻重做。

### 2.4 公式、规则、格式化分层

公式计算、风险规则和展示格式化必须拆分，避免业务判断散落在 UI 或 prompt 里。

### 2.5 输入受控与校验优先

参数输入必须有范围、步长和校验规则，避免出现无意义结果或页面异常。

---

## 3. 方案选型

### 3.1 备选方案

| 方案 | 描述 | 优点 | 缺点 | 结论 |
|---|---|---|---|---|
| A 最小嵌入方案 | 把公式和渲染逻辑直接写进 `index.html` 页面脚本 | 开发最快 | 扩展性差，第二个场景开始快速耦合 | 不选 |
| B 折中方案 | UI 仍挂现有页面，但计算、场景注册、解释层拆为独立 JS 模块 | 兼顾速度与扩展性 | 需要额外抽象 4 到 6 个模块 | **选中** |
| C 平台化方案 | 先做完整场景框架与 Provider 层，再回填 UI | 架构最完整 | MVP 成本过高 | 不选 |

### 3.2 选型结论

采用 **方案 B：折中方案**。

原因如下：

- 与当前原生静态项目结构兼容，不需要引入新框架
- 可以复用现有 `assets/js/ai` 的模块化写法
- 能在 1 到 2 天内完成 MVP
- 为第二阶段接入 Coze 和扩场景保留边界

---

## 4. 整体架构

### 4.1 高层架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户交互层                            │
│  Tab 2 支出分析新增 What-if 模拟卡片                     │
│  - 场景标题与说明                                        │
│  - 滑块 + 数字输入框                                     │
│  - 运行模拟按钮                                          │
│  - 结果卡片 / 敏感性区间 / 解释区                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              What-if 模拟引擎（本地 JavaScript）         │
│  1. 场景注册表                                           │
│  2. 参数校验                                             │
│  3. 纯计算引擎                                           │
│  4. 风险规则评估                                         │
│  5. 结果格式化                                           │
└─────────────────────┬───────────────────────────────────┘
                      │ 标准化 SimulationResult
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  解释层（可插拔）                        │
│  MVP: Template Explainer                                │
│  Phase 2: Coze / 其他 Provider Adapter                  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 关键解耦点

| 解耦点 | 实现方式 | 收益 |
|---|---|---|
| 计算与 AI 解耦 | 纯本地模拟引擎 + 独立解释器接口 | 结果可控，AI 可替换 |
| 业务规则与公式解耦 | `risk-rules.js` 独立判断 | 避免把风险逻辑写死在公式里 |
| UI 与业务解耦 | `whatif-panel.js` 只做编排和渲染 | 页面逻辑更清晰 |
| 数据快照与实时页面解耦 | 运行时拍一次 baseline snapshot | 保证一次模拟的数据一致性 |
| Provider 与解释逻辑解耦 | `generateExplanation(result)` 统一接口 | Coze 接入不改计算链路 |

---

## 5. 目录结构建议

基于当前项目已有 `assets/js/ai/*.js` 的组织方式，新增 What-if 目录：

```text
project_20260411_000342/projects/
├── index.html
├── styles/main.css
└── assets/
    └── js/
        ├── ai/
        │   ├── assistant-shell.js
        │   ├── context-bridge.js
        │   ├── privacy-gate.js
        │   └── state-bus.js
        └── whatif/
            ├── scenario-registry.js
            ├── simulation-engine.js
            ├── risk-rules.js
            ├── formatter.js
            ├── whatif-panel.js
            └── explainers/
                ├── template-explainer.js
                └── ai-explainer.js
```

设计约束：

- 不新增构建工具，不引入 React/Vue
- 使用原生 ES Modules
- 允许在 `index.html` 中按模块顺序引入脚本

---

## 6. 页面集成设计

### 6.1 落点

What-if 模拟区首发放在 `Tab 2 支出分析` 中，定位为“支出结构优化模拟器”。

原因：

- `采购比例调整` 本质是支出结构调整问题
- 与现有 `价格偏差度分析`、`长约占比分析`、`TCO 成本构成` 语义一致
- 不需要改首页信息架构，也不需要新增导航

### 6.2 UI 结构

建议在 `Tab 2` 下新增一个整宽卡片，内部采用左右布局：

- 左侧参数区
  - 场景标题
  - 场景说明
  - 参数控件
  - 运行按钮
- 右侧结果区
  - 当前成本卡
  - 调整后成本卡
  - 节约结果卡
  - 敏感性区间
  - 风险提示
  - 解释区

### 6.3 参数控件

MVP 仅保留 5 个参数：

1. `currentSpotRatio` 当前现货比例
2. `targetSpotRatio` 目标现货比例
3. `currentSpotPrice` 当前现货价
4. `contractPrice` 长约价
5. `monthlyVolume` 月用量

交互形式：

- 比例类参数：滑块 + 数字输入框联动
- 价格与用量：数字输入框
- 运行方式：点击按钮触发，不在拖动时自动实时计算

选择“点击运行”而非“拖动即算”的原因：

- 避免连续输入造成解释层抖动
- 保证每次结果都有明确基线和时间点
- 更符合晨会演示节奏

---

## 7. 核心模块设计

### 7.1 场景注册表 `scenario-registry.js`

作用：集中维护场景元数据、默认参数、参数范围、调用入口。

建议结构：

```javascript
export const SCENARIO_REGISTRY = {
  purchaseRatio: {
    id: 'purchase_ratio',
    title: '采购比例调整',
    description: '模拟调整现货与长约采购比例后的成本变化',
    defaultParams: {
      currentSpotRatio: 0.6,
      targetSpotRatio: 0.3,
      currentSpotPrice: 5200,
      contractPrice: 4800,
      monthlyVolume: 10000
    },
    limits: {
      currentSpotRatio: { min: 0, max: 1, step: 0.05 },
      targetSpotRatio: { min: 0, max: 1, step: 0.05 },
      currentSpotPrice: { min: 0, max: 20000, step: 10 },
      contractPrice: { min: 0, max: 20000, step: 10 },
      monthlyVolume: { min: 0, max: 1000000, step: 100 }
    },
    engineMethod: 'calculatePurchaseRatioChange'
  }
};
```

约束：UI 不直接拼方法名，不使用 `engine[scenarioType]` 形式执行未登记场景。

### 7.2 模拟引擎 `simulation-engine.js`

职责：

- 接收 baseline snapshot 和 params
- 完成纯数学运算
- 不直接输出中文文案
- 不操作 DOM
- 不依赖任何 AI Provider

建议接口：

```javascript
class WhatIfEngine {
  constructor(baselineSnapshot = {}) {
    this.baselineSnapshot = baselineSnapshot;
  }

  calculatePurchaseRatioChange(params) {
    // pure calculation only
  }
}
```

### 7.3 风险规则 `risk-rules.js`

职责：

- 对计算结果和输入参数做业务规则判断
- 输出结构化风险项，而不是直接拼自然语言段落

建议输出：

```javascript
[
  {
    code: 'LOW_SPOT_RATIO',
    level: 'medium',
    message: '现货比例过低可能导致交付灵活性下降'
  }
]
```

### 7.4 格式化层 `formatter.js`

职责：

- 元转万元
- 百分比保留位数
- 敏感性区间统一输出
- UI 需要展示的标签化格式转化

原则：

- 计算引擎保持数值原始语义
- 展示前统一格式化，避免各处重复 `Math.round` 或 `toFixed`

### 7.5 解释层

#### 7.5.1 模板解释器 `template-explainer.js`

MVP 默认实现，输入 `SimulationResult`，输出固定四段：

1. 结论
2. 数据解读
3. 风险提示
4. 执行建议

模板解释器必须满足：

- 不依赖网络
- 不编造结果对象中不存在的数据
- 输出稳定可预测

#### 7.5.2 AI 解释器 `ai-explainer.js`

为第二阶段预留统一接口：

```javascript
class WhatIfAIExplainer {
  constructor(provider) {
    this.provider = provider;
  }

  async explain(result) {
    return this.provider.generateExplanation(result);
  }
}
```

MVP 不默认调用外部 AI，但必须预留接口，避免后续侵入式改造。

### 7.6 页面编排器 `whatif-panel.js`

职责：

- 从场景注册表读取默认值
- 绑定参数控件
- 执行参数校验
- 调用计算引擎
- 渲染结果卡和解释区
- 控制解释层的异步状态和降级

约束：

- 不在页面多个区域散落监听器
- 所有模拟行为统一从该模块进入

---

## 8. 数据契约

### 8.1 标准 SimulationResult

第一版起即统一使用以下结构：

```javascript
{
  scenarioId: 'purchase_ratio',
  scenarioName: '采购比例调整',
  inputs: {
    currentSpotRatio: 0.6,
    targetSpotRatio: 0.3,
    currentSpotPrice: 5200,
    contractPrice: 4800,
    monthlyVolume: 10000
  },
  metrics: {
    currentMonthlyCostWan: 3120,
    targetMonthlyCostWan: 3000,
    monthlySavingWan: 120,
    quarterlySavingWan: 360,
    savingPercent: 3.8
  },
  sensitivity: {
    bestCaseWan: 414,
    baseCaseWan: 360,
    worstCaseWan: 306
  },
  risks: [
    {
      code: 'LOW_SPOT_RATIO',
      level: 'medium',
      message: '现货比例过低可能导致交付灵活性下降'
    }
  ],
  assumptions: [
    '月用量按当前预测不变',
    '长约价在季度内保持稳定'
  ],
  generatedAt: '2026-04-11T11:00:00Z',
  version: 'v1'
}
```

### 8.2 设计要求

- `metrics` 与 `sensitivity` 必须为平级固定字段
- 不允许同时出现 `results.sensitivity` 和顶层 `sensitivity` 这种二义性结构
- 所有解释器都只读取标准契约，不直接读取 UI 控件值

---

## 9. 运行时流程

### 9.1 主流程

```
用户调整参数
  -> whatif-panel 读取当前控件值
  -> scenario-registry 校验参数范围
  -> 生成 baseline snapshot
  -> simulation-engine 执行本地计算
  -> risk-rules 产出风险项
  -> formatter 产出展示数据
  -> UI 立即渲染结果卡
  -> template-explainer 异步生成解释
  -> UI 渲染解释区
```

### 9.2 基线快照要求

点击“运行模拟”时，必须固定一次 baseline snapshot。

原因：

- 防止用户切换图表或模块后解释与结果不一致
- 保证一次模拟全过程使用同一组输入背景
- 为后续日志、埋点和问题排查提供依据

---

## 10. 参数校验与异常处理

### 10.1 参数校验规则

- 比例字段必须在 `0 ~ 1`
- 价格字段必须大于等于 `0`
- 月用量必须大于 `0`
- 若 `targetSpotRatio` 与 `currentSpotRatio` 差异过大，可提示用户确认
- 非数字、空值或越界值不得直接进入计算层

### 10.2 降级策略

| 场景 | 行为 |
|---|---|
| 参数不合法 | 阻止运行，显示字段级错误提示 |
| 计算异常 | 显示“本次模拟失败，请检查参数” |
| 模板解释失败 | 保留结果卡，解释区显示简版说明 |
| 后续 AI Provider 失败 | 回退到模板解释 |

### 10.3 日志与调试建议

MVP 可只记录前端控制台调试信息，但应保留以下结构化字段供后续接后端使用：

- `scenarioId`
- `generatedAt`
- `runDurationMs`
- `degraded`
- `validationErrors`

不记录敏感合同文本，不记录用户自由输入的完整分析结论。

---

## 11. 测试策略

### 11.1 计算层测试

至少覆盖 5 类样例：

1. 基线比例不变，节约应为 0
2. 正常节约场景
3. 目标现货比例过低场景
4. 现货价低于长约价的反向场景
5. 输入非法值场景

### 11.2 UI 测试

- 滑块与数字输入框双向同步
- 点击运行后结果区能稳定刷新
- 连续运行多次不会重复绑定事件
- 参数越界时能提示并阻止计算

### 11.3 解释层测试

- 模板解释能覆盖有风险、无风险、无节约三类结果
- 解释内容只使用结果对象内已有字段
- Provider 失败时能正确回退

---

## 12. 实施建议

### 12.1 MVP 实施顺序

1. 先完成 `simulation-engine.js`、`risk-rules.js`、`formatter.js`
2. 完成 `scenario-registry.js`
3. 在 `Tab 2` 加入模拟卡片骨架
4. 完成 `whatif-panel.js` 的参数绑定与结果渲染
5. 最后接入 `template-explainer.js`

### 12.2 时间估算

- 计算与规则层：0.5 天
- UI 卡片与交互：0.5 天
- 模板解释与联调：0.5 天
- 自测与演示微调：0.5 天

合计：`1 ~ 2 天`

---

## 13. 后续扩展

当 MVP 稳定后，按以下顺序扩展：

1. 增加 `供应商份额调整`
2. 增加 `锁价策略`
3. 增加 `VMI 转换`
4. 将模板解释替换为 Coze Provider
5. 增加结果留存、历史对比和分享能力

扩展原则：

- 新场景必须接入统一注册表
- 新场景必须复用统一结果契约
- AI Provider 替换不得影响计算层与 UI 主流程

---

## 14. 验收标准

满足以下条件可视为 MVP 方案完成：

1. 用户可在 `Tab 2` 中看到模拟卡片。
2. 用户可通过滑块和数字输入框调整参数。
3. 点击运行后 1 秒内出现本地计算结果。
4. 结果包含当前成本、调整后成本、月度节约、季度节约和敏感性区间。
5. 风险提示能根据规则变化。
6. 解释区默认使用模板输出四段式说明。
7. 解释失败不影响结果卡展示。
8. 代码结构符合本方案定义的模块边界。

---

## 15. 结论

本方案采用“单场景 MVP + 可扩展架构”的折中策略：

- 页面上只交付一个客户能立即理解的 `采购比例调整` 场景
- 架构上提前收口 `场景注册`、`结果契约`、`解释接口` 三个关键边界
- 计算留在本地，AI 解释可插拔，保证演示稳定性与后续扩展空间

该方案适合当前驾驶舱项目的技术栈、时间窗口和演示目标，可作为下一步实施计划的基线文档。