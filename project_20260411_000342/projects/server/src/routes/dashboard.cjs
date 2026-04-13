/**
 * Dashboard API路由
 * 提供Dashboard所需的所有数据接口
 */

const express = require('express');
const router = express.Router();
const demoData = require('../demo-data/index.cjs');

// 初始化数据
demoData.initialize();

/**
 * GET /api/dashboard/kpi-cards
 * 获取首页10个KPI卡片数据
 */
router.get('/kpi-cards', (req, res) => {
  try {
    const { year = 2025, month = 6 } = req.query;
    const data = demoData.queries.getKPICards(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取KPI数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/alerts
 * 获取P0预警数据
 */
router.get('/alerts', (req, res) => {
  try {
    const { year = 2025, month = 6 } = req.query;
    const data = demoData.queries.getAlerts(parseInt(year), parseInt(month));
    res.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取预警数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/rankings
 * 获取组织排名数据
 */
router.get('/rankings', (req, res) => {
  try {
    const rawData = demoData.getRawData('budget');
    const records = rawData.records;
    
    // 按组织聚合年度数据
    const orgData = {};
    for (const r of records) {
      if (r.year === 2025) {
        if (!orgData[r.organizationCode]) {
          orgData[r.organizationCode] = {
            code: r.organizationCode,
            name: r.organizationName,
            budget: 0,
            actual: 0,
            savings: 0
          };
        }
        orgData[r.organizationCode].budget += r.budgetAmount;
        orgData[r.organizationCode].actual += r.actualAmount;
        orgData[r.organizationCode].savings += r.actualSavings;
      }
    }
    
    // 计算降本率并排序
    const rankings = Object.values(orgData).map(o => ({
      ...o,
      savingsRate: o.budget > 0 ? Math.round((o.savings / o.budget) * 10000) / 100 : 0,
      executionRate: o.budget > 0 ? Math.round((o.actual / o.budget) * 1000) / 10 : 0
    })).sort((a, b) => b.savingsRate - a.savingsRate);
    
    res.json({
      success: true,
      data: {
        bySavings: rankings,
        byExecution: [...rankings].sort((a, b) => b.executionRate - a.executionRate)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取排名数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/charts/:chartId
 * 获取图表数据
 */
router.get('/charts/:chartId', (req, res) => {
  try {
    const { chartId } = req.params;
    const { year = 2025, month = 6 } = req.query;
    
    const data = demoData.queries.getChartData(
      chartId, 
      parseInt(year), 
      parseInt(month)
    );
    
    res.json({
      success: true,
      chartId,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`获取图表数据失败 [${req.params.chartId}]:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/home
 * 获取首页完整数据（合并多个接口）
 */
router.get('/home', async (req, res) => {
  try {
    const { year = 2025, month = 6 } = req.query;
    const y = parseInt(year);
    const m = parseInt(month);
    
    // 并行获取所有数据
    const [kpiCards, alerts, rankings] = await Promise.all([
      Promise.resolve(demoData.queries.getKPICards(y, m)),
      Promise.resolve(demoData.queries.getAlerts(y, m)),
      Promise.resolve(demoData.queries.groupBy(
        demoData.getRawData('budget').records.filter(r => r.year === y),
        'organizationCode',
        'actualSavings',
        'sum'
      ))
    ]);
    
    res.json({
      success: true,
      data: {
        kpiCards,
        alerts,
        rankings
      },
      meta: {
        year: y,
        month: m,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取首页数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/tab/:tabId
 * 获取指定Tab的数据
 */
router.get('/tab/:tabId', (req, res) => {
  try {
    const { tabId } = req.params;
    const { year = 2025, month = 6 } = req.query;
    
    // 根据Tab ID返回不同数据
    const tabDataMap = {
      'cost-savings': ['monthly-savings', 'bu-savings', 'category-savings'],
      'spend-analysis': ['category-spend', 'price-deviation', 'supplier-concentration'],
      'price-trend': ['price-history', 'futures-price', 'macro-indicators'],
      'demand-forecast': ['consumption-trend', 'inventory-health', 'demand-forecast'],
      'material-cost': ['cost-rate-trend', 'bu-cost-rate'],
      'opportunities': ['small-suppliers', 'tail-analysis'],
      'supplier': ['supplier-performance', 'supplier-risk', 'supplier-ranking']
    };
    
    const charts = tabDataMap[tabId] || [];
    const results = {};
    
    for (const chartId of charts) {
      results[chartId] = demoData.queries.getChartData(
        chartId, 
        parseInt(year), 
        parseInt(month)
      );
    }
    
    res.json({
      success: true,
      tabId,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`获取Tab数据失败 [${req.params.tabId}]:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
