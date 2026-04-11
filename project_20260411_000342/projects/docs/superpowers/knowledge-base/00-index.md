# 采购驾驶舱 AI 知识库索引

版本: v0.1
更新时间: 2026-04-11
适用范围: 采购经营分析驾驶舱 AI 助手 v2

## 知识层结构（完整目标）

- 01-kpi-dictionary: KPI 定义与常见追问
- 02-chart-interpretation: 图表解读模板
- 03-alert-rules: 预警规则与阈值
- 04-business-logic: 业务口径与判定规则
- 05-faq: 高频问答与场景化追问模板
- 06-module-summary: 模块摘要与晨会口径

## 当前种子范围

- 01-kpi-dictionary/savings-amount.md
- 01-kpi-dictionary/budget-execution.md
- 01-kpi-dictionary/material-cost-rate.md
- 04-business-logic/cost-calculation.md
- 04-business-logic/tco-boundary.md
- 04-business-logic/price-benchmark-rule.md
- 04-business-logic/alert-disposition-rule.md
- 04-business-logic/baseline-price-definition.md
- 04-business-logic/delivery-commitment-source.md
- 04-business-logic/category-commodity-mapping.md
- 05-faq/top50-questions.md
- 05-faq/scenario-based/morning-briefing.md
- 05-faq/scenario-based/root-cause-cases.md

## 待补主题

- 模块级摘要与引用 ID 规范化

## 使用原则

- 先查业务口径，再组织回答。
- 先查 KPI 定义，再判断是否需要做异常归因。
- 当口径未定义时，必须显式说明“当前口径未定义”。
- 当用户继续追问“是否包含”“价格来自哪里”“谁负责处理”时，优先引用对应业务逻辑文档。
