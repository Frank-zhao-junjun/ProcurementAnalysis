# 高频问题清单（种子版）

版本: v0.1
更新时间: 2026-04-11
说明: 当前为 Top50 的首批种子问题，后续按真实晨会追问持续扩充。

## 晨会结论型

1. 本周最差 3 项指标是什么？
2. 哪条 P0 预警需要今天升级处理？
3. 当前模块最值得总监关注的结论是什么？

## 口径追问型

1. 本月降本额是否包含物流费用？
   来源: cost-calculation.md
2. 降本额为什么提升了，但总支出却没有下降？
   来源: savings-amount.md
3. 预算执行率为什么突然升高？
   来源: budget-execution.md
4. 材料成本率上升一定是采购涨价吗？
   来源: material-cost-rate.md
5. 品类和商品为什么会得出不同结论？
   来源: category-commodity-mapping.md
6. 返利和税费是否计入降本额？
   来源: cost-calculation.md
7. TCO 是否包含仓储和关税？
   来源: tco-boundary.md
8. 市场公允价来自哪个价格源？
   来源: price-benchmark-rule.md
9. 市场价更新频率是按天还是按周？
   来源: price-benchmark-rule.md
10. P0 预警是否必须写责任人、状态和 ETA？
   来源: alert-disposition-rule.md
11. 上期单价到底按上月还是去年同期定义？
   来源: baseline-price-definition.md
12. 到货承诺来自哪个系统和哪个字段？
   来源: delivery-commitment-source.md

## 异常归因型

1. 为什么这张图没有达标？
2. 为什么预算执行率突然上升？
3. 为什么供应商交付及时率下滑？

## 预警处置型

1. AL_PRICE_001 现在应该由谁跟进？
   来源: alert-disposition-rule.md
2. AL_INVENTORY_003 预计什么时候恢复？
   来源: alert-disposition-rule.md
3. 当前“处理中”和“已缓解”状态有什么区别？
   来源: alert-disposition-rule.md

## 供应商跟进型

1. 哪个供应商需要本周约谈？
2. 哪类问题应该由采购经理跟进，而不是直接升级为预警？

## 追问示例

Q: 本月降本额是 156.8 万，包含物流费用吗？
A: 不包含。请优先引用 cost-calculation.md；如果用户要看全成本影响，再切换到 tco-boundary.md。

Q: 预算执行率为什么一下子拉高了？
A: 先判断是否存在集中结算或大额订单释放，再引用 budget-execution.md；必要时补充 root-cause-cases.md。

Q: 材料成本率上升，是不是采购谈判失利了？
A: 不能直接下结论，应先区分采购涨价、收入下降和产品结构变化，再引用 material-cost-rate.md。

Q: 为什么同一品类下价格走势不一样？
A: 先检查商品映射与规格可比性，再引用 category-commodity-mapping.md。

Q: 为什么钢材偏离 5.8% 就提示风险？
A: 先说明价格偏离公式，再引用 price-benchmark-rule.md 中的价格来源与更新频率。

Q: 这条 P0 预警谁负责，什么时候处理完？
A: 先回答 Owner、Status、ETA，再引用 alert-disposition-rule.md。

Q: 这里的上期单价到底按哪个周期？
A: 先说明当前分析视角，再引用 baseline-price-definition.md。

Q: 交付 ETA 是从哪里来的？
A: 先说明以 ERP 或 SRM 确认字段为准，再引用 delivery-commitment-source.md。

注: 当用户继续追问口径或原因时，优先回链上述来源文档。
