const { recommendRecipes } = require('./ai');
const { searchBilibiliVideos, validateBilibiliVideo } = require('./bilibili-search');
const { isMockMode, isTextLlmReady } = require('./config');
const { mockRecipeRecommendations } = require('./demo-data');

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

function buildQueries(ingredients) {
  const names = ingredients
    .map((item) => String(item?.name || '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const queries = [];
  if (names.length > 1) queries.push(`${names.slice(0, 3).join(' ')} 做法`);
  names.slice(0, 4).forEach((name) => queries.push(`${name} 美食 做法`));
  const flexible = names.find((name) => /牛奶|酸奶|奶油|奶酪|水果|苹果|香蕉|草莓|坚果|核桃|杏仁|花生|燕麦/.test(name));
  if (flexible) queries.push(`${flexible} 早餐 甜品 做法`);
  return [...new Set(queries)].slice(0, 6);
}

async function collectVideoEvidence(ingredients) {
  const queries = buildQueries(ingredients);
  if (queries.length === 0) return [];
  const first = await searchBilibiliVideos(queries[0], 10);
  const remaining = await Promise.allSettled(
    queries.slice(1).map((query) => searchBilibiliVideos(query, 8))
  );
  const all = [first, ...remaining.filter((item) => item.status === 'fulfilled').map((item) => item.value)].flat();
  const seen = new Set();
  return all
    .filter((video) => !seen.has(video.id) && seen.add(video.id))
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
    .slice(0, 32);
}

async function discoverRecipeRecommendations(params) {
  if (isMockMode() || !isTextLlmReady()) return mockRecipeRecommendations(params);
  const names = (params.ingredients || []).map((item) => item.name).join('|');
  const key = `${names}|${params.user?.goal || ''}|${params.cookTime || ''}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.value;

  const videos = await collectVideoEvidence(params.ingredients || []);
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
      .map(String).map((item) => item.trim()).filter(Boolean).slice(0, 6),
    sourceVideo: validateBilibiliVideo(value?.sourceVideo),
  };
}

module.exports = { buildQueries, collectVideoEvidence, discoverRecipeRecommendations, sanitizeSelectedDish };
