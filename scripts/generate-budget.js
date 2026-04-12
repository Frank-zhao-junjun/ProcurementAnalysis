/**
 * 预算与降本数据生成器
 * 支撑Dashboard首页KPI: 年度采购额、降本额、预算执行率、P0预警
 */

const fs = require('fs');
const path = require('path');

const ordersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/purchase-orders.json'), 'utf8'));
const priceHistory = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/price-history.json'), 'utf8')).priceHistory;

const orders = ordersData.orders;

// 组织定义
const organizations = [
  { code: 'BU_WV', name: '整车事业部', fullYearBudget2024: 135000, fullYearBudget2025: 152000 },
  { code: 'SUB_ENG', name: '发动机子公司', fullYearBudget2024: 42000, fullYearBudget2025: 48000 },
  { code: 'SUB_GBX', name: '变速箱子公司', fullYearBudget2024: 35000, fullYearBudget2025: 40000 },
  { code: 'SUB_CHS', name: '底盘子公司', fullYearBudget2024: 38000, fullYearBudget2025: 44000 }
];

// 降本项目定义
const savingsProjects = [
  { id: 'SP-2024-001', name: '宝武长约续签降价', category: 'STEEL', type: '谈判降价', target: 3500, actual: 3800 },
  { id: 'SP-2024-002', name: '中石化PP集中采购', category: 'PLASTIC', type: '集中采购', target: 2200, actual: 2100 },
  { id: 'SP-2024-003', name: '博世芯片年度锁价', category: 'ELECTRONIC', type: '长约锁价', target: 1800, actual: 1950 },
  { id: 'SP-2024-004', name: '沙钢现货补充优化', category: 'STEEL', type: '供应商整合', target: 800, actual: 920 },
  { id: 'SP-2024-005', name: '中铝铸造铝工艺改进', category: 'ALUMINUM', type: '工艺改进', target: 600, actual: 580 },
  { id: 'SP-2025-001', name: '钢材长约二次谈判', category: 'STEEL', type: '谈判降价', target: 4500, actual: 3200 },
  { id: 'SP-2025-002', name: '塑料供应商整合', category: 'PLASTIC', type: '供应商整合', target: 3200, actual: 1800 },
  { id: 'SP-2025-003', name: '电子元器件国产替代', category: 'ELECTRONIC', type: '国产替代', target: 2500, actual: 1200 }
];

// 生成月度预算和实际
function generateMonthlyBudget(org, year, month) {
  const yearBudget = year === 2024 ? org.fullYearBudget2024 : org.fullYearBudget2025;
  const monthBudget = Math.round(yearBudget / 12 * (0.9 + Math.random() * 0.2)); // ±10%波动
  
  // 实际金额 = 该组织该月的订单金额
  const actualAmount = orders
    .filter(o => {
      const orderYear = parseInt(o.orderDate.split('-')[0]);
      const orderMonth = parseInt(o.orderDate.split('-')[1]);
      return o.organizationCode === org.code && orderYear === year && orderMonth === month;
    })
    .reduce((sum, o) => sum + o.amount, 0);
  
  const executionRate = Math.round((actualAmount / monthBudget) * 1000) / 10;
  
  // 降本金额 (随机分配)
  const yearSavingsTarget = yearBudget * (year === 2024 ? 0.03 : 0.05); // 2024降本3%, 2025降本5%
  const monthSavingsTarget = yearSavingsTarget / 12;
  const actualSavings = Math.round(monthSavingsTarget * (0.7 + Math.random() * 0.6)); // 70%-130%完成
  
  // 预警标识 (预算执行率>105%或<90%触发预警)
  const alert = executionRate > 105 || executionRate < 90;
  
  return {
    date: `${year}-${String(month).padStart(2, '0')}-01`,
    year,
    month,
    organizationCode: org.code,
    organizationName: org.name,
    budgetAmount: monthBudget,
    actualAmount,
    executionRate,
    alert,
    savingsTarget: Math.round(monthSavingsTarget),
    actualSavings,
    savingsAchievement: Math.round((actualSavings / monthSavingsTarget) * 1000) / 10,
    createdAt: new Date().toISOString()
  };
}

// 主函数
function main() {
  console.log('开始生成预算和降本数据...');
  
  const records = [];
  
  for (const org of organizations) {
    for (const monthData of priceHistory) {
      const { year, month } = monthData;
      records.push(generateMonthlyBudget(org, year, month));
    }
  }
  
  // 统计
  const byYear = { 2024: { budget: 0, actual: 0, savings: 0 }, 2025: { budget: 0, actual: 0, savings: 0 } };
  let alertCount = 0;
  
  for (const r of records) {
    byYear[r.year].budget += r.budgetAmount;
    byYear[r.year].actual += r.actualAmount;
    byYear[r.year].savings += r.actualSavings;
    if (r.alert) alertCount++;
  }
  
  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: '月度预算执行与降本追踪',
    summary: {
      totalRecords: records.length,
      organizationCount: organizations.length,
      timeRange: { start: '2024-01', end: '2025-12' },
      byYear,
      overallExecutionRate2024: Math.round((byYear[2024].actual / byYear[2024].budget) * 1000) / 10,
      overallExecutionRate2025: Math.round((byYear[2025].actual / byYear[2025].budget) * 1000) / 10,
      totalSavings2024: byYear[2024].savings,
      totalSavings2025: byYear[2025].savings,
      alertRecords: alertCount,
      savingsProjects
    },
    records
  };
  
  // 写入文件
  const outputPath = path.join(__dirname, '../data/budget-savings.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`✓ 生成完成: ${records.length} 条预算记录`);
  console.log(`✓ 组织: ${organizations.length} 个 × 24月`);
  console.log(`✓ 2024年总预算: ${(byYear[2024].budget / 10000).toFixed(2)}万元, 执行率: ${output.summary.overallExecutionRate2024}%`);
  console.log(`✓ 2025年总预算: ${(byYear[2025].budget / 10000).toFixed(2)}万元, 执行率: ${output.summary.overallExecutionRate2025}%`);
  console.log(`✓ 预警记录: ${alertCount} 条`);
  console.log(`✓ 降本项目: ${savingsProjects.length} 个`);
  console.log(`✓ 文件路径: ${outputPath}`);
}

main();
