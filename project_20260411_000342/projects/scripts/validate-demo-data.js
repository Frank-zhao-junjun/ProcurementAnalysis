/**
 * Demo数据验证脚本
 * 验证数据逻辑一致性，生成数据分布报告
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// 验证结果
const validationResults = {
  errors: [],
  warnings: [],
  passed: []
};

// 辅助函数
function log(type, message) {
  validationResults[type].push(message);
  const icon = type === 'errors' ? '❌' : type === 'warnings' ? '⚠️' : '✅';
  console.log(`${icon} ${message}`);
}

// 验证1: JSON格式检查
function validateJSON() {
  console.log('\n📋 验证1: JSON格式检查');
  const files = ['suppliers.json', 'materials.json', 'price-history.json', 
                 'purchase-orders.json', 'inventory.json', 'contracts.json', 
                 'supplier-performance.json', 'budget-savings.json'];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      JSON.parse(content);
      log('passed', `${file} 格式正确`);
    } catch (err) {
      log('errors', `${file} JSON格式错误: ${err.message}`);
    }
  }
}

// 验证2: 数据完整性
function validateDataIntegrity() {
  console.log('\n📋 验证2: 数据完整性');
  
  // 检查供应商
  const suppliers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'suppliers.json'), 'utf8'));
  if (suppliers.suppliers.length === 20) {
    log('passed', `供应商数量: ${suppliers.suppliers.length} 家 (符合预期)`);
  } else {
    log('warnings', `供应商数量: ${suppliers.suppliers.length} 家 (预期20家)`);
  }
  
  // 检查物料
  const materials = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'materials.json'), 'utf8'));
  if (materials.materials.length >= 19) {
    log('passed', `物料数量: ${materials.materials.length} 种 (符合预期)`);
  } else {
    log('warnings', `物料数量: ${materials.materials.length} 种 (偏少)`);
  }
  
  // 检查订单
  const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'purchase-orders.json'), 'utf8'));
  if (orders.orders.length === 2400) {
    log('passed', `订单数量: ${orders.orders.length} 条 (符合预期)`);
  } else {
    log('warnings', `订单数量: ${orders.orders.length} 条 (预期2400条)`);
  }
  
  // 检查价格历史
  const priceHistory = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'price-history.json'), 'utf8'));
  if (priceHistory.priceHistory.length === 24) {
    log('passed', `价格历史: ${priceHistory.priceHistory.length} 个月 (符合预期)`);
  } else {
    log('warnings', `价格历史: ${priceHistory.priceHistory.length} 个月 (预期24个月)`);
  }
  
  // 检查库存
  const inventory = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'inventory.json'), 'utf8'));
  log('passed', `库存记录: ${inventory.records.length} 条`);
  
  // 检查合同
  const contracts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'contracts.json'), 'utf8'));
  if (contracts.contracts.length === 16) {
    log('passed', `长约合同: ${contracts.contracts.length} 份 (符合预期)`);
  } else {
    log('warnings', `长约合同: ${contracts.contracts.length} 份 (预期16份)`);
  }
  
  // 检查绩效
  const performance = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'supplier-performance.json'), 'utf8'));
  log('passed', `绩效记录: ${performance.records.length} 条`);
}

// 验证3: 业务逻辑
function validateBusinessLogic() {
  console.log('\n📋 验证3: 业务逻辑');
  
  const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'purchase-orders.json'), 'utf8')).orders;
  const inventory = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'inventory.json'), 'utf8')).records;
  
  // 检查负数金额
  const negativeAmounts = orders.filter(o => o.amount < 0);
  if (negativeAmounts.length === 0) {
    log('passed', '订单金额无负数');
  } else {
    log('errors', `发现 ${negativeAmounts.length} 条负金额订单`);
  }
  
  // 检查零金额
  const zeroAmounts = orders.filter(o => o.amount === 0);
  if (zeroAmounts.length === 0) {
    log('passed', '订单金额无零值');
  } else {
    log('warnings', `发现 ${zeroAmounts.length} 条零金额订单`);
  }
  
  // 检查库存负值
  const negativeInventory = inventory.filter(i => i.closingStock < 0);
  if (negativeInventory.length === 0) {
    log('passed', '库存无负值');
  } else {
    log('errors', `发现 ${negativeInventory.length} 条负库存`);
  }
  
  // 检查长约执行率
  const contracts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'contracts.json'), 'utf8')).contracts;
  const overExecuted = contracts.filter(c => c.executionRate > 100.5); // 允许0.5%误差
  if (overExecuted.length === 0) {
    log('passed', '长约执行率无超100%');
  } else {
    log('warnings', `${overExecuted.length} 份合同执行率>100%`);
  }
}

// 验证4: 数据关联
function validateRelationships() {
  console.log('\n📋 验证4: 数据关联');
  
  const suppliers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'suppliers.json'), 'utf8')).suppliers;
  const materials = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'materials.json'), 'utf8')).materials;
  const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'purchase-orders.json'), 'utf8')).orders;
  
  const supplierCodes = new Set(suppliers.map(s => s.supplierCode));
  const materialCodes = new Set(materials.map(m => m.materialCode));
  
  // 检查订单中的供应商
  const invalidSuppliers = orders.filter(o => !supplierCodes.has(o.supplierCode));
  if (invalidSuppliers.length === 0) {
    log('passed', '订单供应商编码全部有效');
  } else {
    log('errors', `${invalidSuppliers.length} 条订单含无效供应商`);
  }
  
  // 检查订单中的物料
  const invalidMaterials = orders.filter(o => !materialCodes.has(o.materialCode));
  if (invalidMaterials.length === 0) {
    log('passed', '订单物料编码全部有效');
  } else {
    log('errors', `${invalidMaterials.length} 条订单含无效物料`);
  }
}

// 生成统计报告
function generateReport() {
  console.log('\n📊 生成数据分布报告...');
  
  const orders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'purchase-orders.json'), 'utf8'));
  const suppliers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'suppliers.json'), 'utf8'));
  const inventory = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'inventory.json'), 'utf8'));
  
  // 订单统计
  const categoryDist = {};
  const typeDist = {};
  const orgDist = {};
  
  for (const order of orders.orders) {
    categoryDist[order.category] = (categoryDist[order.category] || 0) + 1;
    typeDist[order.orderType] = (typeDist[order.orderType] || 0) + 1;
    orgDist[order.organizationCode] = (orgDist[order.organizationCode] || 0) + 1;
  }
  
  const totalAmount = orders.orders.reduce((s, o) => s + o.amount, 0);
  const avgOrderAmount = totalAmount / orders.orders.length;
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalOrders: orders.orders.length,
      totalAmount: totalAmount,
      totalAmountWan: Math.round(totalAmount / 10000),
      totalAmountYi: Math.round(totalAmount / 100000000 * 100) / 100,
      avgOrderAmount: Math.round(avgOrderAmount),
      dateRange: { start: orders.orders[0]?.orderDate, end: orders.orders[orders.orders.length - 1]?.orderDate }
    },
    distributions: {
      byCategory: categoryDist,
      byOrderType: typeDist,
      byOrganization: orgDist
    },
    suppliers: {
      count: suppliers.suppliers.length,
      longTermCount: suppliers.suppliers.filter(s => s.cooperationMode === '长约').length,
      spotCount: suppliers.suppliers.filter(s => s.cooperationMode === '现货').length,
      avgPerformance: Math.round(suppliers.suppliers.reduce((s, sup) => s + sup.performanceScore, 0) / suppliers.suppliers.length)
    },
    inventory: {
      totalRecords: inventory.records.length,
      stockoutCount: inventory.records.filter(r => r.stockoutRisk).length,
      vmiCount: inventory.records.filter(r => r.vmiFlag).length
    },
    validation: {
      errors: validationResults.errors.length,
      warnings: validationResults.warnings.length,
      passed: validationResults.passed.length,
      status: validationResults.errors.length === 0 ? 'PASSED' : 'FAILED'
    }
  };
  
  // 写入报告
  const reportPath = path.join(DATA_DIR, 'data-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n✅ 报告已生成: ${reportPath}`);
  return report;
}

// 打印汇总
function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('         DEMO 数据验证报告');
  console.log('='.repeat(60));
  console.log(`\n📦 数据规模:`);
  console.log(`  - 订单: ${report.summary.totalOrders} 条`);
  console.log(`  - 金额: ${report.summary.totalAmountYi.toFixed(2)} 亿元 (${report.summary.totalAmountWan} 万元)`);
  console.log(`  - 单均: ${report.summary.avgOrderAmount.toLocaleString()} 元`);
  console.log(`  - 供应商: ${report.suppliers.count} 家`);
  console.log(`  - 时间: ${report.summary.dateRange.start} ~ ${report.summary.dateRange.end}`);
  
  console.log(`\n📊 品类分布:`);
  for (const [cat, count] of Object.entries(report.distributions.byCategory)) {
    const pct = ((count / report.summary.totalOrders) * 100).toFixed(1);
    console.log(`  - ${cat}: ${count} 条 (${pct}%)`);
  }
  
  console.log(`\n📊 订单类型:`);
  for (const [type, count] of Object.entries(report.distributions.byOrderType)) {
    const pct = ((count / report.summary.totalOrders) * 100).toFixed(1);
    console.log(`  - ${type}: ${count} 条 (${pct}%)`);
  }
  
  console.log(`\n✅ 验证结果:`);
  console.log(`  - 通过: ${report.validation.passed} 项`);
  console.log(`  - 警告: ${report.validation.warnings} 项`);
  console.log(`  - 错误: ${report.validation.errors} 项`);
  console.log(`  - 状态: ${report.validation.status}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (report.validation.status === 'PASSED') {
    console.log('🎉 数据验证通过！数据具备上线条件。');
  } else {
    console.log('⚠️  数据存在问题，请检查错误项。');
  }
  console.log('='.repeat(60) + '\n');
}

// 主函数
function main() {
  console.log('🔍 开始验证Demo数据...\n');
  
  validateJSON();
  validateDataIntegrity();
  validateBusinessLogic();
  validateRelationships();
  
  const report = generateReport();
  printSummary(report);
  
  // 返回验证结果供脚本使用
  process.exit(report.validation.errors.length > 0 ? 1 : 0);
}

main();
