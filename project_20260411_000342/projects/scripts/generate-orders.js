/**
 * 采购订单数据生成器
 * 生成2400条符合汽车零部件行业特征的采购订单
 */

const fs = require('fs');
const path = require('path');

// 读取基础数据
const suppliers = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/suppliers.json'), 'utf8')).suppliers;
const materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/materials.json'), 'utf8')).materials;
const priceHistory = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/price-history.json'), 'utf8')).priceHistory;

// 组织定义
const organizations = [
  { code: 'BU_WV', name: '整车事业部', type: 'businessUnit', weight: 0.55 },
  { code: 'SUB_ENG', name: '发动机子公司', type: 'subsidiary', parent: 'BU_PARTS', weight: 0.16 },
  { code: 'SUB_GBX', name: '变速箱子公司', type: 'subsidiary', parent: 'BU_PARTS', weight: 0.135 },
  { code: 'SUB_CHS', name: '底盘子公司', type: 'subsidiary', parent: 'BU_PARTS', weight: 0.155 }
];

// 生成订单号
function generateOrderNo(year, month, sequence) {
  return `PO-${year}${String(month).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;
}

// 随机选择组织（按权重）
function selectOrganization() {
  const random = Math.random();
  let cumulative = 0;
  for (const org of organizations) {
    cumulative += org.weight;
    if (random <= cumulative) return org;
  }
  return organizations[0];
}

// 随机选择物料（按品类权重）
function selectMaterial() {
  const categoryWeights = { STEEL: 0.4, PLASTIC: 0.25, ELECTRONIC: 0.15, ALUMINUM: 0.12, RUBBER: 0.08 };
  const random = Math.random();
  let cumulative = 0;
  let selectedCategory = 'STEEL';
  
  for (const [cat, weight] of Object.entries(categoryWeights)) {
    cumulative += weight;
    if (random <= cumulative) {
      selectedCategory = cat;
      break;
    }
  }
  
  const categoryMaterials = materials.filter(m => m.category === selectedCategory);
  return categoryMaterials[Math.floor(Math.random() * categoryMaterials.length)];
}

// 随机选择供应商（基于物料的主供应商或备选）
function selectSupplier(material, orderType) {
  const allSuppliers = [material.primarySupplier, ...(material.secondarySuppliers || [])];
  
  if (orderType === '长约') {
    // 长约订单优先选择长约供应商
    const longTermSuppliers = allSuppliers.filter(code => {
      const s = suppliers.find(s => s.supplierCode === code);
      return s && s.cooperationMode === '长约';
    });
    if (longTermSuppliers.length > 0) {
      return longTermSuppliers[0];
    }
  }
  
  return allSuppliers[Math.floor(Math.random() * allSuppliers.length)];
}

// 生单条订单
function generateOrder(year, month, sequence) {
  const orderNo = generateOrderNo(year, month, sequence);
  const material = selectMaterial();
  const org = selectOrganization();
  
  // 长约 vs 现货 = 60% : 40%
  const orderType = Math.random() < 0.6 ? '长约' : '现货';
  const supplierCode = selectSupplier(material, orderType);
  const supplier = suppliers.find(s => s.supplierCode === supplierCode);
  
  // 获取当月价格
  const monthPrice = priceHistory.find(p => p.year === year && p.month === month);
  const priceInfo = monthPrice ? monthPrice.prices[material.category] : null;
  
  // 确定单价（长约用contract价，现货用spot价，有±5%波动）
  let unitPrice;
  if (priceInfo) {
    const basePrice = orderType === '长约' ? priceInfo.contract : priceInfo.spot;
    unitPrice = basePrice * (0.95 + Math.random() * 0.1); // ±5%波动
  } else {
    unitPrice = material.recentPrice;
  }
  
  // 根据物料确定数量
  let quantity;
  if (material.category === 'ELECTRONIC') {
    // 电子元器件按千件
    quantity = Math.floor(material.monthlyConsumption * (0.3 + Math.random() * 0.4));
  } else {
    // 其他按吨
    quantity = Math.floor(material.monthlyConsumption * (0.2 + Math.random() * 0.6));
  }
  
  // 确保满足MOQ
  quantity = Math.max(quantity, material.moq);
  
  // 计算金额
  const amount = Math.round(unitPrice * quantity);
  
  // 交货日期（订单月内随机）
  const deliveryDay = Math.floor(10 + Math.random() * 18); // 10-28日
  const deliveryDate = `${year}-${String(month).padStart(2, '0')}-${String(deliveryDay).padStart(2, '0')}`;
  
  // 订单状态
  const statusOptions = ['已完成', '已完成', '已完成', '已完成', '已完成', '执行中'];
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  
  return {
    orderNo,
    materialCode: material.materialCode,
    materialName: material.name,
    category: material.category,
    supplierCode,
    supplierName: supplier ? supplier.name : '',
    organizationCode: org.code,
    organizationName: org.name,
    orderType,
    quantity,
    unit: material.category === 'ELECTRONIC' ? '千件' : '吨',
    unitPrice: Math.round(unitPrice * 100) / 100,
    amount,
    currency: 'CNY',
    orderDate: `${year}-${String(month).padStart(2, '0')}-01`,
    deliveryDate,
    status,
    paymentTerms: supplier ? supplier.paymentTerms : '月结30天',
    vmiFlag: material.vmiEnabled && supplier && supplier.vmiSupported,
    createdAt: `${year}-${String(month).padStart(2, '0')}-01T08:00:00Z`
  };
}

// 生成所有订单
function generateAllOrders() {
  const orders = [];
  let sequence = 1;
  
  // 2024-2025共24个月，每月100条
  for (const monthData of priceHistory) {
    const { year, month } = monthData;
    const monthlyCount = 100;
    
    for (let i = 0; i < monthlyCount; i++) {
      orders.push(generateOrder(year, month, sequence++));
    }
  }
  
  return orders;
}

// 主函数
function main() {
  console.log('开始生成采购订单数据...');
  
  const orders = generateAllOrders();
  
  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: '汽车零部件企业集团采购订单数据',
    summary: {
      totalCount: orders.length,
      timeRange: { start: '2024-01', end: '2025-12' },
      totalAmount: orders.reduce((sum, o) => sum + o.amount, 0),
      byCategory: {},
      byOrderType: {},
      byOrganization: {}
    },
    orders
  };
  
  // 计算汇总统计
  for (const order of orders) {
    // 按品类
    output.summary.byCategory[order.category] = (output.summary.byCategory[order.category] || 0) + 1;
    // 按订单类型
    output.summary.byOrderType[order.orderType] = (output.summary.byOrderType[order.orderType] || 0) + 1;
    // 按组织
    output.summary.byOrganization[order.organizationCode] = (output.summary.byOrganization[order.organizationCode] || 0) + 1;
  }
  
  // 写入文件
  const outputPath = path.join(__dirname, '../data/purchase-orders.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`✓ 生成完成: ${orders.length} 条订单`);
  console.log(`✓ 总金额: ${(output.summary.totalAmount / 100000000).toFixed(2)} 亿元`);
  console.log(`✓ 文件路径: ${outputPath}`);
  console.log('\n按品类分布:');
  for (const [cat, count] of Object.entries(output.summary.byCategory)) {
    console.log(`  ${cat}: ${count} 条 (${(count/orders.length*100).toFixed(1)}%)`);
  }
  console.log('\n按订单类型:');
  for (const [type, count] of Object.entries(output.summary.byOrderType)) {
    console.log(`  ${type}: ${count} 条 (${(count/orders.length*100).toFixed(1)}%)`);
  }
}

main();
