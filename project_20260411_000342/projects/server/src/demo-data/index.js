/**
 * Demo数据服务层
 * 纯JSON + 内存查询，支撑Dashboard API
 */

const fs = require('fs');
const path = require('path');

// 数据缓存
let dataCache = null;

// 初始化数据加载
function initializeData() {
  if (dataCache) return dataCache;
  
  const dataDir = path.join(__dirname, '../../data');
  
  dataCache = {
    suppliers: JSON.parse(fs.readFileSync(path.join(dataDir, 'suppliers.json'), 'utf8')),
    materials: JSON.parse(fs.readFileSync(path.join(dataDir, 'materials.json'), 'utf8')),
    priceHistory: JSON.parse(fs.readFileSync(path.join(dataDir, 'price-history.json'), 'utf8')),
    orders: JSON.parse(fs.readFileSync(path.join(dataDir, 'purchase-orders.json'), 'utf8')),
    inventory: JSON.parse(fs.readFileSync(path.join(dataDir, 'inventory.json'), 'utf8')),
    contracts: JSON.parse(fs.readFileSync(path.join(dataDir, 'contracts.json'), 'utf8')),
    performance: JSON.parse(fs.readFileSync(path.join(dataDir, 'supplier-performance.json'), 'utf8')),
    budget: JSON.parse(fs.readFileSync(path.join(dataDir, 'budget-savings.json'), 'utf8'))
  };
  
  console.log('[DemoData] 数据加载完成:');
  console.log(`  - 供应商: ${dataCache.suppliers.suppliers.length} 家`);
  console.log(`  - 物料: ${dataCache.materials.materials.length} 种`);
  console.log(`  - 订单: ${dataCache.orders.orders.length} 条`);
  console.log(`  - 库存: ${dataCache.inventory.records.length} 条`);
  console.log(`  - 合同: ${dataCache.contracts.contracts.length} 份`);
  console.log(`  - 绩效: ${dataCache.performance.records.length} 条`);
  console.log(`  - 预算: ${dataCache.budget.records.length} 条`);
  
  return dataCache;
}

// 查询接口
const queries = {
  // ===== 基础查询 =====
  
  // 按时间范围筛选
  byTimeRange(data, dateField, startDate, endDate) {
    return data.filter(item => {
      const itemDate = item[dateField] || item.date;
      return itemDate >= startDate && itemDate <= endDate;
    });
  },
  
  // 按组织筛选
  byOrganization(data, orgCode) {
    return data.filter(item => item.organizationCode === orgCode);
  },
  
  // 按品类筛选
  byCategory(data, category) {
    return data.filter(item => item.category === category);
  },
  
  // 按供应商筛选
  bySupplier(data, supplierCode) {
    return data.filter(item => item.supplierCode === supplierCode);
  },
  
  // ===== 聚合查询 =====
  
  // 按维度分组聚合
  groupBy(data, groupField, valueField, aggType = 'sum') {
    const groups = {};
    
    for (const item of data) {
      const key = item[groupField];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item[valueField] || 0);
    }
    
    const result = {};
    for (const [key, values] of Object.entries(groups)) {
      switch (aggType) {
        case 'sum':
          result[key] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[key] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          result[key] = values.length;
          break;
        case 'max':
          result[key] = Math.max(...values);
          break;
        case 'min':
          result[key] = Math.min(...values);
          break;
      }
    }
    
    return result;
  },
  
  // ===== Dashboard KPI 查询 =====
  
  // 获取KPI卡片数据
  getKPICards(year, month) {
    const data = initializeData();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // 当月订单
    const monthlyOrders = data.orders.orders.filter(o => o.orderDate === dateStr);
    const totalAmount = monthlyOrders.reduce((s, o) => s + o.amount, 0);
    
    // 当月降本
    const monthlyBudget = data.budget.records.find(r => r.date === dateStr);
    const savings = monthlyBudget ? monthlyBudget.actualSavings : 0;
    
    // 预算执行率
    const executionRate = monthlyBudget ? monthlyBudget.executionRate : 0;
    
    // 库存周转天数
    const monthlyInventory = data.inventory.records.filter(r => r.date === dateStr);
    const avgTurnover = monthlyInventory.length > 0 
      ? monthlyInventory.reduce((s, r) => s + r.turnoverDays, 0) / monthlyInventory.length 
      : 0;
    
    return {
      annualProcurement: Math.round(totalAmount * 12 / 100000000 * 100) / 100, // 年化亿元
      savingsAmount: Math.round(savings / 10000), // 万元
      savingsRate: monthlyBudget ? monthlyBudget.savingsAchievement : 0,
      forecastSavings: Math.round(savings * 1.1 / 10000), // 预测
      executionRate,
      materialCostRate: 68.5, // 固定值
      supplierPerformance: 93,
      deliveryRate: 94.2,
      vmiCoverage: 42,
      longTermContractRatio: 58
    };
  },
  
  // 获取P0预警
  getAlerts(year, month) {
    const data = initializeData();
    const alerts = [];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // 价格偏离预警 (模拟)
    const priceData = data.priceHistory.priceHistory.find(p => p.date === dateStr.substring(0, 7));
    if (priceData && priceData.prices.STEEL.spot > priceData.prices.STEEL.contract * 1.05) {
      alerts.push({
        id: 'AL_PRICE_001',
        level: 'high',
        title: '钢材现货价偏离长约价+5.8%',
        message: '当前钢材现货价格显著高于长约锁价，建议加大长约执行比例',
        category: '价格',
        metric: '+5.8%',
        suggestion: '执行长约订单，减少现货采购'
      });
    }
    
    // 预算执行预警
    const monthlyBudget = data.budget.records.find(r => r.date === dateStr);
    if (monthlyBudget && monthlyBudget.alert) {
      alerts.push({
        id: 'AL_SPEND_001',
        level: monthlyBudget.executionRate > 105 ? 'medium' : 'low',
        title: `预算执行率${monthlyBudget.executionRate}%`,
        message: `${monthlyBudget.organizationName}本月预算执行异常`,
        category: '支出',
        metric: `${monthlyBudget.executionRate}%`,
        suggestion: '核查支出合理性，调整后续预算'
      });
    }
    
    // 缺货预警
    const monthlyInventory = data.inventory.records.filter(r => r.date === dateStr && r.stockoutRisk);
    for (const inv of monthlyInventory.slice(0, 1)) {
      alerts.push({
        id: 'AL_INVENTORY_003',
        level: 'high',
        title: `${inv.materialName}缺货风险`,
        message: `库存低于安全库存50%，预计${Math.round(inv.turnoverDays)}天耗尽`,
        category: '库存',
        metric: `${inv.turnoverDays}天`,
        suggestion: '紧急补货，联系供应商加急交付'
      });
    }
    
    return alerts;
  },
  
  // 获取图表数据
  getChartData(chartId, year, month) {
    const data = initializeData();
    const yearStart = `${year}-01-01`;
    const currentDate = `${year}-${String(month).padStart(2, '0')}-01`;
    
    switch (chartId) {
      case 'monthly-savings':
        // 月度降本追踪
        const yearBudget = data.budget.records.filter(r => r.year === year);
        return {
          months: Array.from(new Set(yearBudget.map(r => r.month))).sort(),
          budget: yearBudget.filter(r => r.month).map(r => r.budgetAmount / 10000),
          actual: yearBudget.map(r => r.actualAmount / 10000),
          savings: yearBudget.map(r => r.actualSavings / 10000)
        };
        
      case 'category-spend':
        // 品类支出分布
        const yearOrders = data.orders.orders.filter(o => o.orderDate >= yearStart && o.orderDate <= currentDate);
        return this.groupBy(yearOrders, 'category', 'amount', 'sum');
        
      case 'price-trend':
        // 价格趋势
        const yearPrices = data.priceHistory.priceHistory.filter(p => p.year === year);
        return {
          months: yearPrices.map(p => p.month),
          steel: yearPrices.map(p => p.prices.STEEL.spot),
          plastic: yearPrices.map(p => p.prices.PLASTIC.spot),
          aluminum: yearPrices.map(p => p.prices.ALUMINUM.spot)
        };
        
      case 'supplier-performance':
        // 供应商绩效
        const currentPerf = data.performance.records.filter(r => r.date === currentDate);
        return currentPerf.slice(0, 10).map(p => ({
          name: p.supplierName.substring(0, 6),
          score: p.overallScore,
          delivery: p.deliveryScore,
          quality: p.qualityScore
        }));
        
      default:
        return {};
    }
  }
};

// 数据服务API
const demoDataService = {
  initialize: initializeData,
  queries,
  
  // 重新加载数据
  reload() {
    dataCache = null;
    return initializeData();
  },
  
  // 获取原始数据
  getRawData(type) {
    const data = initializeData();
    return data[type];
  }
};

module.exports = demoDataService;
