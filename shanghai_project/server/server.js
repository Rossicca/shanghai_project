/**
 * Shanghai Project 后端服务 v2.0
 * Express + JSON 文件数据库 + JWT 认证 + AI 集成
 *
 * 启动：node server/server.js   →   http://localhost:8787
 * 模式：config.json 开启 AI，config.toml 提供本地密钥和模型；配置不完整时使用演示数据
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const https = require('https');
const { authMiddleware, adminMiddleware } = require('./auth');
const { config, isMockMode, getAiStatus } = require('./config');

// 路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recognitionRoutes = require('./routes/recognition');
const recipeRoutes = require('./routes/recipes');
const workoutRoutes = require('./routes/workouts');
const workoutPlanRoutes = require('./routes/workout-plans');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const communityRoutes = require('./routes/community');

// 旧版兼容路由（保持前端现有调用可用）
const { recognizeFood, generateRecipe, recommendWorkout } = require('./ai');
const { DEMO_INGREDIENTS, WORKOUT_LIBRARY, pickMockRecipe, mockRecipeRecommendations, mockRecommendWorkout } = require('./demo-data');
const { discoverRecipeRecommendations, sanitizeSelectedDish } = require('./recipe-discovery');
const { recommendRecipeVideos } = require('./recipe-videos');
const { mergeCuratedWorkoutVideos } = require('./workout-video-safety');

const app = express();
const PORT = config.port || 8787;

// ---- 中间件 ----
app.use(cors({
  origin: '*',
  methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Request-ID',
  exposedHeaders: 'X-Request-ID',
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 本地封面图（抖音视频真实封面由 seed-douyin-videos.js 下载到 data/covers/，
// 签名 URL 有 14 天有效期，落地为本地文件后由这里静态提供，永不裂图）
const COVERS_DIR = path.join(__dirname, 'data', 'covers');
if (fs.existsSync(COVERS_DIR)) {
  app.use('/covers', express.static(COVERS_DIR, { maxAge: '30d', immutable: true }));
}

// 请求链路 ID：优先透传前端值，否则由后端生成。
app.use((req, res, next) => {
  const supplied = req.get('X-Request-ID');
  const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (body?.error && !body.error.requestId) body.error.requestId = requestId;
    return sendJson(body);
  };
  next();
});

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path !== '/health') {
      console.log(`[${req.method}] ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

// ---- 健康检查 ----
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    mode: isMockMode() ? 'demo' : 'real',
    ai: getAiStatus(),
    timestamp: new Date().toISOString(),
  });
});

// B站封面禁止 localhost 热链；仅代理已验证的官方图片域名。
app.get('/api/media/bilibili-cover', async (req, res) => {
  try {
    const target = new URL(String(req.query.url || ''));
    if (target.protocol !== 'https:' || !/(^|\.)hdslb\.com$/i.test(target.hostname)) {
      return res.status(400).json({ error: { code: 'INVALID_MEDIA_URL', message: '无效的封面地址' } });
    }
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://www.bilibili.com/',
      },
    });
    if (!response.ok) throw new Error(`cover HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) throw new Error('cover content type invalid');
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.warn('[media] B站封面代理失败:', error.message);
    res.status(502).json({ error: { code: 'MEDIA_PROXY_FAILED', message: '封面加载失败' } });
  }
});

// ---- API v1 路由 (带认证) ----
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);
app.use('/api/v1/recognition', authMiddleware, recognitionRoutes);
app.use('/api/v1/recipes', authMiddleware, recipeRoutes);
app.use('/api/v1/workouts', authMiddleware, workoutRoutes);
app.use('/api/v1/workout-plans', authMiddleware, workoutPlanRoutes);
app.use('/api/v1/stats', authMiddleware, statsRoutes);
app.use('/api/v1/admin', authMiddleware, adminMiddleware, adminRoutes);
// 社区路由不加全局 authMiddleware：读接口对游客开放，写接口在路由内校验登录
app.use('/api/v1/community', communityRoutes);

// ---- 旧版 API 兼容 (前端现有调用) ----

// POST /api/recognize — 识别食材
app.post('/api/recognize', async (req, res) => {
  try {
    // 支持 images 数组（多图）或 image 单字段（兼容旧版）
    const images = Array.isArray(req.body.images) && req.body.images.length > 0
      ? req.body.images
      : [req.body.image || ''];
    // 逐张识别，合并去重（同名食材取置信度最高的）
    const allResults = await Promise.allSettled(
      images.filter((img) => img && String(img).trim()).map((img) => recognizeFood(img))
    );
    const fulfilledResults = allResults.filter((result) => result.status === 'fulfilled');
    if (allResults.length > 0 && fulfilledResults.length === 0) {
      const firstFailure = allResults.find((result) => result.status === 'rejected');
      throw firstFailure?.reason || new Error('AI 图片识别调用失败');
    }
    const merged = new Map();
    for (const result of allResults) {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
      for (const item of result.value) {
        const key = String(item.name || '').trim();
        if (!key) continue;
        const existing = merged.get(key);
        if (!existing || (item.confidence || 0) > (existing.confidence || 0)) {
          merged.set(key, { ...item, name: key });
        }
      }
    }
    const ingredients = [...merged.values()];
    if (ingredients.length === 0) {
      return res.status(422).json({
        error: {
          code: 'NO_INGREDIENTS_FOUND',
          message: '未识别到有效食材，可以重拍或手动添加',
        },
      });
    }
    res.json({ ingredients });
  } catch (e) {
    console.error('[compat] recognize error:', e);
    res.status(502).json({
      ingredients: [],
      error: {
        code: 'AI_RECOGNITION_FAILED',
        message: '\u56fe\u7247\u8bc6\u522b\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
        requestId: req.requestId,
      },
    });
  }
});

// POST /api/recipe/recommendations — 根据现有食材和用户数据生成候选菜
app.post('/api/recipe/recommendations', async (req, res) => {
  const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : [];
  if (!ingredients.some((item) => String(item?.name || '').trim())) {
    return res.status(400).json({
      error: { code: 'INVALID_PARAMS', message: '请至少提供一种食材' },
    });
  }
  try {
    const recommendations = await discoverRecipeRecommendations({
      ingredients: ingredients.slice(0, 15),
      people: req.body.people ?? 1,
      cookTime: req.body.cookTime ?? 30,
      difficulty: req.body.difficulty ?? '简单',
      mealType: req.body.mealType ?? 'any',
      excludeDishNames: Array.isArray(req.body.excludeDishNames)
        ? req.body.excludeDishNames.map(String).map((name) => name.trim()).filter(Boolean).slice(0, 60)
        : [],
      user: req.body.user,
    });
      res.json({ data: { recommendations, generationMode: 'ai', generationWarning: null } });
    } catch (error) {
      console.error('[compat] recipe recommendations error:', error);
      const recommendations = mockRecipeRecommendations({
        ingredients: ingredients.slice(0, 15),
        people: req.body.people ?? 1,
        cookTime: req.body.cookTime ?? 30,
        difficulty: req.body.difficulty ?? '简单',
        mealType: req.body.mealType ?? 'any',
        excludeDishNames: Array.isArray(req.body.excludeDishNames) ? req.body.excludeDishNames : [],
        user: req.body.user,
      });
      res.json({
        data: {
          recommendations,
          generationMode: 'safe_fallback',
          generationWarning: 'AI 服务暂时不稳定，已先给出可继续选择的安全推荐。',
        },
      });
    }
  });

// POST /api/recipe/generate — 生成用户选定菜品的完整菜谱
app.post('/api/recipe/generate', async (req, res) => {
  try {
    const recipe = await generateRecipe({
      ingredients: req.body.ingredients ?? [],
      people: req.body.people ?? 1,
      cookTime: req.body.cookTime ?? 20,
      difficulty: req.body.difficulty ?? '简单',
      mealType: req.body.mealType ?? 'any',
      selectedDish: sanitizeSelectedDish(req.body.selectedDish),
      user: req.body.user,
    });
    res.json({ recipe: { ...recipe, id: 'r' + Date.now() } });
  } catch (e) {
    console.error('[compat] recipe error:', e);
    res.status(502).json({
      error: {
        code: 'AI_RECIPE_FAILED',
        message: '\u83dc\u8c31\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
      },
    });
  }
});

// POST /api/recipe/videos — 实时检索并匹配菜谱制作视频
app.post('/api/recipe/videos', async (req, res) => {
  const recipe = req.body?.recipe || req.body;
  if (!recipe || typeof recipe.name !== 'string' || !recipe.name.trim()) {
    return res.status(400).json({
      error: { code: 'INVALID_PARAMS', message: '缺少菜谱名称' },
    });
  }
  try {
    const data = await recommendRecipeVideos(recipe);
    res.json({ data });
  } catch (error) {
    console.error('[recipe-videos] recommend error:', error);
    res.status(502).json({
      error: { code: 'RECIPE_VIDEO_SEARCH_FAILED', message: '制作视频搜索失败，请稍后重试' },
    });
  }
});

function mixWorkoutPlatforms(videos) {
  const groups = new Map();
  for (const video of videos) {
    const platform = video.platform || 'bilibili';
    if (!groups.has(platform)) groups.set(platform, []);
    groups.get(platform).push(video);
  }
  if (groups.size < 2) return videos;
  const queues = [...groups.values()].sort((a, b) => a.length - b.length);
  const mixed = [];
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        mixed.push(next);
        added = true;
      }
    }
  }
  return mixed;
}

// 社区上传图片：由后端落盘，三人联调时共享访问；不把大段 base64 存进 SQLite。
const COMMUNITY_UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
if (fs.existsSync(COMMUNITY_UPLOADS_DIR)) {
  app.use('/uploads', express.static(COMMUNITY_UPLOADS_DIR, { maxAge: '7d' }));
}

// POST /api/workout/recommend — 推荐视频
app.post('/api/workout/recommend', async (req, res) => {
  try {
    const db = require('./db');
    let videos = mergeCuratedWorkoutVideos(db.readCollection('workout_videos'));
    if (!videos || videos.length === 0) {
      videos = mockRecommendWorkout(req.body);
    } else {
      // 根据目标筛选
      const goalType = req.body.goal?.type || '保持健康';
      const goalMap = {
        '减脂': ['全身燃脂', '有氧'],
        '增肌': ['臀腿', '肩背', '手臂'],
        '塑形': ['核心', '臀腿', '手臂'],
        '保持健康': ['全身燃脂', '有氧', '拉伸'],
      };
      const targetCats = goalMap[goalType] || ['全身燃脂', '有氧', '拉伸'];
      const filtered = videos.filter((v) => targetCats.includes(v.category));
      if (filtered.length >= 4) videos = filtered;
      // 按播放量排序
      videos.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      videos = mixWorkoutPlatforms(videos);
    }
    const limit = req.body.limit || 8;
    res.json({ videos: videos.slice(0, limit) });
  } catch (e) {
    console.error('[compat] recommend error:', e);
    res.json({ videos: mockRecommendWorkout(req.body) });
  }
});

// POST /api/workout/list — 分类视频列表
app.post('/api/workout/list', (req, res) => {
  const db = require('./db');
  const videos = mergeCuratedWorkoutVideos(db.readCollection('workout_videos'));
  const category = req.body.category;
  const filtered = category
    ? videos.filter((w) => w.category === category)
    : videos;
  filtered.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  res.json({ videos: mixWorkoutPlatforms(filtered).slice(0, 20) });
});

// GET /api/workout/categories — 分类列表
app.get('/api/workout/categories', (req, res) => {
  const cats = [
    { slug: 'recommended', name: '为你推荐', icon: '🔥' },
    { slug: 'glutes_legs', name: '臀腿', icon: '🍑' },
    { slug: 'shoulders_back', name: '肩背', icon: '💪' },
    { slug: 'arms', name: '手臂', icon: '💪' },
    { slug: 'core', name: '核心', icon: '🔥' },
    { slug: 'full_body', name: '全身燃脂', icon: '🏃' },
    { slug: 'cardio', name: '有氧', icon: '❤️' },
    { slug: 'stretch', name: '拉伸', icon: '🧘' },
  ];
  res.json({ data: cats });
});

const COVER_THEMES = {
  '臀腿': ['#245B49', '#55B790'], '全身燃脂': ['#7A3C27', '#F08C61'],
  '核心': ['#43305F', '#8E6CC4'], '肩背': ['#274A68', '#6094BF'],
  '手臂': ['#76531E', '#E6A84E'], '有氧': ['#742F3A', '#E36D7D'],
  '拉伸': ['#17685A', '#47B59D'],
};

function escapeSvgText(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]);
}

function splitCoverTitle(value, maxChars = 11) {
  const chars = [...String(value || '精选健身内容').replace(/\s+/g, ' ').trim()];
  const lines = [];
  while (chars.length && lines.length < 3) lines.push(chars.splice(0, maxChars).join(''));
  return lines.length ? lines : ['精选健身内容'];
}

function sendGeneratedCover(req, res) {
  if (res.headersSent) return;
  const category = String(req.query.category || '全身燃脂').slice(0, 12);
  const platform = String(req.query.platform || '国内精选').slice(0, 12);
  const orientation = req.query.orientation === 'landscape' ? 'landscape' : 'portrait';
  const [dark, accent] = COVER_THEMES[category] || ['#174F43', '#38AE8C'];
  const [width, height] = orientation === 'landscape' ? [1600, 900] : [900, 1600];
  const maxChars = orientation === 'landscape' ? 18 : 11;
  const titleLines = splitCoverTitle(req.query.title, maxChars);
  const titleY = orientation === 'landscape' ? 390 : 720;
  const titleSize = orientation === 'landscape' ? 78 : 72;
  const lineGap = orientation === 'landscape' ? 92 : 90;
  const titleSvg = titleLines.map((line, index) =>
    `<text x="72" y="${titleY + index * lineGap}" fill="#FFFFFF" font-size="${titleSize}" font-weight="800">${escapeSvgText(line)}</text>`
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${width - 80}" cy="120" r="260" fill="#FFFFFF" opacity="0.08"/>
    <circle cx="${width * 0.72}" cy="${height * 0.78}" r="${orientation === 'landscape' ? 240 : 330}" fill="#071E18" opacity="0.12"/>
    <path d="M0 ${height * 0.28} L${width} ${height * 0.08} L${width} ${height * 0.18} L0 ${height * 0.38}Z" fill="#FFFFFF" opacity="0.06"/>
    <rect x="72" y="82" width="${orientation === 'landscape' ? 250 : 230}" height="62" rx="31" fill="#FFFFFF" opacity="0.18"/>
    <text x="${orientation === 'landscape' ? 197 : 187}" y="123" text-anchor="middle" fill="#FFFFFF" font-size="28" font-weight="700">${escapeSvgText(platform)}</text>
    <text x="72" y="${titleY - 74}" fill="#FFFFFF" opacity="0.78" font-size="30" font-weight="650">${escapeSvgText(category)} · 安全内容库</text>
    ${titleSvg}
    <rect x="72" y="${height - 130}" width="150" height="6" rx="3" fill="#FFFFFF" opacity="0.88"/>
  </svg>`;
  res.status(200).set({
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
    'X-Cover-Fallback': 'generated',
  }).send(svg);
}

// 没有远程封面时也返回与分类、标题对应的完整封面，避免纯色空白卡。
app.get('/api/video-cover', sendGeneratedCover);

// GET /api/cover — 优先代理 B站/抖音真实封面；平台暂时不可达时自动返回生成封面。
// 仅允许 B站和抖音图床，避免把该接口变成任意 URL 代理。
app.get('/api/cover', (req, res) => {
  const url = String(req.query.url || '');
  const allowed =
    /^https:\/\/[a-z0-9-]+\.hdslb\.com\/bfs\//.test(url) ||
    /^https:\/\/[a-z0-9-]+\.douyinpic\.com\//.test(url);
  if (!allowed) {
    return sendGeneratedCover(req, res);
  }

  let hops = 0;
  const fetch = (target) => {
    https
      .get(target, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: target.includes('douyinpic.com') ? 'https://www.douyin.com/' : 'https://www.bilibili.com/' } }, (upstream) => {
        const loc = upstream.headers.location;
        if (upstream.statusCode >= 300 && upstream.statusCode < 400 && loc && hops < 3) {
          upstream.resume();
          hops += 1;
          return fetch(loc.startsWith('http') ? loc : new URL(loc, target).toString());
        }
        if (upstream.statusCode !== 200) {
          upstream.resume();
          return sendGeneratedCover(req, res);
        }
        res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        upstream.pipe(res);
      })
      .on('error', () => sendGeneratedCover(req, res));
  };
  fetch(url);
});

// ---- 全局错误处理 ----
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '服务异常，请重试' },
  });
});

// ---- 启动 ----
async function start() {
  // 初始化 SQLite 数据库
  const { getDb } = require('./db');
  await getDb().catch((e) => {
    console.error('[server] 数据库初始化失败:', e);
    process.exit(1);
  });

  app.listen(PORT, () => {
    const mode = isMockMode() ? '演示数据(mock)' : '真实 AI';
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   Shanghai Project 后端 v2.0                ║`);
    console.log(`║   地址: http://localhost:${PORT}                  ║`);
    console.log(`║   模式: ${mode}                         ║`);
    console.log(`║   数据库: SQLite                            ║`);
    console.log(`║   文档: http://localhost:${PORT}/health          ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
    if (isMockMode()) {
      console.log('💡 提示: 复制 server/config.toml.example 为 config.toml，填写本地密钥和模型后可切换真实 AI。');
    }
  });
}

start();
