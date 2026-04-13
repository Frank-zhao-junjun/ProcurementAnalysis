/**
 * Dashboard 数据初始化模块
 * 从API加载数据并更新前端展示
 */

(function() {
  'use strict';

  // 配置（与 api/client.js 一致：优先 window.__API_BASE_URL__ / __PI_API_BASE__）
  const CONFIG = {
    API_BASE_URL:
      (typeof window !== 'undefined' && window.__PI_API_BASE__) ||
      (typeof window !== 'undefined' && window.__API_BASE_URL__
        ? String(window.__API_BASE_URL__).replace(/\/?$/, '')
        : null) ||
      (window.location.origin.includes('localhost') || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : `${window.location.origin}/api`),
    DEFAULT_YEAR: 2025,
    DEFAULT_MONTH: 6,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000
  };

  // 工具函数
  const utils = {
    // 格式化金额
    formatAmount(value, unit = '万') {
      if (value === null || value === undefined) return '--';
      const num = Number(value);
      if (unit === '亿') return (num / 100000000).toFixed(2);
      if (unit === '万') return Math.round(num / 10000).toLocaleString();
      return num.toLocaleString();
    },

    // 格式化百分比
    formatPercent(value, digits = 1) {
      if (value === null || value === undefined) return '--';
      return Number(value).toFixed(digits) + '%';
    },

    // 获取趋势箭头
    getTrendArrow(value) {
      if (value > 0) return '<span class="trend-up">▲</span>';
      if (value < 0) return '<span class="trend-down">▼</span>';
      return '<span class="trend-flat">—</span>';
    },

    // 延迟函数
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };

  // API请求封装
  const api = {
    async request(endpoint, options = {}) {
      const url = `${CONFIG.API_BASE_URL}${endpoint}`;
      
      for (let attempt = 1; attempt <= CONFIG.RETRY_COUNT; attempt++) {
        try {
          const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          return result.data || result;
        } catch (error) {
          console.warn(`API请求失败 (${attempt}/${CONFIG.RETRY_COUNT}):`, error);
          if (attempt === CONFIG.RETRY_COUNT) throw error;
          await utils.delay(CONFIG.RETRY_DELAY * attempt);
        }
      }
    },

    // 获取KPI数据
    getKPICards(year = CONFIG.DEFAULT_YEAR, month = CONFIG.DEFAULT_MONTH) {
      return this.request(`/dashboard/kpi-cards?year=${year}&month=${month}`);
    },

    // 获取预警数据
    getAlerts(year = CONFIG.DEFAULT_YEAR, month = CONFIG.DEFAULT_MONTH) {
      return this.request(`/dashboard/alerts?year=${year}&month=${month}`);
    },

    // 获取排名数据
    getRankings() {
      return this.request('/dashboard/rankings');
    },

    // 获取图表数据
    getChartData(chartId, year = CONFIG.DEFAULT_YEAR, month = CONFIG.DEFAULT_MONTH) {
      return this.request(`/dashboard/charts/${chartId}?year=${year}&month=${month}`);
    }
  };

  /** 广播 KPI 快照供 AI runtimeContext / 其他模块订阅（Ralph US-002） */
  function emitKpiSnapshot(kpis, source) {
    try {
      window.dispatchEvent(new CustomEvent('pi-dashboard-kpi-sync', {
        detail: {
          kpis,
          source: source || 'dashboard-init',
          updatedAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.warn('[DashboardInit] pi-dashboard-kpi-sync:', err);
    }
  }

  // 页面更新器
  const pageUpdater = {
    // 更新KPI卡片
    updateKPICards(data) {
      if (!data) return;

      // 年度采购额
      const annualAmountEl = document.querySelector('.kpi-annual-amount .kpi-value');
      if (annualAmountEl) {
        annualAmountEl.innerHTML = `${utils.formatAmount(data.annualProcurement, '亿')}<span class="unit">亿</span>`;
      }

      // 降本额
      const savingsEl = document.querySelector('.kpi-savings .kpi-value');
      if (savingsEl) {
        savingsEl.innerHTML = `${utils.formatAmount(data.savingsAmount)}<span class="unit">万</span>`;
      }

      // 降本比例
      const savingsRateEl = document.querySelector('.kpi-savings-rate .kpi-value');
      if (savingsRateEl) {
        savingsRateEl.innerHTML = `${data.savingsRate}<span class="unit">%</span>`;
      }

      // 预测降本
      const forecastEl = document.querySelector('.kpi-forecast .kpi-value');
      if (forecastEl) {
        forecastEl.innerHTML = `${utils.formatAmount(data.forecastSavings)}<span class="unit">万</span>`;
      }

      // 预算执行率
      const execRateEl = document.querySelector('.kpi-execution-rate .kpi-value');
      if (execRateEl) {
        execRateEl.innerHTML = `${data.executionRate}<span class="unit">%</span>`;
      }

      // 供应商绩效
      const perfEl = document.querySelector('.kpi-supplier-performance .kpi-value');
      if (perfEl) {
        perfEl.textContent = data.supplierPerformance;
      }

      // 交付及时率
      const deliveryEl = document.querySelector('.kpi-delivery-rate .kpi-value');
      if (deliveryEl) {
        deliveryEl.innerHTML = `${data.deliveryRate}<span class="unit">%</span>`;
      }

      // VMI覆盖率
      const vmiEl = document.querySelector('.kpi-vmi-coverage .kpi-value');
      if (vmiEl) {
        vmiEl.innerHTML = `${data.vmiCoverage}<span class="unit">%</span>`;
      }

      // 长约占比
      const longTermEl = document.querySelector('.kpi-long-term-ratio .kpi-value');
      if (longTermEl) {
        longTermEl.innerHTML = `${data.longTermContractRatio}<span class="unit">%</span>`;
      }
    },

    // 更新预警面板
    updateAlerts(alerts) {
      const container = document.querySelector('.p0-alerts-container');
      if (!container || !alerts) return;

      if (alerts.length === 0) {
        container.innerHTML = '<div class="alert-empty">暂无预警</div>';
        return;
      }

      container.innerHTML = alerts.map(alert => `
        <div class="alert-item alert-${alert.level}" data-alert-id="${alert.id}">
          <div class="alert-header">
            <span class="alert-code">${alert.id}</span>
            <span class="alert-badge alert-badge-${alert.level}">${alert.level === 'high' ? '高危' : alert.level === 'medium' ? '中危' : '正常'}</span>
          </div>
          <div class="alert-title">${alert.title}</div>
          <div class="alert-message">${alert.message}</div>
          <div class="alert-metric">${alert.metric}</div>
          ${alert.suggestion ? `<div class="alert-suggestion">建议: ${alert.suggestion}</div>` : ''}
        </div>
      `).join('');
    },

    // 更新组织排名
    updateRankings(data) {
      if (!data || !data.bySavings) return;

      // 事业部降本排名
      const buRankingEl = document.querySelector('.bu-ranking');
      if (buRankingEl) {
        buRankingEl.innerHTML = data.bySavings.slice(0, 4).map((org, index) => `
          <div class="ranking-item">
            <div class="ranking-number">${index + 1}</div>
            <div class="ranking-name">${org.name}</div>
            <div class="ranking-value">${org.savingsRate}%</div>
          </div>
        `).join('');
      }

      // 子公司降本排名
      const subRankingEl = document.querySelector('.subsidiary-ranking');
      if (subRankingEl) {
        const subsidiaries = data.bySavings.filter(o => o.code.startsWith('SUB_'));
        subRankingEl.innerHTML = subsidiaries.slice(0, 5).map((org, index) => `
          <div class="ranking-item">
            <div class="ranking-number">${index + 1}</div>
            <div class="ranking-name">${org.name}</div>
            <div class="ranking-value">${org.savingsRate}%</div>
          </div>
        `).join('');
      }
    },

    // 更新图表数据
    async updateCharts() {
      // 这里可以添加图表数据更新逻辑
      // 暂时保持原有硬编码图表不变
      console.log('[DashboardInit] 图表数据保持原有配置');
    }
  };

  // 主初始化函数
  async function initDashboard() {
    console.log('[DashboardInit] 开始初始化Dashboard数据...');

    // 显示全屏Loading
    const loading = window.LoadingManager?.showFullscreen('系统初始化中...');

    try {
      // 并行获取数据
      loading?.updateText('加载KPI数据...');
      loading?.updateProgress(20);

      const [kpiData, alertsData, rankingsData] = await Promise.all([
        api.getKPICards(),
        api.getAlerts(),
        api.getRankings()
      ]);

      loading?.updateText('更新页面数据...');
      loading?.updateProgress(60);

      // 更新页面
      pageUpdater.updateKPICards(kpiData);
      emitKpiSnapshot(kpiData, 'api');
      pageUpdater.updateAlerts(alertsData);
      pageUpdater.updateRankings(rankingsData);

      loading?.updateText('加载图表...');
      loading?.updateProgress(80);

      await pageUpdater.updateCharts();

      loading?.updateProgress(100);
      loading?.hide();

      console.log('[DashboardInit] Dashboard初始化完成!');

      // 设置定时刷新
      setInterval(async () => {
        console.log('[DashboardInit] 定时刷新数据...');
        const [freshKPI, freshAlerts] = await Promise.all([
          api.getKPICards(),
          api.getAlerts()
        ]);
        pageUpdater.updateKPICards(freshKPI);
        emitKpiSnapshot(freshKPI, 'api-poll');
        pageUpdater.updateAlerts(freshAlerts);
      }, 5 * 60 * 1000); // 5分钟刷新

    } catch (error) {
      console.error('[DashboardInit] 初始化失败:', error);
      loading?.updateText('数据加载失败，使用备用数据...');
      
      // 使用本地备用数据
      await useFallbackData();
      
      setTimeout(() => loading?.hide(), 1000);
    }
  }

  // 备用数据（本地JSON）
  async function useFallbackData() {
    try {
      console.log('[DashboardInit] 使用本地备用数据...');
      
      // 从本地JSON文件加载
      const response = await fetch('/data/data-report.json');
      const report = await response.json();
      
      // 生成简化的KPI数据
      const fallbackData = {
        annualProcurement: report.summary.totalAmountYi || 42.57,
        savingsAmount: 1240,
        savingsRate: 5.2,
        forecastSavings: 1450,
        executionRate: 93.6,
        materialCostRate: 68.5,
        supplierPerformance: 93,
        deliveryRate: 94.2,
        vmiCoverage: 42,
        longTermContractRatio: 58
      };
      
      pageUpdater.updateKPICards(fallbackData);
      emitKpiSnapshot(fallbackData, 'fallback-json');
      
    } catch (err) {
      console.warn('[DashboardInit] 备用数据也失败了:', err);
    }
  }

  // 暴露到全局
  window.DashboardInit = {
    init: initDashboard,
    api,
    utils,
    refresh: async () => {
      const [kpi, alerts, rankings] = await Promise.all([
        api.getKPICards(),
        api.getAlerts(),
        api.getRankings()
      ]);
      pageUpdater.updateKPICards(kpi);
      emitKpiSnapshot(kpi, 'manual-refresh');
      pageUpdater.updateAlerts(alerts);
      pageUpdater.updateRankings(rankings);
      return { kpi, alerts, rankings };
    }
  };

})();
