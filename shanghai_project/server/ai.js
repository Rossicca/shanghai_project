/**
 * AI 提供者 v2.0
 * - 兼容 OpenAI 协议（火山方舟 / 通义千问 / DeepSeek / Moonshot 等）
 * - 配置了真实 API Key 就走真调用，否则/失败时自动降级到演示数据
 * - API Key 和接入点 ID 放在 server/config.toml 中（已加入 .gitignore，不会泄露）
 * - 非敏感通用配置仍在 server/config.json
 */

const { DEMO_INGREDIENTS, pickMockRecipe, mockRecommendWorkout } = require('./demo-data');
const { config, isMockMode } = require('./config');

function httpJson(url, options) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const mod = require(u.protocol === 'http:' ? 'http' : 'https');
    const req = mod.request(
      u,
      { method: options.method || 'POST', headers: options.headers, timeout: 45000 },
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
  throw new Error('模型输出不是合法 JSON');
}

async function chat({ model, messages, temperature = 0.7, maxTokens = 1500 }) {
  const res = await httpJson(`${config.ai.baseURL}/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  if (res.status !== 200) {
    throw new Error(`AI API 错误 ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  return res.data.choices?.[0]?.message?.content ?? '';
}

/** 1. 识别食物 */
async function recognizeFood(imageBase64) {
  if (isMockMode()) return DEMO_INGREDIENTS.map((i) => ({ ...i }));
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

/** 2. 生成菜谱 */
async function generateRecipe(params) {
  if (isMockMode()) {
    const recipe = pickMockRecipe(params.ingredients);
    return { ...recipe, id: 'r' + Date.now() };
  }
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 2200,
      temperature: 0.8,
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
数值要合理，确保总热量在目标热量 ±10% 范围内。`,
        },
        {
          role: 'user',
          content: `食材：${JSON.stringify(params.ingredients)}
人数：${params.people || 1}
限时：${params.cookTime || 20}分钟
难度：${params.difficulty || '简单'}
${params.style ? `做法偏好：${params.style}` : ''}
${params.user?.caloriesTarget ? `目标热量：${params.user.caloriesTarget}kcal/餐` : ''}
${params.user?.goal ? `健身目标：${params.user.goal}` : ''}`,
        },
      ],
    });
    const parsed = parseJson(content);
    return { ...parsed, id: 'r' + Date.now() };
  } catch (e) {
    console.error('[ai] 真实菜谱生成调用失败:', e.message);
    throw e;
  }
}

/** 3. 运动推荐 */
async function recommendWorkout(params) {
  if (isMockMode()) return mockRecommendWorkout(params);
  try {
    const content = await chat({
      model: config.ai.textModel,
      maxTokens: 2000,
      temperature: 0.7,
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

module.exports = { recognizeFood, generateRecipe, recommendWorkout };
