# 采购经营分析大屏 (Procurement Intelligence Dashboard)

## 项目概览
面向采购总监的**周一晨会汇报**专业级数据可视化大屏Demo，涵盖采购经营分析的8大模块（含首页驾驶舱）。采用深色科技风设计，基于ECharts 5.5实现全部图表渲染。

## 技术栈
- **框架**: 原生HTML/CSS/JavaScript (Native Static)
- **图表库**: ECharts 5.5 (CDN)
- **字体**: Inter (UI) + JetBrains Mono (数据)
- **设计风格**: 深色科技风 (Dark Theme, Cyan/Gold/Green/Purple配色体系)
- **响应式**: 固定1920px宽度，适配大屏展示

## 项目结构
```
/workspace/projects/
├── index.html          # 主页面 (1727行，含首页驾驶舱+7个专题Tab+37个ECharts图表)
├── styles/main.css     # 样式文件 (由coze init生成，当前未使用，样式内联在HTML中)
├── AGENTS.md           # 本文件
└── .coze               # 项目配置
```

## 模块架构

### Tab Home: 首页驾驶舱 (总监30秒判断模式)
- **10个核心KPI卡片**: 年度采购额、降本额、降本比例、预测降本、预算执行率、材料成本率、供应商绩效、交付及时率、VMI覆盖率、长约占比
- **6条P0预警面板** (三级severity: 高危红/中危橙/正常绿):
  - AL_PRICE_001: 钢材采购价偏离市场+5.8% (高危)
  - AL_INVENTORY_003: 塑料粒子缺货风险 12.8天 (高危)
  - AL_SPEND_002: 新能源事业部支出突增+28.4% YoY (中危)
  - AL_SUPPLIER_002: 利安德巴塞尔交付率87.2% (中危)
  - AL_SPEND_001: 预算执行率93.6% 正常 (正常)
  - AL_SUPPLIER_003: 独家供应34个SKU 风险可控 (正常)
- **组织排名区**: 事业部降本排名Top4 + 子公司降本排名Top5
- **决策摘要**: 本周重点关注事项(紧急/重要/正常三档)
- **快速下钻入口**: 4个专题页快捷按钮

### Tab 1: 降本分析 (Cost Savings Analysis)
- KPI卡片: 年度采购额、降本额、降本比例、预测降本、预算执行率、达成率
- 月度降本追踪图 (柱状+折线组合: 实际vs预算vs达成率)
- 事业部/子公司降本对比 (横向柱状图)
- 七大品类降本明细表 (含进度条、风险标签)
- 非生产品类降本 (MRO/IT/物流 环形图)
- 采购额趋势 / 降本比例趋势 (面积折线图)
- 全年预测降本 (3个仪表盘: 金额/YoY/比率)

### Tab 2: 支出分析 (Spend Analysis - 降本机会识别)
- KPI: 总支出、价格偏差度、VMI覆盖率、长约占比、供应商集中度、TCO物流成本
- 核心品类支出分布 (Treemap矩形树图 + Top10明细表)
- 市场价格偏差度分析 (柱状图: 各品类偏差% vs 目标阈值线)
- 支出vs市场价格走势对比 (双轴折线图)
- 库存水位vs支出走势 (柱状+折线组合)
- VMI品类占比 (堆叠柱状图)
- 供应商集中度雷达图
- TCO成本构成 (3个环形图: 按品类/事业部/子公司)
- 长约占比分析 (柱状图 + 执行明细表)

### Tab 3: 价格趋势分析 (Price Trend Analysis)
- 实时价格预警Banner (钢材/塑料/化工/汇率)
- 市场价格趋势 (三线面积图: 热轧卷板/PP拉丝/MDI)
- 大宗商品期货价格 (螺纹钢/原油/PP期货)
- 宏观经济指标 (PPI/PMI/CPI/汇率 四线图)
- 历史采购价vs市场公允价 (双轴: 折线+柱状价差)
- 各事业部库存水位 (堆叠柱状图)
- 价格预判与置信区间 (实际+预测+上下界)
- 锁价策略建议卡 (3张策略卡: 钢材/塑料/MDI)
- 智能采购节奏建议 (场景模拟柱状图)

### Tab 4: 需求趋势分析 (Demand Trend)
- KPI: 日均消耗量、库存保有量、周转天数、缺料预警
- 库存消耗量vs保有量 (双轴组合图)
- 各品类库存健康度 (横向柱状图+颜色编码)
- 未来4周需求预测 (三线图)

### Tab 5: 材料成本率 (Material Cost Ratio)
- KPI: 整体成本率、销售额、材料成本、环比变动
- 材料成本率明细表 (按事业部/子公司/产品/材料多维度)
- 成本率趋势图 (集团+各事业部四线对比)
- 各事业部成本率对比 (横向柱状图+目标基准线)

### Tab 6: 其他降本机会 (Other Opportunities)
- KPI: 小额分散供应商数、分散金额、长尾占比、整合机会
- 长尾供应商整合清单Top15 (表格: 品类/金额/方案/节约/优先级)
- 按品类分散供应商分析 (柱状+折线组合)
- 按事业部分散供应商雷达图

### Tab 7: 供应源分析 (Supplier Analysis)
- KPI: 供应商总数、平均绩效、交付及时率、单一供应风险、合规度
- 供应商综合绩效雷达图 (当前得分/目标基准/行业Top10%)
- 绩效指标总览 (4个大数字卡片)
- 绩效-支出匹配度 (柱状+散点组合)
- 供应商过多物料清单 (>5家)
- 单一供应风险物料清单 (高/中/低风险分级)
- 品类供应商行业排名&市占率表

## 图表清单 (共37个ECharts实例)
| 图表ID | 类型 | 所在模块 |
|--------|------|---------|
| chartMonthlySavings | Bar+Line | M1 月度降本 |
| chartBuSavings | HorizontalBar | M1 事业部 |
| chartSubSavings | HorizontalBar | M1 子公司 |
| chartMroSavings | Pie | M1 非生产品类 |
| chartItSavings | Pie | M1 IT |
| chartLogisticsSavings | Pie | M1 物流 |
| chartProcureAmount | AreaLine | M1 采购额趋势 |
| chartSavingRatio | AreaLine | M1 降本比例趋势 |
| chartForecastAmount | Gauge | M1 预测金额 |
| chartForecastYoy | Gauge | M1 YoY |
| chartForecastRatio | Gauge | M1 预测比率 |
| chartCoreSpend | Treemap | M2 核心品类支出 |
| chartPriceDeviation | Bar+MarkLine | M2 价格偏差 |
| chartPriceTrendCompare | DualLine | M2 支出vs市场价 |
| chartInventorySpend | Bar+DualLine | M2 库存vs支出 |
| chartVMI | StackedBar | M2 VMI覆盖率 |
| chartSupplierConc | Radar | M2 供应商集中度 |
| chartTCOCategory | Pie | M2 TCO(品类) |
| chartTCOBu | Pie | M2 TCO(事业部) |
| chartTCOSubsidiary | Pie | M2 TCO(子公司) |
| chartLongContract | Bar | M2 长约占比 |
| chartMarketPriceTrend | TripleAreaLine | M3 市场价格趋势 |
| chartFuturesPrice | MultiLine | M3 期货价格 |
| chartMacroIndicators | QuadDualAxis | M3 宏观指标 |
| chartProcureVsMarket | Line+Bar | M3 采购vs市场 |
| chartInventoryLevel | StackedBar | M3 库存水位BU |
| chartPriceForecast | Line+Area+MarkArea | M3 价格预测 |
| chartPurchaseScenario | Bar+Line | M3 采购节奏 |
| chartConsumptionInventory | Bar+DualLine | M4 消耗vs库存 |
| chartInventoryHealth | ColorBar | M4 库存健康度 |
| chartDemandForecast | TriLine | M4 需求预测 |
| chartMaterialCostRate | QuadLine | M5 成本率趋势 |
| chartBuCostRate | Bar+MarkLine | M5 BU成本率 |
| chartSmallSuppliersCat | Bar+Line | M6 分散供应商(品类) |
| chartSmallSuppliersBu | Radar | M6 分散供应商(BU) |
| chartSupplierRadar | TripleRadar | M7 绩效雷达 |
| chartSpendPerfMatch | Bar+Scatter | M7 支出绩效匹配 |

## 增强功能 (v2.0)

### 首页驾驶舱 (Dashboard Home)
- **定位**: "总监30秒判断"模式，作为所有专题页的入口和总览
- **核心组件**: 10个KPI卡片 + 6条P0预警面板 + 双维度排名 + 决策摘要 + 下钻入口
- **交互**: 点击预警项自动跳转到对应专题Tab；点击快捷入口按钮切换模块

### P0预警系统 (6条规则)
| 规则ID | 名称 | 高危阈值 | 中危阈值 | 当前状态 |
|--------|------|---------|---------|---------|
| AL_PRICE_001 | 价格偏离度 | >8% | >5% | 高危(+5.8%) |
| AL_SPEND_001 | 预算执行偏离 | >15pp | >10pp | 正常(93.6%) |
| AL_SPEND_002 | 支出突增 | YoY>25%或MoM>20% | - | 中危(YoY+28.4%) |
| AL_SUPPLIER_002 | 交付及时率 | <92% | <95% | 中危(87.2%) |
| AL_SUPPLIER_003 | 单一供应风险 | 年采购>500万 | 默认触发 | 正常(34SKU) |
| AL_INVENTORY_003 | 缺货风险 | <10天 | <15天 | 高危(12.8天) |

### 维度切换系统 (Dimension Toggle)
- 每个图表区域配有 `.dim-toggle` 按钮组，支持按品类/事业部/子公司切换视图
- 按钮绑定 `data-dim-target` 属性指定关联图表ID（支持多图表联动）
- 切换时通过 `chartInstances[id].setOption()` 动态更新图表配置

## 设计规范
- **主色调**: Cyan (#38bdf8) - 主数据/正向指标
- **辅助色**: Gold (#f59e0b) - 警示/目标/次要数据
- **成功色**: Green (#10b981) - 达标/优化/正向趋势
- **危险色**: Red (#ef4444) - 风险/缺口/负向趋势
- **强调色**: Purple (#a78bfa) - 子公司/库存相关
- **背景**: #0a0e1a (深蓝黑) + 卡片 rgba(17,24,39,0.85)
- **边框**: rgba(56,189,248,0.15) 半透明青色

## 数据说明
本项目为**演示Demo**，所有数据均为**模拟数据(Mock Data)**，用于展示大屏交互效果和视觉设计。实际部署时需替换为真实API数据接口。

## 开发说明
- 项目通过 `coze init --template native-static` 初始化
- 所有样式内联在 `<style>` 标签中（无需外部CSS文件）
- ECharts 通过 CDN 引入，无需本地安装
- 图表采用 IIFE 立即执行函数模式，每个图表独立作用域
- Tab切换通过纯JS实现，无框架依赖
