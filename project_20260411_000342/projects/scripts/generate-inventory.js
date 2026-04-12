/**
 * 库存数据生成器
 * 基于采购订单生成消耗逻辑，创建24个月库存台账
 */

const fs = require('fs');
const path = require('path');

const ordersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/purchase-orders.json'), 'utf8'));
const materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/materials.json'), 'utf8')).materials;
const priceHistory = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/price-history.json'), 'utf8')).priceHistory;

const orders = ordersData.orders;

// 初始化库存状态
const inventoryState = {};
for (const material of materials) {
  inventoryState[material.materialCode] = {
    currentStock: Math.floor(material.monthlyConsumption * material.safetyStockDays / 30),
    totalInbound: 0,
    totalOutbound: 0
  };
}

// 生成年月库存记录
function generateMonthlyInventory(year, month) {
  const records = [];
  
  for (const material of materials) {
    const state = inventoryState[material.materialCode];
    
    // 当月入库 = 当月采购订单到货
    const monthlyOrders = orders.filter(o => {
      const orderYear = parseInt(o.orderDate.split('-')[0]);
      const orderMonth = parseInt(o.orderDate.split('-')[1]);
      return orderYear === year && orderMonth === month && o.materialCode === material.materialCode;
    });
    const inbound = monthlyOrders.reduce((sum, o) => sum + o.quantity, 0);
    
    // 当月出库 = 月均消耗 + 随机波动
    const baseConsumption = material.monthlyConsumption;
    const fluctuation = 0.8 + Math.random() * 0.4; // 0.8-1.2波动
    const outbound = Math.floor(baseConsumption * fluctuation);
    
    // 计算库存变化
    const openingStock = state.currentStock;
    const closingStock = openingStock + inbound - outbound;
    
    // 更新状态
    state.currentStock = Math.max(closingStock, 0);
    state.totalInbound += inbound;
    state.totalOutbound += outbound;
    
    // 获取当月价格计算库存金额
    const monthPrice = priceHistory.find(p => p.year === year && p.month === month);
    const price = monthPrice ? monthPrice.prices[material.category].spot : material.recentPrice;
    const inventoryValue = Math.round(state.currentStock * price);
    
    // 周转天数
    const turnoverDays = outbound > 0 ? Math.round((openingStock + closingStock) / 2 / (outbound / 30)) : 0;
    
    // 缺货预警
    const safetyStock = Math.floor(material.monthlyConsumption * material.safetyStockDays / 30);
    const stockoutRisk = closingStock < safetyStock * 0.5;
    
    records.push({
      date: `${year}-${String(month).padStart(2, '0')}-01`,
      year,
      month,
      materialCode: material.materialCode,
      materialName: material.name,
      category: material.category,
      openingStock,
      inbound,
      outbound,
      closingStock: Math.max(closingStock, 0),
      unit: material.category === 'ELECTRONIC' ? '千件' : '吨',
      unitPrice: price,
      inventoryValue,
      turnoverDays,
      safetyStock,
      stockoutRisk,
      vmiFlag: material.vmiEnabled,
      createdAt: new Date().toISOString()
    });
  }
  
  return records;
}

// 生成所有库存记录
function generateAllInventory() {
  const allRecords = [];
  
  for (const monthData of priceHistory) {
    const { year, month } = monthData;
    const monthlyRecords = generateMonthlyInventory(year, month);
    allRecords.push(...monthlyRecords);
  }
  
  return allRecords;
}

// 主函数
function main() {
  console.log('开始生成库存数据...');
  
  const records = generateAllInventory();
  
  // 统计信息
  const stockoutRecords = records.filter(r => r.stockoutRisk);
  const vmiRecords = records.filter(r => r.vmiFlag);
  
  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: '汽车零部件企业集团库存台账',
    summary: {
      totalRecords: records.length,
      timeRange: { start: '2024-01', end: '2025-12' },
      materialCount: materials.length,
      totalInbound: records.reduce((sum, r) => sum + r.inbound, 0),
      totalOutbound: records.reduce((sum, r) => sum + r.outbound, 0),
      avgInventoryValue: Math.round(records.reduce((sum, r) => sum + r.inventoryValue, 0) / records.length),
      stockoutWarnings: stockoutRecords.length,
      vmiRecords: vmiRecords.length
    },
    records
  };
  
  // 写入文件
  const outputPath = path.join(__dirname, '../data/inventory.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`✓ 生成完成: ${records.length} 条库存记录`);
  console.log(`✓ 物料种类: ${materials.length} 种`);
  console.log(`✓ 总入库: ${output.summary.totalInbound.toLocaleString()} ${materials[0].category === 'ELECTRONIC' ? '千件' : '吨'}`);
  console.log(`✓ 总出库: ${output.summary.totalOutbound.toLocaleString()} ${materials[0].category === 'ELECTRONIC' ? '千件' : '吨'}`);
  console.log(`✓ 缺货预警: ${stockoutRecords.length} 条`);
  console.log(`✓ VMI库存: ${vmiRecords.length} 条`);
  console.log(`✓ 文件路径: ${outputPath}`);
}

main();
