/**
 * 数据服务层
 * 统一管理Dashboard数据，提供缓存和状态管理
 */

class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5分钟缓存
    this.listeners = new Map();
    this.loading = false;
    this.error = null;
  }

  // 生成缓存键
  _cacheKey(endpoint, params = {}) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  // 检查缓存是否有效
  _isValidCache(cacheEntry) {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < this.cacheTTL;
  }

  // 获取数据（带缓存）
  async fetchData(endpoint, params = {}, forceRefresh = false) {
    const cacheKey = this._cacheKey(endpoint, params);
    
    // 检查缓存
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (this._isValidCache(cached)) {
        console.log(`[DataService] 使用缓存: ${endpoint}`);
        return cached.data;
      }
    }

    // 发起请求
    this.loading = true;
    this.error = null;
    this._notifyListeners('loading', { endpoint, loading: true });

    try {
      let data;
      
      // 根据endpoint路由到不同API
      switch (endpoint) {
        case 'kpi-cards':
          data = await dashboardAPI.getKPICards();
          break;
        case 'alerts':
          data = await dashboardAPI.getAlerts();
          break;
        case 'rankings':
          data = await dashboardAPI.getRankings();
          break;
        case 'home':
          data = await dashboardAPI.getHomeData();
          break;
        case 'chart':
          data = await dashboardAPI.getChartData(params.chartId, params);
          break;
        default:
          throw new Error(`未知endpoint: ${endpoint}`);
      }

      // 存入缓存
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      this.loading = false;
      this._notifyListeners('data', { endpoint, data });
      this._notifyListeners('loading', { endpoint, loading: false });
      
      return data;
    } catch (error) {
      this.loading = false;
      this.error = error;
      this._notifyListeners('error', { endpoint, error });
      this._notifyListeners('loading', { endpoint, loading: false });
      throw error;
    }
  }

  // 订阅数据更新
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // 返回取消订阅函数
    return () => {
      this.listeners.get(event).delete(callback);
    };
  }

  // 通知监听器
  _notifyListeners(event, payload) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error('监听器执行失败:', err);
        }
      });
    }
  }

  // 清空缓存
  clearCache() {
    this.cache.clear();
    console.log('[DataService] 缓存已清空');
  }

  // 刷新特定数据
  async refresh(endpoint, params = {}) {
    return this.fetchData(endpoint, params, true);
  }

  // 获取加载状态
  isLoading() {
    return this.loading;
  }

  // 获取错误信息
  getError() {
    return this.error;
  }
}

// 创建全局实例
const dataService = new DataService();

// 便捷方法
const DataAPI = {
  // KPI数据
  async getKPICards() {
    return dataService.fetchData('kpi-cards');
  },

  // 预警数据
  async getAlerts() {
    return dataService.fetchData('alerts');
  },

  // 排名数据
  async getRankings() {
    return dataService.fetchData('rankings');
  },

  // 首页完整数据
  async getHomeData() {
    return dataService.fetchData('home');
  },

  // 图表数据
  async getChartData(chartId, params = {}) {
    return dataService.fetchData('chart', { chartId, ...params });
  },

  // 刷新数据
  async refresh(endpoint) {
    return dataService.refresh(endpoint);
  },

  // 订阅
  subscribe(event, callback) {
    return dataService.subscribe(event, callback);
  }
};

// 导出
window.DataService = DataService;
window.dataService = dataService;
window.DataAPI = DataAPI;
