/**
 * AI 提供者 v2.0
 * - 兼容 OpenAI 协议（火山方舟 / 通义千问 / DeepSeek / Moonshot 等）
 * - 配置了真实 API Key 就走真调用，否则/失败时自动降级到演示数据
 * - API Key 和接入点 ID 放在 server/config.toml 中（已加入 .gitignore，不会泄露）
 * - 非敏感通用配置仍在 server/config.json
 */

const { DEMO_INGREDIENTS, pickMockRecipe, mockRecipeRecommendations, mockRecommendWorkout } = require('./demo-data');
const { config, isMockMode, isTextLlmReady } = require('./config');

function httpJson(url, options) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const mod = require(u.protocol === 'http:' ? 'http' : 'https');
    const req = mod.request(
      u,
      { method: options.method || 'POST', headers: options.headers, timeout: 60000 },
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

async function chat({ model, messages, temperature = 0.7, maxTokens = 1500, responseFormat, reasoningEffort = config.ai.reasoningEffort }) {
  const res = await httpJson(`${config.ai.baseURL}/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify({
      model, messages, temperature, max_tokens: maxTokens,
      ...(responseFormat ? { response_format: responseFormat } : {}),
      // 豆包 Seed 2.1 默认深度思考（high）很慢，这里可在 config.json 里调低加速演示
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    }),
  });
  if (res.status !== 200) {
    throw new Error(`AI API 错误 ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  const content = res.data.choices?.[0]?.message?.content ?? '';
  if (!content && process.env.AI_DEBUG_OUTPUT === 'true') {
    const message = res.data.choices?.[0]?.message || {};
    console.error('[ai] empty content metadata:', JSON.stringify({
      finishReason: res.data.choices?.[0]?.finish_reason,
      messageKeys: Object.keys(message),
      reasoningLength: String(message.reasoning_content || '').length,
      usage: res.data.usage,
    }));
  }
  return Array.isArray(content)
    ? content.map((item) => typeof item === 'string' ? item : item.text || '').join('')
    : content;
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

/** 1. 识别食物 */
async function recognizeFood(imageBase64) {
  if (isMockMode()) return DEMO_INGREDIENTS.map((i) => ({ ...i }));
  // 百度云：走专用菜品识别 API（无需视觉大模型）
  if (config.ai.provider === 'baidu') return recognizeFoodBaidu(imageBase64);
  try {
    const content = await chat({
      model: config.ai.visionModel,
      maxTokens: 900,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '你是专业营养师，识别图片中的食物。严格只输出 JSON：{"ingredients":[{"name":"食材名","amount":"估重(g)","confidence":0-1}]}，最多 6 项。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '识别这张图片里的食物，给出名称、估算重量和置信度。' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
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

function normalizeRecipeRecommendations(value, params) {
  const list = Array.isArray(value?.recommendations) ? value.recommendations : [];
  const videoById = new Map((params.videoCandidates || []).map((video) => [video.id, video]));
  const seen = new Set();
  return list
    .map((item, index) => {
      const sourceVideo = videoById.get(String(item?.sourceVideoId || ''));
      return {
        id: `candidate-${index + 1}`,
        name: String(item?.name || '').trim().slice(0, 40),
        coverEmoji: String(item?.coverEmoji || '🍽️').slice(0, 4),
        category: String(item?.category || '家常菜').trim().slice(0, 16),
        pantryLevel: ['existing', 'topup', 'explore'].includes(item?.pantryLevel) ? item.pantryLevel : 'topup',
        description: String(item?.description || '').trim().slice(0, 120),
        reason: String(item?.reason || '').trim().slice(0, 120),
        availableIngredients: (Array.isArray(item?.availableIngredients) ? item.availableIngredients : [])
          .map(String).map((name) => name.trim()).filter(Boolean).slice(0, 8),
        missingIngredients: (Array.isArray(item?.missingIngredients) ? item.missingIngredients : [])
          .map(String).map((name) => name.trim()).filter(Boolean).slice(0, 6),
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
          platform: 'bilibili',
        } : null,
      };
    })
    .filter((item) => item.name && item.sourceVideo && !seen.has(item.name) && seen.add(item.name))
    .slice(0, 8);
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
    temperature: 0.65,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是懂营养搭配的全品类食物推荐师。系统已经先从网上检索到真实制作视频。你只能从给定 videoCandidates 中提取视频明确支持的常见菜品，再结合用户数据推荐。严格只输出 JSON：
{"recommendations":[{"name":"视频明确支持的常见菜名或食物名","sourceVideoId":"必须原样引用候选 BV id","coverEmoji":"emoji","category":"快手主菜/汤羹/主食组合/早餐/甜品/烘焙/饮品/加餐等","pantryLevel":"existing/topup/explore","description":"一句话介绍","reason":"结合用户数据的推荐理由","availableIngredients":["用户已有且这道食物会用到的食材"],"missingIngredients":["还需购买的常见食材"],"cookTime":20,"difficulty":"简单/中等/困难","estimatedCalories":420}]}
规则：
1. 必须返回 8 道，每道绑定不同 sourceVideoId；菜名必须能从对应视频标题或简介直接判断，不准创造生僻新菜名；
2. 至少覆盖 5 种不同制作形式或食物类别，任何同一 category 最多出现 2 道；优先包含炒、煎/烤、蒸/炖、汤羹、主食组合、早餐/轻食等明显不同方向，不能只是同一道菜更换调味；
3. 其中约 3 道 pantryLevel=existing（补 0~2 样），3 道 topup（补 2~4 样），2 道 explore（现有食材可只做配料并补 3~6 样），让用户能真正换一种吃法；
4. 若有牛奶、水果、坚果等合适食材，应自然加入有真实视频支持的甜品、早餐、饮品或加餐候选；
5. availableIngredients 只能来自用户现有食材，missingIngredients 不能与现有食材重复；盐、油、水等基础调料无需列为缺料；
6. 结合用户目标、身体数据、目标热量、人数和限时，推荐理由要具体；
7. 严禁使用过敏源；名称之间不得重复；不得为了凑数量把不相容的食材硬拼在一起。`,
      },
      {
        role: 'user',
        content: `用户选择的用餐场景是“${recommendationContext.mealTypeLabel}”。除“不限”外，8 个候选都必须适合该场景；仍需保持做法和菜品差异。\n${JSON.stringify(recommendationContext)}`,
      },
    ],
  });
  const normalized = normalizeRecipeRecommendations(parseJson(content), params);
  if (normalized.length < 7) throw new Error(`候选菜数量不足: ${normalized.length}`);
  return normalized;
}

/** 3. 生成用户选定菜品的完整菜谱。 */
async function generateRecipe(params) {
  if (isMockMode() || !isTextLlmReady()) {
    const recipe = pickMockRecipe(params.ingredients);
    if (params.selectedDish?.name) {
      recipe.name = String(params.selectedDish.name).slice(0, 40);
      recipe.description = `按你选定的“${recipe.name}”生成，现有食材为主，缺少食材可按清单补齐。`;
      const existing = new Set((recipe.ingredients || []).map((item) => item.name));
      recipe.ingredients = [
        ...(recipe.ingredients || []),
        ...(params.selectedDish.missingIngredients || [])
          .filter((name) => !existing.has(name))
          .map((name) => ({ name, amount: '适量' })),
      ];
      if (params.selectedDish.sourceVideo) recipe.sourceVideo = params.selectedDish.sourceVideo;
    }
    return { ...recipe, id: 'r' + Date.now() };
  }
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 4096,
      temperature: 0.3,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是健身营养师兼大厨。根据用户食材与要求生成健康菜谱，严格只输出 JSON：
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
数值要合理，确保总热量在目标热量 ±10% 范围内。食材不超过 10 项，步骤为 4~6 条，每条不超过 60 字，小贴士不超过 3 条。`,
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
    return {
      ...parsed,
      ...(params.selectedDish?.name ? { name: String(params.selectedDish.name).slice(0, 40) } : {}),
      ...(params.selectedDish?.sourceVideo ? { sourceVideo: params.selectedDish.sourceVideo } : {}),
      id: 'r' + Date.now(),
    };
  } catch (e) {
    console.error('[ai] 真实菜谱生成调用失败:', e.message);
    throw e;
  }
}

/** 3. 运动推荐 */
async function recommendWorkout(params) {
  if (isMockMode() || !isTextLlmReady()) return mockRecommendWorkout(params);
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 2000,
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
  const content = await chat({
    model: config.ai.textModel,
    maxTokens: 1000,
    temperature: 0.2,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是菜谱视频匹配助手。只能从候选列表选择视频，不得新增、改写 ID 或编造链接。
根据菜名、食材和步骤选出最多 3 个最匹配的制作教程。优先完整做法、标题与菜名一致、食材相近的视频。
严格只输出 JSON：{"recommendations":[{"id":"候选视频ID","reason":"一句具体匹配理由"}]}`,
      },
      { role: 'user', content: JSON.stringify({ recipe, candidates }) },
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
    .filter(Boolean)
    .slice(0, 3);
}

function mockWorkoutPlan(params) {
  const lowImpact = (params.limitations || []).some((item) => /\u819d|\u8170|\u5173\u8282|\u4f4e\u51b2\u51fb/.test(item));
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
  }));
  return {
    goalType: params.goalType,
    summary: `\u6bcf\u5468\u8bad\u7ec3 ${params.weeklyFrequency} \u5929\uff0c\u4ee5${focus}\u4e3a\u4e3b\uff0c\u5355\u6b21\u7ea6 ${params.sessionDurationMinutes} \u5206\u949f\u3002`,
    weeklySchedule,
    reminders: [
      '\u8bad\u7ec3\u524d\u70ed\u8eab 5 \u5206\u949f\uff0c\u8bad\u7ec3\u540e\u653e\u677e 5 \u5206\u949f',
      '\u4efb\u4f55\u52a8\u4f5c\u5f15\u8d77\u660e\u663e\u75bc\u75db\u65f6\u7acb\u5373\u505c\u6b62',
      '\u8bad\u7ec3\u65e5\u4e4b\u95f4\u5b89\u6392\u6062\u590d\u65e5\uff0c\u4fdd\u8bc1\u7761\u7720\u548c\u8865\u6c34',
    ],
  };
}

async function generateWorkoutPlan(params) {
  if (isMockMode() || !isTextLlmReady()) return mockWorkoutPlan(params);
  const content = await chat({
    model: config.ai.textModel,
    maxTokens: 4096,
    temperature: 0.35,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `\u4f60\u662f\u8c28\u614e\u7684\u5065\u8eab\u6559\u7ec3\u3002\u4e25\u683c\u53ea\u8f93\u51fa JSON\uff0c\u4e0d\u8f93\u51fa Markdown\u3002\u683c\u5f0f\uff1a
{"goalType":"lose_fat","summary":"\u6458\u8981","weeklySchedule":[{"day":1,"title":"\u6807\u9898","durationMinutes":30,"exercises":[{"name":"\u52a8\u4f5c","sets":3,"reps":"12","restSeconds":45,"notes":"\u5b89\u5168\u8981\u70b9","category":"\u6838\u5fc3"}]}],"reminders":["\u63d0\u9192"]}
weeklySchedule \u5929\u6570\u5fc5\u987b\u7b49\u4e8e weeklyFrequency\uff1b\u5355\u65e5 durationMinutes \u63a5\u8fd1\u8bf7\u6c42\u503c\uff1b\u4e25\u683c\u907f\u5f00\u7528\u6237 limitations \u4e2d\u7684\u52a8\u4f5c\uff1b\u65e0\u5668\u68b0\u65f6\u4e0d\u5f97\u5b89\u6392\u5668\u68b0\u52a8\u4f5c\uff1b\u4e0d\u5f97\u8f93\u51fa\u4efb\u4f55 URL\u3002`,
      },
      { role: 'user', content: JSON.stringify(params) },
    ],
  });
  return parseJson(content);
}

module.exports = { recognizeFood, recommendRecipes, generateRecipe, recommendWorkout, generateWorkoutPlan, rankRecipeVideos };
