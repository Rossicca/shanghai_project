const { rankRecipeVideos } = require('./ai');
const { bilibiliSearchUrl, searchBilibiliVideos, validateBilibiliVideo } = require('./bilibili-search');

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

function platformSearches(query) {
  const encoded = encodeURIComponent(query);
  return [
    { platform: 'bilibili', label: 'B站', url: bilibiliSearchUrl(query), resultType: 'video' },
    { platform: 'douyin', label: '抖音', url: `https://www.douyin.com/search/${encoded}?type=video`, resultType: 'search' },
    { platform: 'xiaohongshu', label: '小红书', url: `https://www.xiaohongshu.com/search_result?keyword=${encoded}&source=web_search_result_notes`, resultType: 'search' },
    { platform: 'youtube', label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encoded}`, resultType: 'search' },
  ];
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
  const preferredVideo = validateBilibiliVideo(recipe?.sourceVideo);
  const key = `${name}|${ingredients.join('|')}|${preferredVideo?.id || ''}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.value;

  const result = {
    query,
    searchUrl: bilibiliSearchUrl(query),
    platformSearches: platformSearches(query),
    rankingMode: 'search',
    videos: [],
    warning: null,
  };

  try {
    const searched = await searchBilibiliVideos(query);
    const candidates = preferredVideo
      ? [preferredVideo, ...searched.filter((video) => video.id !== preferredVideo.id)]
      : searched;
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
    const ordered = ranked.length > 0 ? ranked : candidates;
    const selected = preferredVideo
      ? [preferredVideo, ...ordered.filter((video) => video.id !== preferredVideo.id)]
      : ordered;
    // AI 排过序就只保留 AI 选中的（宁缺毋滥）；搜索排序则最多取 3 条
    const maxVideos = ranked.length > 0 ? ranked.length : 3;
    result.videos = selected.slice(0, maxVideos).map((video) => ({
      ...video,
      reason: video.id === preferredVideo?.id
        ? '这是你选择菜谱时参考的原教程，菜名、步骤与视频来源保持一致。'
        : video.reason || fallbackReason(name),
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
