import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const knowledgeBaseRoot = path.join(projectRoot, 'docs', 'superpowers', 'knowledge-base');

function readDoc(relativePath) {
  return fs.readFileSync(path.join(knowledgeBaseRoot, relativePath), 'utf8');
}

test('Task 6 knowledge base seed files exist', () => {
  const requiredFiles = [
    '00-index.md',
    '01-kpi-dictionary/savings-amount.md',
    '01-kpi-dictionary/budget-execution.md',
    '01-kpi-dictionary/material-cost-rate.md',
    '04-business-logic/cost-calculation.md',
    '04-business-logic/tco-boundary.md',
    '04-business-logic/price-benchmark-rule.md',
    '04-business-logic/alert-disposition-rule.md',
    '04-business-logic/baseline-price-definition.md',
    '04-business-logic/delivery-commitment-source.md',
    '04-business-logic/category-commodity-mapping.md',
    '05-faq/top50-questions.md',
    '05-faq/scenario-based/morning-briefing.md',
    '05-faq/scenario-based/root-cause-cases.md'
  ];

  requiredFiles.forEach((relativePath) => {
    assert.equal(fs.existsSync(path.join(knowledgeBaseRoot, relativePath)), true, `${relativePath} should exist`);
  });
});

test('cost calculation glossary states savings exclude logistics cost', () => {
  const content = readDoc('04-business-logic/cost-calculation.md');

  assert.match(content, /物流费用/);
  assert.match(content, /不包含|排除/);
});

test('tco boundary enumerates included and excluded cost items', () => {
  const content = readDoc('04-business-logic/tco-boundary.md');

  assert.match(content, /##\s*纳入项/);
  assert.match(content, /##\s*排除项/);
});

test('price benchmark rule names a market price source and update frequency', () => {
  const content = readDoc('04-business-logic/price-benchmark-rule.md');

  assert.match(content, /价格来源|市场价来源/);
  assert.match(content, /更新频率/);
});

test('alert disposition rule includes owner, status, and ETA fields', () => {
  const content = readDoc('04-business-logic/alert-disposition-rule.md');

  assert.match(content, /责任人|owner/i);
  assert.match(content, /状态|status/i);
  assert.match(content, /ETA|预计完成|预计时间/i);
});

test('faq set includes a follow-up example for each business logic file', () => {
  const faqContent = readDoc('05-faq/top50-questions.md');
  const morningBriefingContent = readDoc('05-faq/scenario-based/morning-briefing.md');
  const combined = `${faqContent}\n${morningBriefingContent}`;

  [
    'cost-calculation.md',
    'tco-boundary.md',
    'price-benchmark-rule.md',
    'alert-disposition-rule.md',
    'baseline-price-definition.md',
    'delivery-commitment-source.md'
  ].forEach((docName) => {
    assert.match(combined, new RegExp(docName.replace('.', '\\.'), 'i'));
  });
});

test('business logic docs include required headings and version information', () => {
  const logicDocs = [
    '04-business-logic/cost-calculation.md',
    '04-business-logic/tco-boundary.md',
    '04-business-logic/price-benchmark-rule.md',
    '04-business-logic/alert-disposition-rule.md',
    '04-business-logic/baseline-price-definition.md',
    '04-business-logic/delivery-commitment-source.md',
    '04-business-logic/category-commodity-mapping.md'
  ];

  logicDocs.forEach((relativePath) => {
    const content = readDoc(relativePath);
    assert.match(content, /##\s*定义/);
    assert.match(content, /##\s*纳入项/);
    assert.match(content, /##\s*排除项/);
    assert.match(content, /##\s*示例问答/);
    assert.match(content, /##\s*常见误解/);
    assert.match(content, /版本/);
  });
});

test('kpi dictionary docs define formula, source, cadence, and follow-up questions', () => {
  const kpiDocs = [
    '01-kpi-dictionary/savings-amount.md',
    '01-kpi-dictionary/budget-execution.md',
    '01-kpi-dictionary/material-cost-rate.md'
  ];

  kpiDocs.forEach((relativePath) => {
    const content = readDoc(relativePath);
    assert.match(content, /##\s*定义/);
    assert.match(content, /##\s*计算公式/);
    assert.match(content, /##\s*数据来源/);
    assert.match(content, /##\s*更新频率/);
    assert.match(content, /##\s*常见追问/);
    assert.match(content, /版本/);
  });
});

test('category commodity mapping defines mapping rules and exception handling', () => {
  const content = readDoc('04-business-logic/category-commodity-mapping.md');

  assert.match(content, /品类/);
  assert.match(content, /商品/);
  assert.match(content, /映射规则/);
  assert.match(content, /例外|异常/);
});

test('root cause cases cover spend, price, inventory, and supplier scenarios', () => {
  const content = readDoc('05-faq/scenario-based/root-cause-cases.md');

  assert.match(content, /支出/);
  assert.match(content, /价格/);
  assert.match(content, /库存/);
  assert.match(content, /供应商/);
  assert.match(content, /建议回答|建议分析/);
});

test('knowledge base index declares current seed scope and pending topics', () => {
  const content = readDoc('00-index.md');

  assert.match(content, /当前种子范围/);
  assert.match(content, /待补主题/);
  assert.match(content, /01-kpi-dictionary\/savings-amount\.md/);
  assert.match(content, /04-business-logic\/category-commodity-mapping\.md/);
  assert.match(content, /05-faq\/scenario-based\/root-cause-cases\.md/);
  assert.match(content, /baseline-price-definition\.md/);
  assert.match(content, /delivery-commitment-source\.md/);
  assert.doesNotMatch(content, /待补主题[\s\S]*上期单价如何定义/);
  assert.doesNotMatch(content, /待补主题[\s\S]*到货承诺来自哪个系统和哪个字段/);
});

test('faq files link follow-up questions to new Task 8 knowledge docs', () => {
  const faqContent = readDoc('05-faq/top50-questions.md');
  const scenarioContent = readDoc('05-faq/scenario-based/root-cause-cases.md');
  const combined = `${faqContent}\n${scenarioContent}`;

  [
    'savings-amount.md',
    'budget-execution.md',
    'material-cost-rate.md',
    'category-commodity-mapping.md'
  ].forEach((docName) => {
    assert.match(combined, new RegExp(docName.replace('.', '\\.'), 'i'));
  });
});