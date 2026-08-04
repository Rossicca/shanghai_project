/**
 * Shanghai Project 后端服务 v2.0
 * Express + JSON 文件数据库 + JWT 认证 + AI 集成
 *
 * 启动：node server/server.js   →   http://localhost:8787
 * 模式：config.json 开启 AI，config.toml 提供本地密钥和模型；配置不完整时使用演示数据
 */

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const { authMiddleware } = require('./auth');
const { config, isMockMode } = require('./config');

// 路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recognitionRoutes = require('./routes/recognition');
const recipeRoutes = require('./routes/recipes');
const workoutRoutes = require('./routes/workouts');
const workoutPlanRoutes = require('./routes/workout-plans');
const statsRoutes = require('./routes/stats');

// 旧版兼容路由（保持前端现有调用可用）
const { recognizeFood, generateRecipe, recommendWorkout } = require('./ai');
const { DEMO_INGREDIENTS, WORKOUT_LIBRARY, pickMockRecipe, mockRecommendWorkout } = require('./demo-data');
const { discoverRecipeRecommendations, sanitizeSelectedDish } = require('./recipe-discovery');
const { recommendRecipeVideos } = require('./recipe-videos');

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
  res.json({ ok: true, mode: isMockMode() ? 'demo' : 'real', timestamp: new Date().toISOString() });
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

// ---- 旧版 API 兼容 (前端现有调用) ----

// POST /api/recognize — 识别食材
app.post('/api/recognize', async (req, res) => {
  try {
    const ingredients = await recognizeFood(req.body.image || '');
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
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
      user: req.body.user,
    });
    res.json({ data: { recommendations } });
  } catch (error) {
    console.error('[compat] recipe recommendations error:', error);
    res.status(502).json({
      error: { code: 'AI_RECOMMENDATIONS_FAILED', message: '菜谱推荐失败，请稍后重试' },
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

// POST /api/workout/recommend — 推荐视频
app.post('/api/workout/recommend', async (req, res) => {
  try {
    const db = require('./db');
    let videos = db.readCollection('workout_videos');
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
  const videos = db.readCollection('workout_videos');
  const category = req.body.category;
  const filtered = category
    ? videos.filter((w) => w.category === category)
    : videos;
  res.json({ videos: filtered.slice(0, 20) });
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

// ---- 全局错误处理 ----
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '服务异常，请重试' },
  });
});

// ---- 启动 ----
app.listen(PORT, () => {
  const mode = isMockMode() ? '演示数据(mock)' : '真实 AI';
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   Shanghai Project 后端 v2.0                ║`);
  console.log(`║   地址: http://localhost:${PORT}                  ║`);
  console.log(`║   模式: ${mode}                         ║`);
  console.log(`║   文档: http://localhost:${PORT}/health          ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  if (isMockMode()) {
    console.log('💡 提示: 复制 server/config.toml.example 为 config.toml，填写本地密钥和模型后可切换真实 AI。');
  }
});
