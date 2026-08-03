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
const statsRoutes = require('./routes/stats');

// 旧版兼容路由（保持前端现有调用可用）
const { recognizeFood, generateRecipe, recommendWorkout } = require('./ai');
const { DEMO_INGREDIENTS, WORKOUT_LIBRARY, pickMockRecipe, mockRecommendWorkout } = require('./demo-data');

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

// ---- API v1 路由 (带认证) ----
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);
app.use('/api/v1/recognition', authMiddleware, recognitionRoutes);
app.use('/api/v1/recipes', authMiddleware, recipeRoutes);
app.use('/api/v1/workouts', authMiddleware, workoutRoutes);
app.use('/api/v1/stats', authMiddleware, statsRoutes);

// ---- 旧版 API 兼容 (前端现有调用) ----

// POST /api/recognize — 识别食材
app.post('/api/recognize', async (req, res) => {
  try {
    const ingredients = await recognizeFood(req.body.image || '');
    res.json({ ingredients });
  } catch (e) {
    console.error('[compat] recognize error:', e);
    res.json({ ingredients: DEMO_INGREDIENTS.map((i) => ({ ...i })) });
  }
});

// POST /api/recipe/generate — 生成菜谱
app.post('/api/recipe/generate', async (req, res) => {
  try {
    const recipe = await generateRecipe({
      ingredients: req.body.ingredients ?? [],
      people: req.body.people ?? 1,
      cookTime: req.body.cookTime ?? 20,
      difficulty: req.body.difficulty ?? '简单',
      user: req.body.user,
    });
    res.json({ recipe: { ...recipe, id: 'r' + Date.now() } });
  } catch (e) {
    console.error('[compat] recipe error:', e);
    const recipe = pickMockRecipe(req.body.ingredients || []);
    res.json({ recipe: { ...recipe, id: 'r' + Date.now() } });
  }
});

// POST /api/workout/recommend — 推荐视频
app.post('/api/workout/recommend', async (req, res) => {
  try {
    const videos = await recommendWorkout({
      bodyData: req.body.bodyData,
      goal: req.body.goal,
      preference: req.body.preference,
      limit: req.body.limit,
    });
    res.json({ videos });
  } catch (e) {
    console.error('[compat] recommend error:', e);
    res.json({ videos: mockRecommendWorkout(req.body) });
  }
});

// POST /api/workout/list — 分类视频列表
app.post('/api/workout/list', (req, res) => {
  const category = req.body.category;
  const videos = category
    ? WORKOUT_LIBRARY.filter((w) => w.category === category)
    : WORKOUT_LIBRARY;
  res.json({ videos });
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
