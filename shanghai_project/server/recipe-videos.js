const { rankRecipeVideos } = require('./ai');

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();
let bilibiliAnonymousCookie = '';

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

function searchUrl(query) {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`;
}

function platformSearches(query) {
  const encoded = encodeURIComponent(query);
  return [
    { platform: 'bilibili', label: 'B站', url: searchUrl(query), resultType: 'video' },
    { platform: 'douyin', label: '抖音', url: `https://www.douyin.com/search/${encoded}?type=video`, resultType: 'search' },
    { platform: 'xiaohongshu', label: '小红书', url: `https://www.xiaohongshu.com/search_result?keyword=${encoded}&source=web_search_result_notes`, resultType: 'search' },
    { platform: 'youtube', label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encoded}`, resultType: 'search' },
  ];
}

function bilibiliHeaders(cookie = '') {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    Referer: 'https://search.bilibili.com/',
    Accept: 'application/json, text/plain, */*',
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function getBilibiliAnonymousCookie(query, signal, forceRefresh = false) {
  if (bilibiliAnonymousCookie && !forceRefresh) return bilibiliAnonymousCookie;
  const response = await fetch(searchUrl(query), {
    signal,
    headers: bilibiliHeaders(),
  });
  if (!response.ok) throw new Error(`Bilibili session HTTP ${response.status}`);
  const setCookie = response.headers.get('set-cookie') || '';
  const cookies = ['buvid3', 'b_nut']
    .map((name) => {
      const match = setCookie.match(new RegExp(`${name}=([^;,]+)`));
      return match ? `${name}=${match[1]}` : null;
    })
    .filter(Boolean);
  bilibiliAnonymousCookie = cookies.join('; ');
  return bilibiliAnonymousCookie;
}

async function requestBilibiliSearch(url, query, signal, forceRefresh = false) {
  const cookie = await getBilibiliAnonymousCookie(query, signal, forceRefresh);
  return fetch(url, {
    signal,
    headers: bilibiliHeaders(cookie),
  });
}

async function searchBilibili(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1&page_size=12`;
    let response = await requestBilibiliSearch(url, query, controller.signal);
    if (response.status === 412) {
      bilibiliAnonymousCookie = '';
      response = await requestBilibiliSearch(url, query, controller.signal, true);
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

function fallbackReason(recipeName) {
  return `搜索结果与“${recipeName}”的制作方法相关，打开后可核对具体食材和步骤。`;
}

async function recommendRecipeVideos(recipe) {
  const name = String(recipe?.name || '').trim().slice(0, 80);
  if (!name) throw new Error('RECIPE_NAME_REQUIRED');
  const ingredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((item) => String(item?.name || item || '').trim())
    .filter(Boolean)
    .slice(0, 10);
  const query = `${name} 做法 教程`;
  const key = `${name}|${ingredients.join('|')}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.value;

  const result = {
    query,
    searchUrl: searchUrl(query),
    platformSearches: platformSearches(query),
    rankingMode: 'search',
    videos: [],
    warning: null,
  };

  try {
    const candidates = await searchBilibili(query);
    let ranked = [];
    if (candidates.length > 0) {
      try {
        const aiRanked = await rankRecipeVideos({
          recipe: {
            name,
            ingredients,
            steps: (Array.isArray(recipe.steps) ? recipe.steps : []).map(String).slice(0, 8),
          },
          candidates,
        });
        if (aiRanked.length > 0) {
          ranked = aiRanked;
          result.rankingMode = 'ai';
        }
      } catch (error) {
        console.warn('[recipe-videos] AI 排序失败，保留搜索排序:', error.message);
        result.warning = 'AI 匹配暂时不可用，当前按平台搜索顺序展示';
      }
    }
    const selected = ranked.length > 0 ? ranked : candidates.slice(0, 3);
    result.videos = selected.slice(0, 3).map((video) => ({
      ...video,
      reason: video.reason || fallbackReason(name),
      platform: 'bilibili',
    }));
  } catch (error) {
    console.warn('[recipe-videos] B站检索失败:', error.message);
    result.warning = '暂时无法读取视频列表，可打开 B 站继续搜索';
    result.rankingMode = 'fallback';
  }

  cache.set(key, { createdAt: Date.now(), value: result });
  return result;
}

module.exports = { recommendRecipeVideos };
