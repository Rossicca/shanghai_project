const { recommendRecipes, filterCondimentNames } = require('./ai');
const { searchBilibiliVideos, validateBilibiliVideo } = require('./bilibili-search');
const { isMockMode, isTextLlmReady } = require('./config');
const { mockRecipeRecommendations } = require('./demo-data');

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

const MEAL_SEARCH_TERMS = {
  breakfast: '早餐',
  lunch: '中餐 家常菜',
  dinner: '晚餐 家常菜',
  dessert: '甜点 甜品',
};

/**
 * 从视频描述中提取菜名列表并匹配用户食材。
 * 很多合集视频的描述是 "1．菜A 2．菜B 3．菜C..." 格式。
 * 匹配后返回该视频中有哪些菜用到了用户食材。
 */
function extractDishMatches(video, userIngredientNames) {
  const haystack = `${video.title || ''} ${video.description || ''}`;
  const matches = [];

  // 方法1：解析编号列表格式 "1．xxx 2．xxx" 或 "1、xxx 2、xxx"
  const numberedItems = haystack.match(/(?:\d+[．、.。)\s]+)([^\d\n]{2,60}?)(?=\s*\d+[．、.。)\s]|$)/g);
  if (numberedItems) {
    for (const item of numberedItems) {
      const dishName = item.replace(/^\d+[．、.。)\s]+/, '').trim().slice(0, 30);
      if (dishName.length >= 2) {
        const used = userIngredientNames.filter((name) => dishName.includes(name));
        if (used.length > 0) matches.push({ dishName, usedIngredients: used });
      }
    }
  }

  // 方法2：直接检查整个文本中用户食材的出现
  for (const name of userIngredientNames) {
    if (haystack.includes(name)) {
      // 找该食材附近的菜名上下文（前后各15字）
      const idx = haystack.indexOf(name);
      const ctx = haystack.slice(Math.max(0, idx - 15), idx + name.length + 15);
      const alreadyIn = matches.some((m) => m.usedIngredients.includes(name));
      if (!alreadyIn) {
        matches.push({ dishName: ctx.trim().slice(0, 40), usedIngredients: [name] });
      }
    }
  }

  return matches;
}

/** 视频质量评分：优先烹饪步骤教程，降权探店/吃播/测评类 */
const TUTORIAL_KEYWORDS = ['做法', '教程', '步骤', '教学', '家常', '教你', '学会', '怎么做', '菜谱', '食谱', '下厨', '烹饪', '制作', '详细', '简单', '快手'];
const SHOWCASE_KEYWORDS = ['探店', '试吃', '测评', '吃播', '打卡', 'vlog', '大胃王', '美食探店', '第一口', '必吃', '排队', '隐藏菜单', '爆款', '网红'];

function scoreVideoQuality(video) {
  const haystack = `${video.title || ''} ${video.description || ''} ${video.author || ''}`;
  let score = 0;
  // 教程关键词加分
  for (const kw of TUTORIAL_KEYWORDS) {
    if (haystack.includes(kw)) score += 3;
  }
  // 展示类关键词扣分
  for (const kw of SHOWCASE_KEYWORDS) {
    if (haystack.includes(kw)) score -= 5;
  }
  // 时长合理加分（3-20分钟最有可能是教程，太短是短视频，太长是直播回放）
  const duration = video.duration || 0;
  if (duration >= 180 && duration <= 1200) score += 5;
  else if (duration > 1200) score -= 3;
  else if (duration < 60) score -= 4;
  // 标题长度合理加分（太短没信息，太长是标题党）
  const titleLen = (video.title || '').length;
  if (titleLen > 10 && titleLen < 80) score += 2;
  return score;
}

function buildQueries(ingredients, mealType = 'any') {
  const names = ingredients
    .map((item) => String(item?.name || '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const queries = [];
  const mealTerm = MEAL_SEARCH_TERMS[mealType] || '';
  // 组合搜索：所有食材一起 + 做法
  if (names.length >= 2) {
    queries.push(`${names.slice(0, 3).join(' ')} ${mealTerm} 做法 菜谱`.replace(/\s+/g, ' ').trim());
    // 两两组合（最常见的搭配）
    queries.push(`${names[0]} ${names[1]} 做法`);
  }
  // 单食材精准搜索（每个食材单独搜）
  names.slice(0, 4).forEach((name) => {
    queries.push(`${name} 做法 ${mealTerm || '家常'}`);
    queries.push(`${name} 菜谱`);
  });
  // 按烹饪方式分类搜索
  if (names[0]) {
    queries.push(`${names[0]} 炒 做法`);
    queries.push(`${names[0]} 汤 做法`);
  }
  const flexible = names.find((name) => /牛奶|酸奶|奶油|奶酪|水果|苹果|香蕉|草莓|坚果|核桃|杏仁|花生|燕麦/.test(name));
  if (flexible) queries.push(`${flexible} 早餐 甜品 做法`);
  return [...new Set(queries)].slice(0, 10);
}

async function collectVideoEvidence(ingredients, mealType = 'any') {
  const queries = buildQueries(ingredients, mealType);
  if (queries.length === 0) return [];
  const first = await searchBilibiliVideos(queries[0], 15);
  const remaining = await Promise.allSettled(
    queries.slice(1).map((query) => searchBilibiliVideos(query, 12))
  );
  const groups = [first, ...remaining.filter((item) => item.status === 'fulfilled').map((item) => item.value)];
  const all = [];
  for (let index = 0; index < 15; index += 1) {
    groups.forEach((group) => {
      if (group[index]) all.push(group[index]);
    });
  }
  const seen = new Set();
  return all
    .filter((video) => !seen.has(video.id) && seen.add(video.id))
    .slice(0, 50);
}

async function discoverRecipeRecommendations(params) {
  if (isMockMode() || !isTextLlmReady()) return mockRecipeRecommendations(params);
  const names = (params.ingredients || []).map((item) => item.name).join('|');
  const key = `${names}|p${params.people || 1}|t${params.cookTime || 20}|d${params.difficulty || ''}|m${params.mealType || 'any'}|g${params.user?.goal || ''}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.value;

  const userIngredientNames = (params.ingredients || [])
    .map((item) => String(item?.name || '').trim()).filter(Boolean);
  const allVideos = await collectVideoEvidence(params.ingredients || [], params.mealType);
  // 解析每个视频的描述，提取用到了用户食材的菜名 + 质量评分
  const enriched = allVideos.map((video) => {
    const matches = extractDishMatches(video, userIngredientNames);
    const quality = scoreVideoQuality(video);
    return { ...video, _matchedDishes: matches, _matchCount: matches.length, _quality: quality, _score: matches.length * 3 + quality };
  });
  // 综合排序：食材匹配 + 质量评分，筛掉低质量展示类视频（评分 < -3）
  const qualityVideos = enriched.filter((v) => v._quality >= -3);
  const videos = qualityVideos.length >= 5 ? qualityVideos : enriched;
  videos.sort((a, b) => b._score - a._score);
  if (videos.length < 5) throw new Error(`真实视频依据不足: ${videos.length}`);
  const recommendations = await recommendRecipes({
    ...params,
    videoCandidates: videos.map((video) => ({
      id: video.id,
      title: video.title,
      author: video.author,
      duration: video.duration,
      coverUrl: video.coverUrl,
      sourceUrl: video.sourceUrl,
      description: video.description,
      playCount: video.playCount,
      // 代码已从视频中识别出这些菜用到了用户食材，AI 应优先选这些菜
      matchedDishes: (video._matchedDishes || []).map((m) => m.dishName),
    })),
  });
  cache.set(key, { createdAt: Date.now(), value: recommendations });
  return recommendations;
}

function sanitizeSelectedDish(value) {
  const name = String(value?.name || '').trim().slice(0, 40);
  if (!name) return undefined;
  return {
    name,
    pantryLevel: ['existing', 'topup', 'explore'].includes(value?.pantryLevel) ? value.pantryLevel : 'topup',
    missingIngredients: filterCondimentNames(value?.missingIngredients),
    sourceVideo: validateBilibiliVideo(value?.sourceVideo),
  };
}

module.exports = { buildQueries, collectVideoEvidence, discoverRecipeRecommendations, sanitizeSelectedDish };
