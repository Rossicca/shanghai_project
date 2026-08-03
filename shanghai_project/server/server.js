/**
 * Shanghai Project 本地后端
 * - 提供识别 / 菜谱 / 运动推荐 API
 * - 配置了真实 AI key 就走真调用，否则自动用演示数据（见 ai.js）
 * 启动：node server/server.js   →   http://localhost:8787
 */
const http = require('http');
const { recognizeFood, generateRecipe, recommendWorkout } = require('./ai');
const { WORKOUT_LIBRARY } = require('./demo-data');
const config = require('./config');

const PORT = config.port;
const MAX_BODY = 15 * 1024 * 1024; // 15MB（含 base64 图片）

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const url = (req.url || '').split('?')[0];
  if (req.method === 'GET' && url === '/health') {
    return json(res, 200, { ok: true, mode: config.ai.enabled ? 'real' : 'demo' });
  }
  if (req.method !== 'POST') {
    return json(res, 404, { error: 'not found' });
  }

  const body = await readBody(req).catch(() => ({}));

  try {
    switch (url) {
      case '/api/recognize': {
        const ingredients = await recognizeFood(body.image || '');
        return json(res, 200, { ingredients });
      }
      case '/api/recipe/generate': {
        const recipe = await generateRecipe({
          ingredients: body.ingredients ?? [],
          people: body.people ?? 1,
          cookTime: body.cookTime ?? 20,
          difficulty: body.difficulty ?? '简单',
          user: body.user,
        });
        return json(res, 200, { recipe });
      }
      case '/api/workout/recommend': {
        const videos = await recommendWorkout({
          bodyData: body.bodyData,
          goal: body.goal,
          preference: body.preference,
          limit: body.limit,
        });
        return json(res, 200, { videos });
      }
      case '/api/workout/list': {
        const category = body.category;
        const videos = category
          ? WORKOUT_LIBRARY.filter((w) => w.category === category)
          : WORKOUT_LIBRARY;
        return json(res, 200, { videos });
      }
      default:
        return json(res, 404, { error: 'unknown route' });
    }
  } catch (e) {
    console.error('[server] route error:', e);
    return json(res, 500, { error: '服务异常，请重试' });
  }
}

http.createServer(handle).listen(PORT, () => {
  const mode = config.ai.enabled ? '真实 AI' : '演示数据(mock)';
  console.log(`Shanghai Project 后端已启动: http://localhost:${PORT}  [${mode}]`);
  if (!config.ai.enabled) {
    console.log('提示: 配置 server/config.json 的 ai.apiKey 并 enabled=true 即可切换真实 AI。');
  }
});
