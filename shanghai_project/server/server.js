/**
 * Shanghai Project 后端服务 v2.0
 * Express + JSON 文件数据库 + JWT 认证 + AI 集成
 *
 * 启动：node server/server.js   →   http://localhost:8787
 * 模式：config.json 中 ai.enabled=true 开启真实 AI，false 使用演示数据
 */

const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./auth');
const config = require('./config.json');

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
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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
  res.json({ ok: true, mode: config.ai.enabled ? 'real' : 'demo', timestamp: new Date().toISOString() });
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
  const mode = config.ai.enabled ? '真实 AI' : '演示数据(mock)';
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   Shanghai Project 后端 v2.0                ║`);
  console.log(`║   地址: http://localhost:${PORT}                  ║`);
  console.log(`║   模式: ${mode}                         ║`);
  console.log(`║   文档: http://localhost:${PORT}/health          ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  if (!config.ai.enabled) {
    console.log('💡 提示: 编辑 server/config.json 配置 ai.apiKey 并 enabled=true 即可切换真实 AI。');
  }
});