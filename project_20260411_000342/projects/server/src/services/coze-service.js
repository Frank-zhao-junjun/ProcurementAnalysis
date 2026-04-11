export async function callCozeChat({ message, runtimeContext = {}, traceId }) {
  const baseUrl = process.env.COZE_API_BASE_URL;
  const token = process.env.COZE_API_TOKEN;
  const botId = process.env.COZE_BOT_ID;
  const timeoutMs = Number(process.env.COZE_TIMEOUT_MS || 10_000);

  if (!baseUrl || !token || !botId) {
    throw new Error('Coze is not configured');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/open_api/v2/chat`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-trace-id': traceId
    },
    body: JSON.stringify({
      bot_id: botId,
      user: traceId,
      query: message,
      custom_variables: runtimeContext
    })
  });

  if (!response.ok) {
    throw new Error(`Coze request failed with status ${response.status}`);
  }

  return response.json();
}