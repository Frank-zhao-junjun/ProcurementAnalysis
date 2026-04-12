const CONSENT_STORAGE_KEY = 'aiPrivacyAccepted';

function getDefaultStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };
}

function isDomContainer(node) {
  return Boolean(node && typeof node.appendChild === 'function' && typeof node.querySelector === 'function');
}

export function createAiPrivacyGate({
  storage = getDefaultStorage(),
  mountNode = typeof document !== 'undefined' ? document.body : null,
  storageKey = CONSENT_STORAGE_KEY
} = {}) {
  let consentGranted = storage.getItem(storageKey) === 'true';
  let pendingResolve = null;
  let modalRoot = null;

  function hasConsent() {
    return consentGranted || storage.getItem(storageKey) === 'true';
  }

  function grantConsent({ remember = false } = {}) {
    consentGranted = true;
    if (remember) {
      storage.setItem(storageKey, 'true');
    }
    closeModal(true);
  }

  function denyConsent() {
    consentGranted = false;
    storage.removeItem(storageKey);
    closeModal(false);
  }

  function closeModal(result) {
    if (modalRoot) {
      modalRoot.classList.remove('active');
    }

    if (pendingResolve) {
      pendingResolve(result);
      pendingResolve = null;
    }
  }

  function ensureModal() {
    if (!isDomContainer(mountNode) || modalRoot) {
      return;
    }

    modalRoot = document.createElement('div');
    modalRoot.id = 'ai-privacy-modal';
    modalRoot.innerHTML = `
      <div class="ai-privacy-overlay"></div>
      <div class="ai-privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-privacy-title">
        <h3 id="ai-privacy-title">使用前确认</h3>
        <p>AI 助手会发送你的问题和当前页面上下文到代理服务，用于生成分析建议。请勿输入未脱敏的生产敏感信息。</p>
        <label class="ai-privacy-remember">
          <input type="checkbox" id="ai-privacy-remember" />
          记住我的选择
        </label>
        <div class="ai-privacy-actions">
          <button type="button" class="ai-privacy-btn ai-privacy-btn-secondary" data-action="deny">暂不使用</button>
          <button type="button" class="ai-privacy-btn ai-privacy-btn-primary" data-action="accept">同意并使用</button>
        </div>
      </div>`;

    mountNode.appendChild(modalRoot);
    modalRoot.querySelector('[data-action="deny"]')?.addEventListener('click', () => denyConsent());
    modalRoot.querySelector('[data-action="accept"]')?.addEventListener('click', () => {
      const remember = Boolean(modalRoot.querySelector('#ai-privacy-remember')?.checked);
      grantConsent({ remember });
    });
    modalRoot.querySelector('.ai-privacy-overlay')?.addEventListener('click', () => denyConsent());
  }

  function requestConsent() {
    if (hasConsent()) {
      return Promise.resolve(true);
    }

    ensureModal();

    if (!modalRoot) {
      return Promise.resolve(false);
    }

    modalRoot.classList.add('active');
    return new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  return {
    hasConsent,
    grantConsent,
    denyConsent,
    requestConsent
  };
}

if (typeof window !== 'undefined') {
  window.PIDashboardAI = {
    ...(window.PIDashboardAI || {}),
    createAiPrivacyGate
  };
}