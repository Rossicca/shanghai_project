const { recommendRecipes } = require('./ai');
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

function buildQueries(ingredients, mealType = 'any') {
  const names = ingredients
    .map((item) => String(item?.name || '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const queries = [];
  const mealTerm = MEAL_SEARCH_TERMS[mealType] || '';
  if (names.length > 1) queries.push(`${names.slice(0, 3).join(' ')} ${mealTerm} 做法`.replace(/\s+/g, ' ').trim());
  names.slice(0, 4).forEach((name) => queries.push(`${name} ${mealTerm || '美食'} 做法`));
  if (names[0]) {
    queries.push(`${names[0]} 汤 蒸 炖 做法`);
    queries.push(`${names[0]} 主食 早餐 做法`);
  }
  const flexible = names.find((name) => /牛奶|酸奶|奶油|奶酪|水果|苹果|香蕉|草莓|坚果|核桃|杏仁|花生|燕麦/.test(name));
  if (flexible) queries.push(`${flexible} 早餐 甜品 做法`);
  return [...new Set(queries)].slice(0, 8);
}

async function collectVideoEvidence(ingredients, mealType = 'any') {
  const queries = buildQueries(ingredients, mealType);
  if (queries.length === 0) return [];
  const first = await searchBilibiliVideos(queries[0], 10);
  const remaining = await Promise.allSettled(
    queries.slice(1).map((query) => searchBilibiliVideos(query, 8))
  );
  const groups = [first, ...remaining.filter((item) => item.status === 'fulfilled').map((item) => item.value)];
  const all = [];
  for (let index = 0; index < 10; index += 1) {
    groups.forEach((group) => {
      if (group[index]) all.push(group[index]);
    });
  }
  const seen = new Set();
  return all
    .filter((video) => !seen.has(video.id) && seen.add(video.id))
    .slice(0, 40);
}

async function discoverRecipeRecommendations(params) {
  if (isMockMode() || !isTextLlmReady()) return mockRecipeRecommendations(params);
  const names = (params.ingredients || []).map((item) => item.name).join('|');
  const key = `${names}|${params.user?.goal || ''}|${params.cookTime || ''}|${params.mealType || 'any'}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.value;

  const videos = await collectVideoEvidence(params.ingredients || [], params.mealType);
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
    missingIngredients: (Array.isArray(value?.missingIngredients) ? value.missingIngredients : [])
      .map(String).map((item) => item.trim()).filter(Boolean).slice(0, 10),
    sourceVideo: validateBilibiliVideo(value?.sourceVideo),
  };
}

module.exports = { buildQueries, collectVideoEvidence, discoverRecipeRecommendations, sanitizeSelectedDish };
