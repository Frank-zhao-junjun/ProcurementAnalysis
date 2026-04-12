/**
 * API 客户端
 * 封装 fetch 请求，统一错误处理
 */

const API_BASE_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000/api' 
  : '/api';

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API请求失败: ${url}`, error);
      throw error;
    }
  }

  // GET 请求
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST 请求
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Dashboard API 封装
const dashboardAPI = {
  client: new ApiClient(),

  // 获取KPI卡片数据
  async getKPICards() {
    return this.client.get('/dashboard/kpi-cards');
  },

  // 获取P0预警
  async getAlerts() {
    return this.client.get('/dashboard/alerts');
  },

  // 获取组织排名
  async getRankings() {
    return this.client.get('/dashboard/rankings');
  },

  // 获取图表数据
  async getChartData(chartId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/dashboard/charts/${chartId}${queryString ? '?' + queryString : ''}`;
    return this.client.get(endpoint);
  },

  // 获取首页完整数据
  async getHomeData() {
    return this.client.get('/dashboard/home');
  }
};

// WhatIf API 封装
const whatifAPI = {
  client: new ApiClient(),

  // 获取基线数据
  async getBaseline() {
    return this.client.get('/whatif/baseline');
  },

  // 执行模拟计算
  async simulate(params) {
    return this.client.post('/whatif/simulate', params);
  },

  // 保存情景
  async saveScenario(scenario) {
    return this.client.post('/whatif/scenarios', scenario);
  },

  // 获取历史情景
  async getScenarios() {
    return this.client.get('/whatif/scenarios');
  }
};

// 导出
window.ApiClient = ApiClient;
window.dashboardAPI = dashboardAPI;
window.whatifAPI = whatifAPI;
