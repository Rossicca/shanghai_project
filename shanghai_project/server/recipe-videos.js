const { rankRecipeVideos } = require('./ai');
const { bilibiliSearchUrl, searchBilibiliVideos } = require('./bilibili-search');
const { findCuratedRecipeVideos, validateRecipeVideo } = require('./curated-recipe-videos');

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

function platformSearches(query) {
  const encoded = encodeURIComponent(query);
  return [
    { platform: 'bilibili', label: 'B站', url: bilibiliSearchUrl(query), resultType: 'video' },
    { platform: 'douyin', label: '抖音', url: `https://www.douyin.com/search/${encoded}?type=video`, resultType: 'search' },
  ];
}

function fallbackReason(recipeName) {
  return `视频标题明确对应“${recipeName}”，并包含完整做法或教程信息。`;
}

function normalizeDishName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s·•_—\-（）()【】\[\]“”'"，,。.!！?？:：]/g, '');
}

function isVerifiedTutorial(video, dishNames) {
  const title = normalizeDishName(video?.title);
  const description = normalizeDishName(video?.description);
  const searchable = `${title}${description}`;
  const curatedDishNames = (Array.isArray(video?.matchedDishes) ? video.matchedDishes : [])
    .map(normalizeDishName)
    .filter(Boolean);
  // matchedDishes 只由人工核验索引提供；即使原视频标题较口语化，也属于已确认的制作教程。
  const tutorialSignal = curatedDishNames.length > 0 || /做法|教程|制作|怎么做|教你|步骤|烹饪|食谱|复刻|演示|过程/.test(searchable);
  const blockedSignal = /吃播|探店|测评|开箱|盘点|挑战|vlog|reaction|混剪/.test(searchable);
  const exactDish = dishNames.some((dishName) => {
    const normalized = normalizeDishName(dishName);
    return normalized.length >= 4 && (
      title.includes(normalized) ||
      curatedDishNames.some((curatedName) => curatedName.includes(normalized) || normalized.includes(curatedName))
    );
  });
  const duration = Number(video?.duration) || 0;
  const usefulDuration = duration === 0 || (duration >= 30 && duration <= 3600);
  return exactDish && tutorialSignal && !blockedSignal && usefulDuration;
}

function qualityScore(video) {
  const title = String(video?.title || '');
  const tutorialTerms = ['完整', '详细', '步骤', '教程', '做法'];
  const tutorialScore = tutorialTerms.reduce((score, term) => score + (title.includes(term) ? 8 : 0), 0);
  const duration = Number(video?.duration) || 0;
  const durationScore = duration >= 120 && duration <= 1200 ? 18 : duration >= 30 && duration <= 1800 ? 8 : 0;
  const playScore = Math.min(20, Math.log10(Math.max(1, Number(video?.playCount) || 1)) * 3);
  return tutorialScore + durationScore + playScore;
}

async function recommendRecipeVideos(recipe) {
  const name = String(recipe?.name || '').trim().slice(0, 80);
  if (!name) throw new Error('RECIPE_NAME_REQUIRED');
  const ingredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .map((item) => String(item?.name || item || '').trim())
    .filter(Boolean)
    .slice(0, 10);
  const dishNames = [name, ...(Array.isArray(recipe.videoSearchAliases) ? recipe.videoSearchAliases : [])]
    .map((item) => String(item || '').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 4);
  const query = `${name} 做法 教程`;
  const preferredVideo = validateRecipeVideo(recipe?.sourceVideo);
  const key = `${dishNames.join('|')}|${ingredients.join('|')}|${preferredVideo?.id || ''}`;
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
    const [searchedGroups, curated] = await Promise.all([
      Promise.all(dishNames.slice(0, 3).map((dishName) =>
        searchBilibiliVideos(`${dishName} 做法 教程`, 12).catch(() => [])
      )),
      Promise.resolve(dishNames.flatMap((dishName) =>
        findCuratedRecipeVideos({ name: dishName, ingredients })
      )),
    ]);
    const searched = searchedGroups.flat();
    const verifiedCurated = curated.filter((video) => isVerifiedTutorial(video, dishNames));
    const verifiedSearched = searched.filter((video) => isVerifiedTutorial(video, dishNames));
    const merged = [...verifiedCurated, ...verifiedSearched]
      .sort((a, b) => qualityScore(b) - qualityScore(a));
    const unique = [...new Map(merged.map((video) => [String(video.id), video])).values()];
    const candidates = preferredVideo && isVerifiedTutorial(preferredVideo, dishNames)
      ? [preferredVideo, ...unique.filter((video) => video.id !== preferredVideo.id)]
      : unique;
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
    const verifiedPreferred = candidates.find((video) => video.id === preferredVideo?.id);
    const selected = verifiedPreferred
      ? [preferredVideo, ...ordered.filter((video) => video.id !== preferredVideo.id)]
      : ordered;
    // AI 排过序就只保留 AI 选中的（宁缺毋滥）；搜索排序最多展示 4 条国内教程。
    const maxVideos = ranked.length > 0 ? ranked.length : 4;
    result.videos = selected.slice(0, maxVideos).map((video) => ({
      ...video,
      reason: video.id === verifiedPreferred?.id
        ? '这是你选择菜谱时参考的原教程，菜名、步骤与视频来源保持一致。'
        : video.reason || fallbackReason(name),
      platform: video.platform === 'douyin' ? 'douyin' : 'bilibili',
    }));
    if (!result.videos.length) {
      result.warning = `暂时没有找到与“${name}”菜名一致、且质量合格的制作教程。`;
      result.rankingMode = 'no_match';
    }
  } catch (error) {
    console.warn('[recipe-videos] 国内平台检索失败:', error.message);
    result.warning = '暂时无法读取视频列表，可打开抖音或 B 站继续搜索';
    result.rankingMode = 'fallback';
  }

  cache.set(key, { createdAt: Date.now(), value: result });
  return result;
}

/** 菜品图封面检索（宽松）：只要标题像做法教程且不是吃播/探店，取第一条带封面的视频。
 *  仅用于菜谱封面展示，与视频区的严格匹配（recommendRecipeVideos）相互独立，保证视频区质量。 */
const coverCache = new Map();
async function findRecipeCover(recipe) {
  const name = String(recipe?.name || '').trim().slice(0, 80);
  if (!name) return null;
  const dishNames = [name, ...(Array.isArray(recipe.videoSearchAliases) ? recipe.videoSearchAliases : [])]
    .map((item) => String(item || '').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 4);
  const key = `cover|${dishNames.join('|')}`;
  const cached = coverCache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.value;
  let found = null;
  try {
    for (const dishName of dishNames) {
      const videos = await searchBilibiliVideos(`${dishName} 做法 教程`, 10).catch(() => []);
      const match = videos.find((video) => {
        const haystack = `${video.title} ${video.description || ''}`;
        const hasCover = /^https:\/\//.test(String(video.coverUrl || ''));
        const tutorial = /做法|教程|制作|怎么做|教你|步骤|烹饪|食谱|家常|快手/.test(haystack);
        const blocked = /吃播|探店|测评|开箱|盘点|挑战|vlog|混剪/.test(haystack);
        return hasCover && tutorial && !blocked;
      });
      if (match) {
        found = {
          coverUrl: match.coverUrl,
          video: {
            id: match.id,
            title: match.title,
            author: match.author,
            duration: match.duration,
            coverUrl: match.coverUrl,
            sourceUrl: match.sourceUrl,
            platform: 'bilibili',
          },
        };
        break;
      }
    }
  } catch (error) {
    console.warn('[recipe-cover] 检索失败:', error.message);
  }
  coverCache.set(key, { createdAt: Date.now(), value: found });
  return found;
}

module.exports = { recommendRecipeVideos, findRecipeCover };
