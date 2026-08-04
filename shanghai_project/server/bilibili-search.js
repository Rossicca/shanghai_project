let anonymousCookie = '';

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseDuration(value) {
  const parts = String(value || '').split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0] || 0);
}

function bilibiliSearchUrl(query) {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`;
}

function headers(cookie = '') {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    Referer: 'https://search.bilibili.com/',
    Accept: 'application/json, text/plain, */*',
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function getAnonymousCookie(query, signal, forceRefresh = false) {
  if (anonymousCookie && !forceRefresh) return anonymousCookie;
  const response = await fetch(bilibiliSearchUrl(query), { signal, headers: headers() });
  if (!response.ok) throw new Error(`Bilibili session HTTP ${response.status}`);
  const setCookie = response.headers.get('set-cookie') || '';
  anonymousCookie = ['buvid3', 'b_nut']
    .map((name) => {
      const match = setCookie.match(new RegExp(`${name}=([^;,]+)`));
      return match ? `${name}=${match[1]}` : null;
    })
    .filter(Boolean)
    .join('; ');
  return anonymousCookie;
}

async function requestSearch(url, query, signal, forceRefresh = false) {
  const cookie = await getAnonymousCookie(query, signal, forceRefresh);
  return fetch(url, { signal, headers: headers(cookie) });
}

async function searchBilibiliVideos(query, limit = 12) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const pageSize = Math.max(1, Math.min(30, limit));
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1&page_size=${pageSize}`;
    let response = await requestSearch(url, query, controller.signal);
    if (response.status === 412) {
      anonymousCookie = '';
      response = await requestSearch(url, query, controller.signal, true);
    }
    if (!response.ok) throw new Error(`Bilibili HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.code !== 0 || !Array.isArray(payload.data?.result)) {
      throw new Error(`Bilibili search error: ${payload.message || payload.code}`);
    }
    return payload.data.result
      .filter((item) => item.type === 'video' && /^BV[0-9A-Za-z]+$/.test(item.bvid || ''))
      .map((item) => ({
        id: item.bvid,
        title: stripHtml(item.title).slice(0, 120),
        author: stripHtml(item.author).slice(0, 60),
        duration: parseDuration(item.duration),
        coverUrl: item.pic ? `https:${String(item.pic).replace(/^https?:/, '')}` : null,
        sourceUrl: `https://www.bilibili.com/video/${item.bvid}`,
        playCount: Number(item.play) || 0,
        publishedAt: Number(item.pubdate) || null,
        description: stripHtml(item.description).slice(0, 240),
      }));
  } finally {
    clearTimeout(timeout);
  }
}

function validateBilibiliVideo(video) {
  const id = String(video?.id || '').trim();
  if (!/^BV[0-9A-Za-z]+$/.test(id)) return null;
  return {
    id,
    title: stripHtml(video?.title).slice(0, 120),
    author: stripHtml(video?.author).slice(0, 60),
    duration: Math.max(0, Number(video?.duration) || 0),
    coverUrl: /^https:\/\//.test(String(video?.coverUrl || '')) ? String(video.coverUrl) : null,
    sourceUrl: `https://www.bilibili.com/video/${id}`,
    description: stripHtml(video?.description).slice(0, 240),
    platform: 'bilibili',
  };
}

module.exports = { bilibiliSearchUrl, searchBilibiliVideos, validateBilibiliVideo };
