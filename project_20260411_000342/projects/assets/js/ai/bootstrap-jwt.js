/**
 * 内网演示：从本机 API 拉取短期 JWT，写入 window.__AI_JWT__（需服务端 ALLOW_DEV_TOKEN=true）。
 * 若未开启或失败则静默跳过，仍可手动设置 window.__AI_JWT__。
 */
export async function ensureDevJwt() {
  if (typeof window === 'undefined' || window.__AI_JWT__) {
    return;
  }

  const host = window.location.hostname;
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.local');
  if (!isLocal) {
    return;
  }

  const apiRoot =
    (typeof window.__API_BASE_URL__ === 'string' && window.__API_BASE_URL__ &&
      window.__API_BASE_URL__.replace(/\/?$/, '')) ||
    (typeof window.__PI_API_BASE__ === 'string' && window.__PI_API_BASE__) ||
    (window.location.origin.includes('localhost') || host === '127.0.0.1'
      ? 'http://localhost:3000/api'
      : `${window.location.origin}/api`);

  try {
    const res = await fetch(`${apiRoot}/auth/dev-token`, { method: 'GET' });
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (data && typeof data.token === 'string') {
      window.__AI_JWT__ = data.token;
    }
  } catch {
    /* 静默：演示机未起服务或未开 ALLOW_DEV_TOKEN */
  }
}
