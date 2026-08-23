const RAW_DATA_BASE = 'https://raw.githubusercontent.com/masakasakasama/mf-dashboard/main/dashboard/public';

async function fetchJson(url) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export async function fetchFreshDataFile(fileName) {
  const sources = [
    `${RAW_DATA_BASE}/${fileName}`,
    `${import.meta.env.BASE_URL}${fileName}`,
  ];

  let lastError;
  for (const source of sources) {
    try {
      return await fetchJson(source);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`${fileName} の読み込みに失敗: ${lastError?.message || 'unknown error'}`);
}

export function loadDashboardData() {
  return Promise.all([
    fetchFreshDataFile('cashflow.json'),
    fetchFreshDataFile('subscriptions.json'),
  ]);
}
