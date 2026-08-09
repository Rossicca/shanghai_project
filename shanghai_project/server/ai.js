/**
 * AI 提供者 v2.0
 * - 兼容 OpenAI 协议（火山方舟 / 通义千问 / DeepSeek / Moonshot 等）
 * - 配置了真实 API Key 就走真调用，否则/失败时自动降级到演示数据
 * - API Key 和接入点 ID 放在 server/config.toml 中（已加入 .gitignore，不会泄露）
 * - 非敏感通用配置仍在 server/config.json
 */

const { DEMO_INGREDIENTS, pickMockRecipe, mockRecipeRecommendations, mockRecommendWorkout } = require('./demo-data');
const { config, isMockMode, isTextLlmReady, isVisionReady, getTextProvider, getVisionProvider } = require('./config');

function httpJson(url, options) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const mod = require(u.protocol === 'http:' ? 'http' : 'https');
    const req = mod.request(
      u,
      { method: options.method || 'POST', headers: options.headers, timeout: 90000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data: { raw: data } });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('AI request timeout')));
    req.write(options.body || '');
    req.end();
  });
}

/** 从模型输出里稳健地提取 JSON */
function parseJson(text) {
  const str = String(text);
  const fence = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : str;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
  if (process.env.AI_DEBUG_OUTPUT === 'true') {
    console.error('[ai] non-json output:', JSON.stringify(str.slice(0, 500)));
  }
  throw new Error(`模型输出不是合法 JSON (length=${str.length})`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chat({ model, messages, temperature = 0.7, maxTokens = 1500, responseFormat, reasoningEffort = config.ai.reasoningEffort, provider }) {
  const { apiKey, baseURL } = provider || { apiKey: config.ai.apiKey, baseURL: config.ai.baseURL };
  const normalizedBaseURL = String(baseURL || '').trim().replace(/\/+$/, '');
  if (!apiKey || !normalizedBaseURL || !model) {
    throw new Error('AI 文本模型配置不完整，请检查 API Key、Base URL 与模型名称');
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await httpJson(`${normalizedBaseURL}/chat/completions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model, messages, temperature, max_tokens: maxTokens,
          ...(responseFormat ? { response_format: responseFormat } : {}),
          // reasoning_effort 仅豆包/火山模型支持，DeepSeek 不兼容
          ...(reasoningEffort && normalizedBaseURL.includes('volces') ? { reasoning_effort: reasoningEffort } : {}),
        }),
      });
      if (res.status !== 200) {
        const error = new Error(`AI API 错误 ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
        error.retryable = res.status === 408 || res.status === 429 || res.status >= 500;
        throw error;
      }
      const content = res.data.choices?.[0]?.message?.content ?? '';
      if (!content) throw new Error('AI 返回内容为空');
      return Array.isArray(content)
        ? content.map((item) => typeof item === 'string' ? item : item.text || '').join('')
        : content;
    } catch (error) {
      lastError = error;
      if (attempt === 1 || error.retryable === false) break;
      await wait(700);
    }
  }
  throw lastError || new Error('AI 调用失败');
}

/** 百度智能云：菜品识别专用 API（无需视觉大模型） */
const BAIDU_OAUTH_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_DISH_URL = 'https://aip.baidubce.com/rest/2.0/image-classify/v2/dish';
let baiduTokenCache = { value: '', expiresAt: 0 };

async function getBaiduAccessToken() {
  const now = Date.now();
  if (baiduTokenCache.value && now < baiduTokenCache.expiresAt - 60 * 1000) {
    return baiduTokenCache.value;
  }
  const { apiKey, secretKey } = config.ai.baidu || {};
  const url = `${BAIDU_OAUTH_URL}?grant_type=client_credentials` +
    `&client_id=${encodeURIComponent(apiKey || '')}` +
    `&client_secret=${encodeURIComponent(secretKey || '')}`;
  const res = await httpJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '',
  });
  if (res.status !== 200 || !res.data?.access_token) {
    throw new Error(`百度 access_token 获取失败 ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  baiduTokenCache = {
    value: res.data.access_token,
    expiresAt: now + (Number(res.data.expires_in) || 2592000) * 1000,
  };
  return baiduTokenCache.value;
}

async function recognizeFoodBaidu(imageBase64) {
  const token = await getBaiduAccessToken();
  const res = await httpJson(`${BAIDU_DISH_URL}?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `image=${encodeURIComponent(imageBase64)}&top_num=5`,
  });
  if (res.status !== 200 || !Array.isArray(res.data?.result)) {
    throw new Error(`百度菜品识别失败 ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  return res.data.result.map((item) => ({
    name: item.name || '未知菜品',
    amount: '100',
    confidence: Number(item.probability || 0.9),
  }));
}

function normalizeVisionImage(value) {
  return String(value || '')
    .trim()
    .replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '')
    .replace(/\s+/g, '');
}

/**
 * 从 base64 首字节判断图片类型。
 * 网页相机产出 PNG，相册选图多为 JPEG；写死 jpeg 会让声明与内容不符。
 */
function detectImageMime(imageBase64) {
  if (typeof imageBase64 !== 'string') return 'image/jpeg';
  if (imageBase64.startsWith('iVBOR')) return 'image/png';
  if (imageBase64.startsWith('R0lGOD')) return 'image/gif';
  if (imageBase64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

/** 1. 识别食物 */
async function recognizeFood(imageBase64) {
  const normalizedImage = normalizeVisionImage(imageBase64);
  if (!normalizedImage) throw new Error('图片数据为空或格式无效');
  if (process.env.AI_FORCE_DEMO === 'true') return DEMO_INGREDIENTS.map((i) => ({ ...i }));
  if (!isVisionReady()) {
    throw new Error('AI 视觉模型未配置，已拒绝返回固定演示食材');
  }
  // 百度云：走专用菜品识别 API（无需视觉大模型）
  if (config.ai.provider === 'baidu') return recognizeFoodBaidu(normalizedImage);
  try {
    const content = await chat({
      model: config.ai.visionModel,
      maxTokens: 1400,
      temperature: 0.2,
      provider: getVisionProvider(),
      messages: [
        {
          role: 'system',
          content:
            '你是专业营养师，识别图片中的所有食物。仔细估算每种食材的实际用量，严格只输出 JSON：{"ingredients":[{"name":"食材名","amount":"用量","confidence":0-1}]}。\n\n食材用量估算规则：\n- 可数的食材用数量：如"鸡蛋 2个""番茄 3个""土豆 1个""青椒 2根""大蒜 3瓣""香菇 5朵""鸡腿 2只"\n- 散装食材按体积估算克数：如"猪肉 300g""青菜 250g""豆腐 200g""米 150g"\n- 液体/半液体：如"牛奶 250ml""酸奶 100ml"\n- 根据图片中食材与常见参照物（手、砧板、碗盘）的大小比例来估算\n- 不要所有食材都写100g，要给出差异化的合理估值\n\n图片里有多少种食材就列出多少种，不要遗漏任何一种。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '识别这张图片里的食物，给出名称、估算重量和置信度。' },
            { type: 'image_url', image_url: { url: `data:${detectImageMime(normalizedImage)};base64,${normalizedImage}` } },
          ],
        },
      ],
    });
    const parsed = parseJson(content);
    return parsed.ingredients ?? [];
  } catch (e) {
    console.error('[ai] 真实图片识别调用失败:', e.message);
    throw e;
  }
}

/** 基础调料/调味品：任何家庭厨房都默认具备，绝不应列为"缺少食材" */
const BASIC_CONDIMENTS = new Set([
  '盐', '糖', '白糖', '冰糖', '红糖', '油', '食用油', '花生油', '菜籽油', '橄榄油', '猪油',
  '酱油', '生抽', '老抽', '醋', '陈醋', '白醋', '米醋', '香醋',
  '料酒', '蚝油', '鸡精', '味精', '胡椒粉', '花椒粉', '五香粉', '十三香',
  '姜', '生姜', '蒜', '大蒜', '葱', '大葱', '小葱', '洋葱', '香菜',
  '淀粉', '玉米淀粉', '土豆淀粉', '红薯淀粉', '香油', '芝麻油', '辣椒油',
  '豆瓣酱', '黄豆酱', '甜面酱', '番茄酱', '辣椒酱', '老干妈',
  '八角', '桂皮', '香叶', '花椒', '干辣椒', '孜然', '孜然粉',
  '水', '清水', '开水', '温水',
]);
function isBasicCondiment(name) {
  return BASIC_CONDIMENTS.has(String(name || '').trim());
}
function filterCondimentNames(list) {
  return (Array.isArray(list) ? list : [])
    .map(String).map((name) => name.trim()).filter(Boolean)
    .filter((name) => !isBasicCondiment(name))
    .slice(0, 10);
}

function normalizeRecipeRecommendations(value, params) {
  const list = Array.isArray(value?.recommendations) ? value.recommendations : [];
  const videoById = new Map((params.videoCandidates || []).map((video) => [video.id, video]));
  const seen = new Set();
  const excludedNames = new Set(
    (params.excludeDishNames || []).map(String).map((name) => name.trim()).filter(Boolean),
  );
  const userIngredientNames = new Set(
    (params.ingredients || []).map((item) => String(item?.name || '').trim()).filter(Boolean),
  );
  return list
    .map((item, index) => {
      const sourceVideo = videoById.get(String(item?.sourceVideoId || ''));
      // 后处理：availableIngredients 严格只保留用户真实拥有的食材
      let available = (Array.isArray(item?.availableIngredients) ? item.availableIngredients : [])
        .map(String).map((name) => name.trim()).filter(Boolean)
        .filter((name) => userIngredientNames.has(name));
      // 如果 AI 没填或填错了，从视频标题/简介中尝试匹配用户食材
      if (available.length === 0 && sourceVideo && userIngredientNames.size > 0) {
        const haystack = `${sourceVideo.title || ''} ${sourceVideo.description || ''}`;
        available = [...userIngredientNames].filter((name) => haystack.includes(name));
      }
      // 如果仍为空且用户食材很少，标记为 explore 而非 existing
      const pantryLevel = (['existing', 'topup', 'explore'].includes(item?.pantryLevel) ? item.pantryLevel : 'topup');
      const adjustedLevel = (available.length === 0 && pantryLevel === 'existing') ? 'explore' : pantryLevel;
      return {
        id: `candidate-${index + 1}`,
        name: String(item?.name || '').trim().slice(0, 40),
        coverEmoji: String(item?.coverEmoji || '🍽️').slice(0, 4),
        category: String(item?.category || '家常菜').trim().slice(0, 16),
        pantryLevel: adjustedLevel,
        description: String(item?.description || '').trim().slice(0, 120),
        reason: String(item?.reason || '').trim().slice(0, 120),
        availableIngredients: available.slice(0, 12),
        missingIngredients: filterCondimentNames(item?.missingIngredients),
        cookTime: Math.max(5, Math.min(120, Number(item?.cookTime) || params.cookTime || 20)),
        difficulty: ['简单', '中等', '困难'].includes(item?.difficulty) ? item.difficulty : '简单',
        estimatedCalories: Math.max(100, Math.min(1200, Number(item?.estimatedCalories) || 400)),
        sourceVideo: sourceVideo ? {
          id: sourceVideo.id,
          title: sourceVideo.title,
          author: sourceVideo.author,
          duration: sourceVideo.duration,
          coverUrl: sourceVideo.coverUrl,
          sourceUrl: sourceVideo.sourceUrl,
          description: sourceVideo.description,
          platform: sourceVideo.platform === 'douyin' ? 'douyin' : 'bilibili',
        } : null,
      };
    })
    .filter((item) => {
      if (!item.name || !item.sourceVideo) return false;
      if (excludedNames.has(item.name)) return false;
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    })
    // 排序：已有食材匹配多的排前面 → 缺少食材少的排前面 → existing > topup > explore
    .sort((a, b) => {
      const aMatch = a.availableIngredients.length;
      const bMatch = b.availableIngredients.length;
      if (bMatch !== aMatch) return bMatch - aMatch;
      // 同匹配数时，缺料少的优先
      const aMiss = a.missingIngredients.length;
      const bMiss = b.missingIngredients.length;
      if (aMiss !== bMiss) return aMiss - bMiss;
      // 同匹配数+缺料数时，existing > topup > explore
      const levelOrder = { existing: 0, topup: 1, explore: 2 };
      return (levelOrder[a.pantryLevel] || 1) - (levelOrder[b.pantryLevel] || 1);
    })
    .slice(0, 6);
}

/** 2. 根据现有食材和用户数据推荐多道候选菜。 */
async function recommendRecipes(params) {
  if (isMockMode() || !isTextLlmReady()) return mockRecipeRecommendations(params);
  const mealTypeLabels = { any: '不限', breakfast: '早餐', lunch: '中餐', dinner: '晚餐', dessert: '甜点' };
  const recommendationContext = {
    ...params,
    mealTypeLabel: mealTypeLabels[params.mealType] || '不限',
  };
  const content = await chat({
    model: config.ai.textModel,
    maxTokens: 4096,
    temperature: (params.excludeDishNames || []).length > 0 ? 0.55 : 0.3,
    provider: getTextProvider(),
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是懂营养搭配的全品类食物推荐师。系统已经先从抖音和B站检索到真实制作视频，并对每个视频做了食材匹配和质量筛选（只保留烹饪步骤教程，已过滤探店/吃播/测评类视频）。每个 videoCandidate 的 matchedDishes 字段是代码从该视频中识别出的、能用上用户现有食材的菜名。你必须优先从 matchedDishes 非空的视频中选菜，直接推荐 matchedDishes 里的菜名。严格只输出 JSON：
{"recommendations":[{"name":"菜名（必须从matchedDishes或视频标题中直接取）","sourceVideoId":"必须原样引用候选视频ID","coverEmoji":"emoji","category":"快手主菜/汤羹/主食组合/早餐/甜品/烘焙/饮品/加餐等","pantryLevel":"existing/topup/explore","description":"一句话介绍","reason":"结合用户数据的推荐理由","availableIngredients":["用户已有且这道食物会用到的食材"],"missingIngredients":["还需购买的常见食材"],"cookTime":20,"difficulty":"简单/中等/困难","estimatedCalories":420}]}
规则：
0. 【最重要】每道推荐菜必须绑定到一个能真正展示这道菜制作步骤的视频！不能绑定到仅展示成品/探店/吃播/测评的视频。菜名必须能从该视频标题或 matchedDishes 中直接找到，视频必须是教人怎么做这道菜的步骤教程；
1. 必须返回 6 道，每道绑定不同 sourceVideoId；菜名尽量从 matchedDishes 或视频标题/描述中直接取，不准创造生僻新菜名；
2. 至少覆盖 5 种不同制作形式或食物类别，任何同一 category 最多出现 2 道；
3. 尽可能让用户用已有食材就能做。能用现有食材独立成菜的标 pantryLevel=existing（缺 0~2 样主食材），需补 2~5 样关键食材的标 topup，现有食材完全用不到或只做配料的标 explore；
4. availableIngredients 尽量从用户现有食材中选取；missingIngredients 不得与现有食材重复。盐、糖、油、酱油、生抽、老抽、醋、料酒、蚝油、鸡精、味精、胡椒粉、花椒、辣椒、姜、蒜、葱、淀粉、香油等所有基础调味品一律不得列为 missingIngredients；
5. 结合用户目标、身体数据、目标热量、人数和限时，推荐理由要具体；
6. 严禁使用过敏源；名称之间不得重复；
7. excludeDishNames 是用户之前已经看过的菜名，新的 6 道菜严禁与其中任何一个同名或只是换同义词，必须更换菜品和制作形式。`,
      },
      {
        role: 'user',
        content: `用户手头已有这些食材：${(params.ingredients || []).map((i) => i.name).join('、')}。请优先推荐能用上这些食材的菜！例如：如果用户有鸡蛋+番茄，首选番茄炒蛋、番茄蛋汤；有猪肉+青椒，首选青椒炒肉。仔细检查每道菜是否能用到现有食材，能用到的一定要在 availableIngredients 里写出来。用户选择的用餐场景是”${recommendationContext.mealTypeLabel}”。\n${JSON.stringify(recommendationContext)}`,
      },
    ],
  });
  const normalized = normalizeRecipeRecommendations(parseJson(content), params);
  if (normalized.length < 3) throw new Error(`候选菜数量不足: ${normalized.length}`);
  return normalized;
}

function buildSafeRecipeFallback(params, warning) {
  const recipe = pickMockRecipe(params.ingredients || []);
  const allergies = new Set((params.user?.allergies || []).map((item) => String(item).trim()).filter(Boolean));
  const inputIngredients = (params.ingredients || [])
    .map((item) => ({ name: String(item?.name || '').trim(), amount: String(item?.amount || '适量') }))
    .filter((item) => item.name && !allergies.has(item.name));
  const selectedMissing = (params.selectedDish?.missingIngredients || [])
    .map((name) => ({ name: String(name).trim(), amount: '适量' }))
    .filter((item) => item.name && !allergies.has(item.name));
  const mergedIngredients = [...inputIngredients, ...selectedMissing]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.name === item.name) === index)
    .slice(0, 14);
  recipe.ingredients = mergedIngredients.length >= 2
    ? mergedIngredients
    : DEMO_INGREDIENTS
      .map((item) => ({ name: item.name, amount: item.amount || '适量' }))
      .filter((item) => !allergies.has(item.name))
      .slice(0, 4);
  recipe.fiber = Math.max(1, Number(recipe.fiber) || 6);
  recipe.prepTime = Math.max(5, Number(recipe.prepTime) || 10);
  recipe.cookTime = Math.min(Number(params.cookTime) || 120, Math.max(5, Number(recipe.cookTime) || 20));

  if (params.selectedDish?.name) {
    recipe.name = String(params.selectedDish.name).slice(0, 40);
    recipe.description = `按你选定的“${recipe.name}”生成，现有食材为主，缺少食材可按清单补齐。`;
    if (params.selectedDish.sourceVideo) recipe.sourceVideo = params.selectedDish.sourceVideo;
  }
  return {
    ...recipe,
    id: 'r' + Date.now(),
    generationMode: warning ? 'safe_fallback' : 'demo',
    ...(warning ? { generationWarning: warning } : {}),
  };
}

/** 3. 生成用户选定菜品的完整菜谱。 */
async function generateRecipe(params) {
  if (isMockMode() || !isTextLlmReady()) {
    return buildSafeRecipeFallback(params);
  }
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 4096,
      temperature: 0.3,
      responseFormat: { type: 'json_object' },
      provider: getTextProvider(),
      messages: [
        {
          role: 'system',
          content: `你是健身营养师兼大厨。根据用户手头已有食材生成健康菜谱，严格只输出 JSON：
{
  "name": "菜名",
  "coverEmoji": "emoji",
  "description": "一句话描述",
  "calories": 数字千卡,
  "protein": 克,
  "carbs": 克,
  "fat": 克,
  "fiber": 克,
  "ingredients": [{"name":"食材","amount":"用量"}],
  "steps": ["步骤1","步骤2"],
  "prepTime": 准备时间(分钟),
  "cookTime": 烹饪时间(分钟),
  "difficulty": "简单/中等/困难",
  "tips": ["提示1","提示2"]
}
核心要求：
- 优先基于用户已有食材设计菜谱，尽量用现有食材，减少额外购买；
- 若现有食材能独立成菜（如鸡蛋+番茄→番茄炒蛋），直接用它们做主料；若现有食材不足以成菜，可适量补充关键主食材（肉类、蔬菜等），补充不超过 4 样；
- 盐、糖、油、酱油、醋、料酒、蚝油、鸡精、胡椒粉、花椒、辣椒、姜、蒜、葱、淀粉、香油等所有调味品都是每家厨房标配，无需列入 ingredients 也无需提醒购买；
- 数值要合理，确保总热量在目标热量 ±10% 范围内。食材不超过 14 项，步骤为 4~8 条，每条不超过 60 字，小贴士不超过 3 条。`,
        },
        {
          role: 'user',
          content: `食材：${JSON.stringify(params.ingredients)}
人数：${params.people || 1}
限时：${params.cookTime || 20}分钟
难度：${params.difficulty || '简单'}
用餐场景：${({ any: '不限', breakfast: '早餐', lunch: '中餐', dinner: '晚餐', dessert: '甜点' })[params.mealType] || '不限'}
${params.style ? `做法偏好：${params.style}` : ''}
${params.selectedDish?.name ? `用户已经选定菜品：${params.selectedDish.name}。必须生成这道菜，不要改成其他菜名。` : ''}
${params.selectedDish?.missingIngredients?.length ? `允许补充的缺少食材：${params.selectedDish.missingIngredients.join('、')}` : ''}
${params.selectedDish?.sourceVideo ? `制作依据视频：${params.selectedDish.sourceVideo.title}；视频简介：${params.selectedDish.sourceVideo.description || '无'}。步骤必须与该视频所示菜品一致，不得换成只含相似食材的其他菜。` : ''}
${params.user?.caloriesTarget ? `目标热量：${params.user.caloriesTarget}kcal/餐` : ''}
${params.user?.goal ? `健身目标：${params.user.goal}` : ''}
${params.user?.allergies?.length ? `严禁使用过敏源：${params.user.allergies.join('、')}` : ''}
${params.user?.dietType ? `饮食类型：${params.user.dietType}` : ''}`,
        },
      ],
    });
    const parsed = parseJson(content);
    const targetCalories = Number(params.user?.caloriesTarget);
    if (Number.isFinite(targetCalories) && targetCalories > 0) {
      const protein = Math.max(0, Number(parsed.protein) || 0);
      const carbs = Math.max(0, Number(parsed.carbs) || 0);
      const fat = Math.max(0, Number(parsed.fat) || 0);
      const macroCalories = protein * 4 + carbs * 4 + fat * 9;
      if (macroCalories > 0) {
        const scale = targetCalories / macroCalories;
        parsed.protein = Math.round(protein * scale * 10) / 10;
        parsed.carbs = Math.round(carbs * scale * 10) / 10;
        parsed.fat = Math.round(fat * scale * 10) / 10;
      }
      parsed.calories = Math.round(targetCalories);
    }
    parsed.cookTime = Math.min(Number(params.cookTime) || 120, Math.max(5, Number(parsed.cookTime) || Number(params.cookTime) || 20));
    return {
      ...parsed,
      ...(params.selectedDish?.name ? { name: String(params.selectedDish.name).slice(0, 40) } : {}),
      ...(params.selectedDish?.sourceVideo ? { sourceVideo: params.selectedDish.sourceVideo } : {}),
      generationMode: 'ai',
      id: 'r' + Date.now(),
    };
  } catch (e) {
    console.error('[ai] 真实菜谱生成调用失败:', e.message);
    return buildSafeRecipeFallback(params, 'AI 服务刚才没有稳定返回，已按你选定的菜品和食材生成可继续使用的安全做法。');
  }
}

/** 3. 运动推荐 */
async function recommendWorkout(params) {
  if (isMockMode() || !isTextLlmReady()) return mockRecommendWorkout(params);
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 2000,
      provider: getTextProvider(),
      temperature: 0.7,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是专业健身教练，熟悉中国健身博主。根据用户身体数据与目标，推荐真实存在的跟练视频。

要求：
1. 推荐真实博主（如：周六野Zoe、帕梅拉PamelaReif、刘畊宏、韩小四、刘逗逗、欧阳春晓、Coffee林芊妤、SomiFit等）
2. 每个视频的 sourceUrl 指向 B站搜索页：https://search.bilibili.com/all?keyword=博主名+视频主题
3. platform 写 "bilibili"
4. 视频标题和博主名用真实存在的

严格只输出 JSON：
{
  "videos": [
    {
      "title": "视频标题",
      "coach": "博主名",
      "duration": 秒数,
      "difficulty": "入门/进阶/挑战",
      "category": "全身燃脂/臀腿/肩背/手臂/核心/有氧/拉伸",
      "calories": 预估消耗千卡,
      "sourceUrl": "https://search.bilibili.com/all?keyword=博主名+标题关键词",
      "platform": "bilibili",
      "reason": "针对该用户的具体推荐理由（结合身体数据）"
    }
  ]
}

推荐 6 个视频，覆盖不同难度和类别。理由要结合用户的身高体重年龄目标给出个性化建议。`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            bodyData: params.bodyData || { height: 170, weight: 65, age: 25, gender: '男' },
            goal: params.goal || { type: '保持健康' },
            preference: params.preference || {},
            limit: params.limit || 8,
          }),
        },
      ],
    });
    const parsed = parseJson(content);
    if (parsed.videos?.length) return parsed.videos;
    return mockRecommendWorkout(params);
  } catch (e) {
    console.error('[ai] 真实健身推荐调用失败:', e.message);
    throw e;
  }
}

/** 只在真实检索结果中排序菜谱视频，模型不得编造链接或视频。 */
async function rankRecipeVideos({ recipe, candidates }) {
  if (isMockMode() || !isTextLlmReady()) return [];
  // 精简候选信息，只发给AI必要字段，避免JSON过大被截断
  const slimCandidates = candidates.slice(0, 8).map((v) => ({
    id: v.id, title: v.title, duration: v.duration, author: v.author,
  }));
  const content = await chat({
    model: config.ai.textModel,
    provider: getTextProvider(),
    maxTokens: 2000,
    temperature: 0.2,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是菜谱视频匹配助手。只能从候选列表选择视频，不得新增、改写 ID 或编造链接。
根据菜名、食材和步骤选出最匹配的烹饪步骤教程（1~3个即可，宁缺毋滥）。必须优先选择：
1. 视频标题包含"做法""教程""怎么做""教你"等关键词的步骤教学视频
2. 视频标题与菜名高度一致、食材相近的
3. 时长在 3-20 分钟之间的完整制作教程
严禁选择探店、吃播、测评、美食展示等非教程类视频。如果没有合适的教程视频，返回空数组。
严格只输出 JSON：{"recommendations":[{"id":"候选视频ID","reason":"一句具体匹配理由"}]}`,
      },
      { role: 'user', content: JSON.stringify({ recipe: { name: recipe.name, ingredients: (recipe.ingredients||[]).slice(0,8), steps: (recipe.steps||[]).slice(0,6) }, candidates: slimCandidates }) },
    ],
  });
  const parsed = parseJson(content);
  const byId = new Map(candidates.map((video) => [video.id, video]));
  return (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
    .map((item) => {
      const candidate = byId.get(String(item.id));
      if (!candidate) return null;
      return {
        ...candidate,
        reason: String(item.reason || '').trim().slice(0, 120),
      };
    })
    .filter(Boolean);
}

function mockWorkoutPlan(params) {
  const lowImpact = params.trainingMode === 'gentle' ||
    (params.limitations || []).some((item) => /\u819d|\u8170|\u5173\u8282|\u4f4e\u51b2\u51fb/.test(item));
  const strengthName = params.hasEquipment ? '\u54d1\u94c3\u6df1\u8e72' : '\u5f92\u624b\u6df1\u8e72';
  const aerobicName = lowImpact ? '\u4f4e\u51b2\u51fb\u539f\u5730\u8e0f\u6b65' : '\u5f00\u5408\u8df3';
  const focusByGoal = {
    lose_fat: '\u4f4e\u51b2\u51fb\u6709\u6c27\u4e0e\u5168\u8eab\u529b\u91cf',
    gain_muscle: '\u5168\u8eab\u529b\u91cf\u4e0e\u6e10\u8fdb\u8d1f\u8377',
    shape: '\u6838\u5fc3\u7a33\u5b9a\u4e0e\u81c0\u817f\u5851\u5f62',
    maintain: '\u4e2d\u7b49\u5f3a\u5ea6\u6d3b\u52a8\u4e0e\u7075\u6d3b\u6027',
  };
  const focus = focusByGoal[params.goalType] || focusByGoal.maintain;
  const weeklySchedule = Array.from({ length: params.weeklyFrequency }, (_, index) => ({
    day: index + 1,
    title: index % 2 === 0 ? focus : '\u6062\u590d\u6027\u529b\u91cf\u4e0e\u62c9\u4f38',
    durationMinutes: params.sessionDurationMinutes,
    warmup: [
      { name: '\u80a9\u9acb\u73af\u7ed5\u4e0e\u539f\u5730\u8e0f\u6b65', durationSeconds: 90, notes: '\u4ece\u5c0f\u5e45\u5ea6\u5f00\u59cb\uff0c\u9010\u6b65\u5347\u9ad8\u5fc3\u7387', category: '\u5168\u8eab\u71c3\u8102' },
      { name: '\u9acb\u3001\u819d\u3001\u8e1d\u5173\u8282\u52a8\u6001\u6d3b\u52a8', durationSeconds: 60, notes: '\u4fdd\u6301\u81ea\u7136\u547c\u5438\uff0c\u4e0d\u505a\u5f39\u9707\u62c9\u4f38', category: '\u62c9\u4f38' },
    ],
    exercises: [
      {
        name: index % 2 === 0 ? aerobicName : strengthName,
        sets: 3,
        reps: index % 2 === 0 ? '40\u79d2' : '10-12',
        restSeconds: 45,
        notes: lowImpact ? '\u907f\u514d\u8df3\u8dc3\uff1b\u4e0d\u9002\u65f6\u7acb\u5373\u505c\u6b62' : '\u4fdd\u6301\u547c\u5438\u5e73\u7a33\uff0c\u52a8\u4f5c\u4e0d\u8ffd\u6c42\u8fc7\u5feb',
        category: index % 2 === 0 ? (lowImpact ? '\u6709\u6c27' : '\u5168\u8eab\u71c3\u8102') : '\u81c0\u817f',
      },
      {
        name: '\u6b7b\u866b\u5f0f\u6838\u5fc3\u8bad\u7ec3',
        sets: 3,
        reps: '8-10/\u4fa7',
        restSeconds: 40,
        notes: '\u8170\u80cc\u8d34\u5730\uff0c\u5982\u6709\u4e0d\u9002\u7f29\u5c0f\u5e45\u5ea6',
        category: '\u6838\u5fc3',
      },
    ],
    cooldown: [
      { name: '\u4f4e\u5f3a\u5ea6\u539f\u5730\u8d70\u52a8', durationSeconds: 90, notes: '\u9010\u6b65\u964d\u4f4e\u5fc3\u7387\uff0c\u4e0d\u8981\u7acb\u523b\u5750\u4e0b', category: '\u6709\u6c27' },
      { name: '\u81c0\u817f\u4e0e\u80a9\u80cc\u9759\u6001\u62c9\u4f38', durationSeconds: 120, notes: '\u6bcf\u4fa7\u4fdd\u6301 20-30 \u79d2\uff0c\u4ee5\u8f7b\u5fae\u7275\u62c9\u611f\u4e3a\u5ea6', category: '\u62c9\u4f38' },
    ],
  }));
  return {
    goalType: params.goalType,
    summary: `\u6bcf\u5468\u8bad\u7ec3 ${params.weeklyFrequency} \u5929\uff0c\u4ee5${focus}\u4e3a\u4e3b\uff0c\u5355\u6b21\u7ea6 ${params.sessionDurationMinutes} \u5206\u949f\u3002`,
    weeklySchedule,
    nutritionSummary: params.goalType === 'gain_muscle'
      ? '\u8bad\u7ec3\u65e5\u4f18\u5148\u4fdd\u8bc1\u4f18\u8d28\u86cb\u767d\u548c\u4e3b\u98df\uff0c\u8bad\u7ec3\u540e\u53ca\u65f6\u8865\u5145\u80fd\u91cf\u3002'
      : params.goalType === 'lose_fat'
        ? '\u4fdd\u6301\u89c4\u5f8b\u4e09\u9910\uff0c\u4ee5\u9ad8\u86cb\u767d\u3001\u9ad8\u7ea4\u7ef4\u548c\u9002\u91cf\u4e3b\u98df\u63d0\u9ad8\u9971\u8179\u611f\u3002'
        : '\u4fdd\u6301\u98df\u7269\u591a\u6837\u3001\u89c4\u5f8b\u8fdb\u9910\uff0c\u5e76\u6839\u636e\u8bad\u7ec3\u91cf\u8c03\u6574\u4e3b\u98df\u4efd\u91cf\u3002',
    mealSuggestions: [
      { mealType: '\u65e9\u9910', name: '\u71d5\u9ea6\u9e21\u86cb\u725b\u5976\u676f', reason: '\u51c6\u5907\u7b80\u5355\uff0c\u8865\u5145\u86cb\u767d\u8d28\u4e0e\u590d\u5408\u78b3\u6c34', ingredients: ['\u71d5\u9ea6', '\u9e21\u86cb', '\u725b\u5976', '\u9999\u8549'] },
      { mealType: '\u5348\u9910', name: '\u9e21\u80f8\u8089\u6742\u852c\u7cd9\u7c73\u996d', reason: '\u86cb\u767d\u8d28\u3001\u852c\u83dc\u548c\u4e3b\u98df\u642d\u914d\u5b8c\u6574', ingredients: ['\u9e21\u80f8\u8089', '\u897f\u5170\u82b1', '\u80e1\u841d\u535c', '\u7cd9\u7c73'] },
      { mealType: '\u665a\u9910', name: '\u756a\u8304\u8c46\u8150\u867e\u4ec1\u6c64', reason: '\u6e05\u723d\u6613\u505a\uff0c\u9002\u5408\u8bad\u7ec3\u540e\u7684\u665a\u9910', ingredients: ['\u756a\u8304', '\u8c46\u8150', '\u867e\u4ec1', '\u9752\u83dc'] },
      { mealType: '\u52a0\u9910', name: '\u65e0\u7cd6\u9178\u5976\u575a\u679c\u6c34\u679c\u676f', reason: '\u8865\u5145\u4e73\u5236\u54c1\u3001\u575a\u679c\u4e0e\u6c34\u679c\u7684\u591a\u6837\u8425\u517b', ingredients: ['\u65e0\u7cd6\u9178\u5976', '\u575a\u679c', '\u82f9\u679c', '\u84dd\u8393'] },
    ],
    reminders: [
      '\u8bad\u7ec3\u524d\u70ed\u8eab 5 \u5206\u949f\uff0c\u8bad\u7ec3\u540e\u653e\u677e 5 \u5206\u949f',
      '\u4efb\u4f55\u52a8\u4f5c\u5f15\u8d77\u660e\u663e\u75bc\u75db\u65f6\u7acb\u5373\u505c\u6b62',
      '\u8bad\u7ec3\u65e5\u4e4b\u95f4\u5b89\u6392\u6062\u590d\u65e5\uff0c\u4fdd\u8bc1\u7761\u7720\u548c\u8865\u6c34',
    ],
  };
}

async function generateWorkoutPlan(params) {
  if (isMockMode() || !isTextLlmReady()) return mockWorkoutPlan(params);
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 5200,
      temperature: 0.35,
      provider: getTextProvider(),
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `\u4f60\u662f\u8c28\u614e\u7684\u5065\u8eab\u6559\u7ec3\u517c\u8fd0\u52a8\u8425\u517b\u5e08\u3002\u4e25\u683c\u53ea\u8f93\u51fa JSON\uff0c\u4e0d\u8f93\u51fa Markdown\u3002\u683c\u5f0f\uff1a
{"goalType":"lose_fat","summary":"\u6458\u8981","weeklySchedule":[{"day":1,"title":"\u6807\u9898","durationMinutes":30,"warmup":[{"name":"\u52a8\u6001\u70ed\u8eab","durationSeconds":60,"notes":"\u8981\u70b9","category":"\u5168\u8eab\u71c3\u8102"}],"exercises":[{"name":"\u52a8\u4f5c","sets":3,"reps":"12","restSeconds":45,"notes":"\u5b89\u5168\u8981\u70b9","category":"\u6838\u5fc3"}],"cooldown":[{"name":"\u7ec3\u540e\u62c9\u4f38","durationSeconds":60,"notes":"\u8981\u70b9","category":"\u62c9\u4f38"}]}],"nutritionSummary":"\u7ed3\u5408\u76ee\u6807\u548c\u8eab\u4f53\u6570\u636e\u7684\u996e\u98df\u539f\u5219","mealSuggestions":[{"mealType":"\u65e9\u9910/\u5348\u9910/\u665a\u9910/\u52a0\u9910","name":"\u5e38\u89c1\u83dc\u540d","reason":"\u63a8\u8350\u7406\u7531","ingredients":["\u98df\u6750"]}],"reminders":["\u63d0\u9192"]}
weeklySchedule \u5929\u6570\u5fc5\u987b\u7b49\u4e8e weeklyFrequency\uff1b\u6bcf\u5929\u5fc5\u987b\u540c\u65f6\u6709 warmup\u3001exercises \u548c cooldown\uff1b\u5355\u65e5 durationMinutes \u63a5\u8fd1\u8bf7\u6c42\u503c\uff1btrainingMode=gentle \u65f6\u4f18\u5148\u4f4e\u51b2\u51fb\u4e0e\u8f83\u957f\u6062\u590d\uff0cbalanced \u65f6\u5747\u8861\u5f3a\u5ea6\uff0cprogressive \u65f6\u5728\u5b89\u5168\u524d\u63d0\u4e0b\u9010\u5468\u9012\u8fdb\uff1b\u4e25\u683c\u907f\u5f00 limitations \u4e2d\u7684\u52a8\u4f5c\uff1b\u53ea\u4f7f\u7528 equipment \u4e2d\u5217\u51fa\u7684\u5668\u68b0\uff1b\u5f53 goalTypes \u6709\u591a\u9879\u65f6\uff0c\u5fc5\u987b\u8bf4\u660e\u4e3b\u6b21\u76ee\u6807\u5e76\u91c7\u7528\u517c\u5bb9\u7b56\u7565\uff0c\u4e0d\u80fd\u7ed9\u51fa\u4e92\u76f8\u77db\u76fe\u7684\u6781\u7aef\u5efa\u8bae\uff1bmealSuggestions \u8fd4\u56de 8~12 \u4e2a\u65e9\u9910\u3001\u5348\u9910\u3001\u665a\u9910\u4e0e\u52a0\u9910\u5efa\u8bae\uff0c\u7528\u4e8e\u7ec4\u5408\u4e03\u5929\u996e\u98df\u8ba1\u5212\uff0c\u7ed3\u5408 personalizationAnalysis\u3001dietaryPreferences\u3001mealPrepTime\u3001foodBudget\u3001cookingFrequency\u3001kitchenTools\u3001flavorPreferences \u4e0e mealsPerDay\uff0c\u4e0d\u5f97\u5305\u542b allergies \u4e2d\u7684\u8fc7\u654f\u6e90\uff1b\u4e3b\u8bad\u7ec3\u52a8\u4f5c\u53ea\u4ece\u4ee5\u4e0b\u53ef\u6821\u9a8c\u52a8\u4f5c\u4e2d\u9009\u62e9\uff1a\u5f92\u624b\u6df1\u8e72\u3001\u8dea\u59ff\u6216\u6807\u51c6\u4fef\u5367\u6491\u3001\u81c0\u6865\u3001\u5f13\u6b65\u8e72\u3001\u5e73\u677f\u652f\u6491\u3001\u6b7b\u866b\u5f0f\u3001\u9e1f\u72d7\u5f0f\u3001\u54d1\u94c3\u6216\u5f39\u529b\u5e26\u5212\u8239\u3001\u80a9\u80cc\u57fa\u7840\u8bad\u7ec3\u3001\u54d1\u94c3\u624b\u81c2\u8bad\u7ec3\u3001\u4f4e\u51b2\u51fb\u539f\u5730\u8e0f\u6b65\u3001\u5f00\u5408\u8df3\u3001\u767b\u5c71\u8dd1\u3001\u5f92\u624b\u5168\u8eab\u5faa\u73af\uff1b\u4e0d\u5f97\u8f93\u51fa\u4efb\u4f55 URL\u3002`,
        },
        { role: 'user', content: JSON.stringify(params) },
      ],
    });
    return { ...parseJson(content), generationMode: 'ai' };
  } catch (error) {
    console.error('[ai] 真实训练计划生成调用失败，使用安全计划:', error.message);
    return {
      ...mockWorkoutPlan(params),
      generationMode: 'safe_fallback',
      generationWarning: 'AI 服务刚才没有稳定返回，已根据你的身体数据和选择生成可继续使用的安全计划。',
    };
  }
}

/**
 * 只在已经过安全审核的真实视频候选中做个性化排序。
 * 模型只能返回候选 ID，最终链接仍由服务端数据库提供，避免 AI 编造视频或跳转地址。
 */
async function rankWorkoutVideos({ profile, candidates, limit = 6 }) {
  if (isMockMode() || !isTextLlmReady() || !Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const slimCandidates = candidates.slice(0, 48).map((video) => ({
    id: String(video.id),
    title: String(video.title || '').slice(0, 90),
    category: video.category,
    difficulty: video.difficulty,
    duration: Number(video.duration || 0),
    platform: video.platform,
    contentType: video.contentType,
    tags: Array.isArray(video.tags) ? video.tags.slice(0, 8) : [],
  }));

  const content = await chat({
    model: config.ai.textModel,
    provider: getTextProvider(),
    maxTokens: 2200,
    temperature: 0.35,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是谨慎的私人健身内容推荐教练。只允许从候选视频中选择，不得新增、改写 ID，不得编造链接。
根据用户性别、年龄、BMI 筛查信息、目标组合、训练经验、器械、限制、最近训练与收藏做排序。
排序原则：安全与限制优先；再匹配目标和能力；内容需要兼顾热身、主训练、动作教学、练后拉伸或恢复，避免只推荐同一动作和同一平台。
BMI 仅作筛查，不诊断疾病。未成年人、孕期、术后或存在疼痛/慢病风险时应保守，不推荐高冲击和极端训练。
严格返回 JSON：{"items":[{"id":"候选ID","reason":"20~55字的个性化推荐理由"}]}。
最多返回指定数量；如果候选不适合，可以少选，但不能返回候选以外的 ID。`,
      },
      {
        role: 'user',
        content: JSON.stringify({ profile, limit: Math.min(Math.max(Number(limit) || 6, 1), 10), candidates: slimCandidates }),
      },
    ],
  });

  const parsed = parseJson(content);
  const allowedIds = new Set(slimCandidates.map((item) => item.id));
  const seen = new Set();
  return (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((item) => allowedIds.has(String(item?.id)) && !seen.has(String(item.id)))
    .map((item) => {
      const id = String(item.id);
      seen.add(id);
      return { id, reason: String(item.reason || '').slice(0, 90) };
    })
    .slice(0, Math.min(Math.max(Number(limit) || 6, 1), 10));
}

module.exports = { recognizeFood, recommendRecipes, generateRecipe, recommendWorkout, generateWorkoutPlan, rankRecipeVideos, rankWorkoutVideos, normalizeVisionImage, filterCondimentNames };
