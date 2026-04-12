/**
 * 供应商绩效数据生成器
 * 生成20家供应商×24个月的绩效评分
 */

const fs = require('fs');
const path = require('path');

const suppliers = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/suppliers.json'), 'utf8')).suppliers;
const priceHistory = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/price-history.json'), 'utf8')).priceHistory;

// 绩效维度权重
const WEIGHTS = {
  quality: 0.40,    // 质量 40%
  delivery: 0.30,   // 交付 30%
  cost: 0.20,       // 成本 20%
  service: 0.10     // 服务 10%
};

// 生成月度绩效
function generateMonthlyPerformance(supplier, year, month) {
  const baseScore = supplier.performanceScore;
  const baseDelivery = supplier.deliveryRate;
  const baseQuality = supplier.qualityRate;
  
  // 随机波动 (±3分)
  const fluctuation = () => (Math.random() - 0.5) * 6;
  
  // 各维度得分
  const qualityScore = Math.min(100, Math.max(85, baseQuality + fluctuation()));
  const deliveryScore = Math.min(100, Math.max(80, baseDelivery + fluctuation()));
  const costScore = Math.min(100, Math.max(70, supplier.priceCompetitiveness + fluctuation()));
  const serviceScore = Math.min(100, Math.max(75, supplier.serviceLevel + fluctuation()));
  
  // 综合评分
  const overallScore = Math.round(
    qualityScore * WEIGHTS.quality +
    deliveryScore * WEIGHTS.delivery +
    costScore * WEIGHTS.cost +
    serviceScore * WEIGHTS.service
  );
  
  // 评级
  let grade;
  if (overallScore >= 95) grade = 'A+';
  else if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 85) grade = 'B+';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 75) grade = 'C';
  else grade = 'D';
  
  // 排名 (模拟)
  const rank = Math.floor((100 - overallScore) / 5) + 1;
  
  return {
    date: `${year}-${String(month).padStart(2, '0')}-01`,
    year,
    month,
    supplierCode: supplier.supplierCode,
    supplierName: supplier.name,
    industry: supplier.industry,
    category: supplier.category,
    cooperationMode: supplier.cooperationMode,
    qualityScore: Math.round(qualityScore * 10) / 10,
    deliveryScore: Math.round(deliveryScore * 10) / 10,
    costScore: Math.round(costScore * 10) / 10,
    serviceScore: Math.round(serviceScore * 10) / 10,
    overallScore,
    grade,
    rank,
    weights: WEIGHTS,
    trend: Math.random() > 0.6 ? 'up' : (Math.random() < 0.4 ? 'down' : 'stable'),
    createdAt: new Date().toISOString()
  };
}

// 生成所有绩效数据
function generateAllPerformance() {
  const records = [];
  
  for (const supplier of suppliers) {
    for (const monthData of priceHistory) {
      const { year, month } = monthData;
      records.push(generateMonthlyPerformance(supplier, year, month));
    }
  }
  
  return records;
}

// 主函数
function main() {
  console.log('开始生成供应商绩效数据...');
  
  const records = generateAllPerformance();
  
  // 统计分析
  const byGrade = {};
  const byTrend = { up: 0, down: 0, stable: 0 };
  
  for (const r of records) {
    byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
    byTrend[r.trend]++;
  }
  
  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: '供应商月度绩效评分',
    summary: {
      totalRecords: records.length,
      supplierCount: suppliers.length,
      timeRange: { start: '2024-01', end: '2025-12' },
      avgScore: Math.round(records.reduce((s, r) => s + r.overallScore, 0) / records.length),
      byGrade,
      byTrend,
      topSuppliers: records
        .filter(r => r.year === 2025 && r.month === 6)
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 5)
        .map(s => ({ code: s.supplierCode, name: s.supplierName, score: s.overallScore }))
    },
    records
  };
  
  // 写入文件
  const outputPath = path.join(__dirname, '../data/supplier-performance.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`✓ 生成完成: ${records.length} 条绩效记录`);
  console.log(`✓ 供应商: ${suppliers.length} 家 × 24月`);
  console.log(`✓ 平均评分: ${output.summary.avgScore}`);
  console.log(`✓ 评级分布:`, byGrade);
  console.log(`✓ 趋势分布:`, byTrend);
  console.log(`✓ 文件路径: ${outputPath}`);
}

main();
