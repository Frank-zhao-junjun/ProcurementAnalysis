import { buildRuntimeContext } from './context-bridge.js';

const SHELL_ROOT_ID = 'ai-assistant-wrapper';

const DEFAULT_SUGGESTIONS = [
  '本周最差 3 项指标',
  '当前 P0 预警怎么处理',
  '这张图的结论和原因',
  '给我一条晨会汇报口径'
];

function dedupeSuggestions(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildSelectedEntityLabel(selectedEntity) {
  if (!selectedEntity) {
    return '';
  }

  if (selectedEntity.type === 'kpi') {
    return `当前焦点: KPI ${selectedEntity.name}`;
  }

  if (selectedEntity.type === 'chart') {
    const detail = [selectedEntity.name, selectedEntity.seriesName].filter(Boolean).join(' / ');
    return detail ? `当前焦点: 图表点 ${detail}` : '当前焦点: 图表点';
  }

  if (selectedEntity.name) {
    return `当前焦点: ${selectedEntity.name}`;
  }

  return '';
}

/**
 * Build up to four context-aware starter prompts from the current dashboard snapshot.
 *
 * @param {object} snapshot Dashboard state snapshot.
 * @param {string[]} [fallbackSuggestions=DEFAULT_SUGGESTIONS] Default suggestions used when no focus exists.
 * @returns {string[]}
 */
export function createContextAwareSuggestions(snapshot, fallbackSuggestions = DEFAULT_SUGGESTIONS) {
  const selectedEntity = snapshot?.ui?.selectedEntity;

  if (!selectedEntity) {
    return fallbackSuggestions.slice();
  }

  if (selectedEntity.type === 'kpi') {
    return dedupeSuggestions([
      `解释一下 ${selectedEntity.name} 的当前表现和原因`,
      `${selectedEntity.name} 如果继续恶化，优先看什么`,
      `给我一条关于 ${selectedEntity.name} 的晨会汇报口径`,
      ...fallbackSuggestions
    ]).slice(0, 4);
  }

  if (selectedEntity.type === 'chart') {
    return dedupeSuggestions([
      `分析 ${selectedEntity.name} 这个点位的变化原因和建议动作`,
      `${selectedEntity.name} 对当前模块结论有什么影响`,
      `围绕 ${selectedEntity.name} 还需要追问哪些风险信号`,
      ...fallbackSuggestions
    ]).slice(0, 4);
  }

  return fallbackSuggestions.slice();
}

/**
 * Build a short context hint shown at the top of the assistant panel.
 *
 * @param {object} runtimeContext Runtime context derived from the dashboard state bus.
 * @returns {string}
 */
export function buildAssistantContextHint(runtimeContext) {
  const parts = [`当前上下文: ${runtimeContext.activeModule || '首页驾驶舱'}`];
  const selectedEntityLabel = buildSelectedEntityLabel(runtimeContext.selectedEntity);

  if (selectedEntityLabel) {
    parts.push(selectedEntityLabel);
  }

  return parts.join(' | ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTextContent(value) {
  return escapeHtml(value || '').replace(/\n/g, '<br/>');
}

function createDefaultReply(runtimeContext, message) {
  return {
    degraded: true,
    reply: {
      content: `当前为前端演示壳层，已读取 ${runtimeContext.activeModule || '当前模块'} 上下文。问题“${message}”将在后续接入代理服务后交给后端处理。`,
      metadata: {
        degraded: true
      }
    }
  };
}

function normalizeReply(response) {
  if (typeof response === 'string') {
    return {
      content: formatTextContent(response),
      degraded: false
    };
  }

  const content = response?.reply?.content ?? response?.content ?? '暂时无法返回分析结果。';
  const degraded = Boolean(response?.degraded || response?.reply?.metadata?.degraded);

  return {
    content: formatTextContent(content),
    degraded
  };
}

function renderMessageMarkup(messages, isTyping) {
  const items = messages.map((message) => {
    if (message.type === 'user') {
      return `<div class="ai-msg ai-msg-user">${formatTextContent(message.content)}</div>`;
    }

    const degradedTag = message.degraded ? '<div class="ai-msg-status">降级模式</div>' : '';
    return `<div class="ai-msg ai-msg-bot">${degradedTag}${message.content}</div>`;
  });

  if (isTyping) {
    items.push('<div class="ai-typing"><span></span><span></span><span></span></div>');
  }

  return items.join('');
}

function renderSuggestionMarkup(suggestions) {
  return suggestions
    .map((question) => `<button type="button" class="ai-tag" data-ai-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`)
    .join('');
}

function isDomContainer(node) {
  return Boolean(node && typeof node.appendChild === 'function' && typeof node.querySelector === 'function');
}

/**
 * Create a sender that forwards assistant prompts to the backend proxy.
 *
 * @param {object} [options]
 * @param {string} [options.endpoint] Proxy endpoint URL.
 * @param {Function} [options.getAuthToken] Token resolver used before each request.
 * @param {Function} [options.fetchImpl] Fetch implementation for production or tests.
 * @returns {Function}
 */
export function createProxyMessageSender({
  endpoint = 'http://localhost:3000/api/ai-proxy/chat',
  getAuthToken = () => (typeof window !== 'undefined' ? window.__AI_JWT__ : null),
  fetchImpl = (...args) => fetch(...args)
} = {}) {
  return async function sendProxyMessage({ message, runtimeContext }) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('AI auth token is required');
    }

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message, runtimeContext })
    });

    if (!response.ok) {
      throw new Error(`AI proxy request failed with status ${response.status}`);
    }

    return response.json();
  };
}

/**
 * Create the floating assistant shell that binds UI state, privacy gating, and messaging.
 *
 * @param {object} [options]
 * @param {object} options.stateBus Dashboard state bus used to derive runtime context.
 * @param {object} [options.mountNode] DOM-like container or headless target for rendering.
 * @param {object|null} [options.privacyGate] Consent gate checked before open/send actions.
 * @param {Function} [options.onSendMessage] Message handler invoked with the runtime context.
 * @param {string[]} [options.suggestions] Default suggestion labels.
 * @returns {{mount: Function, destroy: Function, open: Function, close: Function, sendMessage: Function, getState: Function}}
 */
export function createAssistantShell({
  stateBus,
  mountNode,
  privacyGate = null,
  onSendMessage = async ({ message, runtimeContext }) => createDefaultReply(runtimeContext, message),
  suggestions = DEFAULT_SUGGESTIONS
} = {}) {
  if (!stateBus) {
    throw new Error('stateBus is required');
  }

  const shellState = {
    open: false,
    messages: [],
    isTyping: false
  };

  let rootNode = mountNode;
  let unsubscribe = () => {};

  function ensureWelcomeMessage() {
    if (shellState.messages.length > 0) {
      return;
    }

    shellState.messages.push({
      type: 'bot',
      content: '你好，我是采购智能助手。当前已接入统一页面状态，可结合当前模块、图表焦点和指标上下文继续扩展。',
      degraded: false
    });
  }

  function renderHeadless() {
    if (!rootNode) {
      return;
    }

    rootNode.innerHTML = renderMessageMarkup(shellState.messages, shellState.isTyping);
  }

  function getDomRefs() {
    return {
      wrapper: rootNode.querySelector(`#${SHELL_ROOT_ID}`),
      panel: rootNode.querySelector('#ai-panel'),
      messages: rootNode.querySelector('#ai-messages'),
      input: rootNode.querySelector('#ai-input'),
      context: rootNode.querySelector('#ai-context-hint'),
      suggestions: rootNode.querySelector('#ai-suggestions')
    };
  }

  function renderDom() {
    const refs = getDomRefs();
    if (!refs.wrapper) {
      return;
    }

    const snapshot = stateBus.getSnapshot();
    const runtimeContext = buildRuntimeContext(snapshot);
    refs.panel.style.display = shellState.open ? 'flex' : 'none';
    refs.panel.classList.toggle('show', shellState.open);
    refs.context.textContent = buildAssistantContextHint(runtimeContext);
    refs.messages.innerHTML = renderMessageMarkup(shellState.messages, shellState.isTyping);
    refs.suggestions.innerHTML = renderSuggestionMarkup(createContextAwareSuggestions(snapshot, suggestions));
    refs.messages.scrollTop = refs.messages.scrollHeight;
  }

  function render() {
    if (isDomContainer(rootNode)) {
      renderDom();
      return;
    }

    renderHeadless();
  }

  function setOpen(open) {
    shellState.open = open;
    if (open) {
      ensureWelcomeMessage();
    }
    render();

    if (open && isDomContainer(rootNode)) {
      const refs = getDomRefs();
      refs.input?.focus();
    }
  }

  async function sendMessage(rawMessage) {
    const message = String(rawMessage || '').trim();
    if (!message) {
      return null;
    }

    if (privacyGate && !privacyGate.hasConsent()) {
      const accepted = await privacyGate.requestConsent();
      if (!accepted) {
        return null;
      }
    }

    const runtimeContext = buildRuntimeContext(stateBus.getSnapshot());
    shellState.messages.push({ type: 'user', content: message });
    shellState.isTyping = true;
    render();

    try {
      const response = await onSendMessage({ message, runtimeContext });
      const normalizedReply = normalizeReply(response);
      shellState.messages.push({
        type: 'bot',
        content: normalizedReply.content,
        degraded: normalizedReply.degraded
      });
      return response;
    } catch (_error) {
      const fallbackReply = normalizeReply(createDefaultReply(runtimeContext, message));
      shellState.messages.push({
        type: 'bot',
        content: fallbackReply.content,
        degraded: true
      });
      return null;
    } finally {
      shellState.isTyping = false;
      render();
    }
  }

  function bindDomEvents() {
    const refs = getDomRefs();
    rootNode.querySelector('#ai-toggle-btn')?.addEventListener('click', async () => {
      if (shellState.open) {
        setOpen(false);
        return;
      }

      await api.open();
    });
    rootNode.querySelector('#ai-close-btn')?.addEventListener('click', () => setOpen(false));
    rootNode.querySelector('#ai-send-btn')?.addEventListener('click', () => {
      sendMessage(refs.input?.value || '');
      if (refs.input) {
        refs.input.value = '';
      }
    });
    refs.input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const value = refs.input.value;
        refs.input.value = '';
        sendMessage(value);
      }
    });

    rootNode.querySelector('#ai-suggestions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-ai-question]');
      if (!button) {
        return;
      }

      sendMessage(button.dataset.aiQuestion || '');
    });
  }

  function mount() {
    if (!isDomContainer(rootNode)) {
      render();
      return api;
    }

    const wrapper = document.createElement('div');
    wrapper.id = SHELL_ROOT_ID;
    wrapper.innerHTML = `
      <div id="ai-toggle-btn" title="AI智能助手">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12L8 16"></path><circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span class="ai-badge">AI</span>
      </div>
      <div id="ai-panel" style="display:none;">
        <div id="ai-panel-header">
          <div><span class="ai-icon">&#129302;</span> 采购智能助手</div>
          <button id="ai-close-btn" title="关闭">&times;</button>
        </div>
        <div id="ai-context-hint"></div>
        <div id="ai-messages"></div>
        <div id="ai-input-row">
          <input type="text" id="ai-input" placeholder="输入问题，如：当前模块最值得关注的风险是什么？" autocomplete="off" />
          <button id="ai-send-btn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div id="ai-suggestions">
          ${renderSuggestionMarkup(suggestions)}
        </div>
      </div>`;

    rootNode.appendChild(wrapper);
    bindDomEvents();
    unsubscribe = stateBus.subscribe(() => renderDom());
    renderDom();
    return api;
  }

  function destroy() {
    unsubscribe();
    if (isDomContainer(rootNode)) {
      rootNode.querySelector(`#${SHELL_ROOT_ID}`)?.remove();
    } else if (rootNode) {
      rootNode.innerHTML = '';
    }
  }

  const api = {
    mount,
    destroy,
    async open() {
      if (privacyGate && !privacyGate.hasConsent()) {
        const accepted = await privacyGate.requestConsent();
        if (!accepted) {
          return false;
        }
      }

      setOpen(true);
      return true;
    },
    close() {
      setOpen(false);
    },
    sendMessage,
    getState() {
      const snapshot = stateBus.getSnapshot();
      const runtimeContext = buildRuntimeContext(snapshot);

      return {
        ...shellState,
        messages: shellState.messages.map((message) => ({ ...message })),
        suggestions: createContextAwareSuggestions(snapshot, suggestions),
        contextHint: buildAssistantContextHint(runtimeContext)
      };
    }
  };

  return api;
}

/**
 * Boot the assistant shell on document.body and return the mounted API.
 *
 * @param {object} [options]
 * @returns {{mount: Function, destroy: Function, open: Function, close: Function, sendMessage: Function, getState: Function}}
 */
export function bootAssistantShell(options = {}) {
  const shell = createAssistantShell({
    mountNode: document.body,
    ...options
  });

  return shell.mount();
}

if (typeof window !== 'undefined') {
  window.PIDashboardAI = {
    ...(window.PIDashboardAI || {}),
    createAssistantShell,
    bootAssistantShell,
    createProxyMessageSender,
    createContextAwareSuggestions,
    buildAssistantContextHint
  };
}