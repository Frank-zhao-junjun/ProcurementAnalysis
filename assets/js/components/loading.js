/**
 * 加载动画组件
 * 科技风Loading动画，匹配Dashboard设计风格
 */

class LoadingComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.options = {
      text: options.text || '数据加载中...',
      size: options.size || 'medium', // small, medium, large
      showProgress: options.showProgress !== false,
      ...options
    };
    this.element = null;
    this.progress = 0;
  }

  // 创建Loading HTML
  createHTML() {
    const sizeClass = `loading-${this.options.size}`;
    
    return `
      <div class="loading-overlay ${sizeClass}">
        <div class="loading-content">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <div class="loading-text">${this.options.text}</div>
          ${this.options.showProgress ? `
            <div class="loading-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${this.progress}%"></div>
              </div>
              <div class="progress-text">${this.progress}%</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 添加样式
  addStyles() {
    if (document.getElementById('loading-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'loading-styles';
    styles.textContent = `
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 14, 26, 0.9);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: 12px;
      }
      
      .loading-content {
        text-align: center;
        padding: 24px;
      }
      
      .loading-spinner {
        position: relative;
        width: 60px;
        height: 60px;
        margin: 0 auto 16px;
      }
      
      .spinner-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 2px solid transparent;
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 1.2s linear infinite;
      }
      
      .spinner-ring:nth-child(2) {
        width: 80%;
        height: 80%;
        top: 10%;
        left: 10%;
        border-top-color: #6366f1;
        animation-duration: 1s;
        animation-direction: reverse;
      }
      
      .spinner-ring:nth-child(3) {
        width: 60%;
        height: 60%;
        top: 20%;
        left: 20%;
        border-top-color: #a78bfa;
        animation-duration: 0.8s;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .loading-text {
        color: #94a3b8;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
      }
      
      .loading-progress {
        width: 200px;
        margin: 0 auto;
      }
      
      .progress-bar {
        height: 4px;
        background: rgba(56, 189, 248, 0.2);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #38bdf8, #6366f1);
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        color: #38bdf8;
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
      }
      
      /* 尺寸变体 */
      .loading-small .loading-spinner {
        width: 32px;
        height: 32px;
      }
      .loading-small .loading-text {
        font-size: 12px;
      }
      
      .loading-large .loading-spinner {
        width: 80px;
        height: 80px;
      }
      .loading-large .loading-text {
        font-size: 16px;
      }
      
      /* 全屏Loading */
      .loading-fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 0;
      }
    `;
    
    document.head.appendChild(styles);
  }

  // 显示Loading
  show() {
    this.addStyles();
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.innerHTML = this.createHTML();
      this.container.style.position = 'relative';
      this.container.appendChild(this.element.firstElementChild);
    }
    return this;
  }

  // 更新进度
  updateProgress(percent) {
    this.progress = Math.min(100, Math.max(0, percent));
    if (this.container) {
      const fill = this.container.querySelector('.progress-fill');
      const text = this.container.querySelector('.progress-text');
      if (fill) fill.style.width = `${this.progress}%`;
      if (text) text.textContent = `${this.progress}%`;
    }
    return this;
  }

  // 更新文字
  updateText(text) {
    if (this.container) {
      const textEl = this.container.querySelector('.loading-text');
      if (textEl) textEl.textContent = text;
    }
    return this;
  }

  // 隐藏Loading
  hide() {
    if (this.container) {
      const overlay = this.container.querySelector('.loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
      }
    }
    return this;
  }
}

// 全局Loading管理
const LoadingManager = {
  // 显示全屏Loading
  showFullscreen(text = '系统初始化中...') {
    const loading = new LoadingComponent(document.body, {
      text,
      size: 'large',
      showProgress: true
    });
    loading.container.classList.add('loading-fullscreen');
    return loading.show();
  },

  // 显示卡片Loading
  showCard(container, text = '加载中...') {
    return new LoadingComponent(container, {
      text,
      size: 'small',
      showProgress: false
    }).show();
  },

  // 显示图表Loading
  showChart(chartContainer, text = '图表加载中...') {
    return new LoadingComponent(chartContainer, {
      text,
      size: 'medium',
      showProgress: true
    }).show();
  }
};

// 导出
window.LoadingComponent = LoadingComponent;
window.LoadingManager = LoadingManager;
