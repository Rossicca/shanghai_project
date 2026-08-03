/**
 * 健身视频路由 — 推荐流 / 分类 / 搜索 / 互动
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { WORKOUT_LIBRARY } = require('../demo-data');
const { recommendWorkout } = require('../ai');

const CATEGORIES = [
  { slug: 'recommended', name: '为你推荐', icon: '🔥' },
  { slug: 'glutes_legs', name: '臀腿', icon: '🍑' },
  { slug: 'shoulders_back', name: '肩背', icon: '💪' },
  { slug: 'arms', name: '手臂', icon: '💪' },
  { slug: 'core', name: '核心', icon: '🔥' },
  { slug: 'full_body', name: '全身燃脂', icon: '🏃' },
  { slug: 'cardio', name: '有氧', icon: '❤️' },
  { slug: 'stretch', name: '拉伸', icon: '🧘' },
];

const SLUG_TO_CATEGORY = {
  glutes_legs: '臀腿',
  shoulders_back: '肩背',
  arms: '手臂',
  core: '核心',
  full_body: '全身燃脂',
  cardio: '有氧',
  stretch: '拉伸',
};

/**
 * GET /api/v1/workouts/feed — 推荐视频流
 */
router.get('/feed', async (req, res) => {
  try {
    const { category, page = 1, pageSize = 10 } = req.query;
    const userId = req.user?.userId || 'anonymous';

    const bodyData = db.find('body_data', { userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0] || null;
    const goal = db.find('fitness_goals', { userId })[0] || null;

    let videos;
    if (category && category !== 'recommended') {
      const catName = SLUG_TO_CATEGORY[category];
      videos = WORKOUT_LIBRARY.filter((w) => w.category === catName);
    } else if (bodyData || goal) {
      videos = await recommendWorkout({
        bodyData: bodyData ? {
          height: bodyData.height,
          weight: bodyData.weight,
          age: bodyData.age || 25,
          gender: bodyData.gender || '男',
        } : null,
        goal: goal ? { type: goal.goalType } : null,
        limit: 20,
      });
    } else {
      videos = [...WORKOUT_LIBRARY];
    }

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;
    const items = videos.slice(start, start + ps);

    const saved = db.find('saved_workouts', { userId });

    res.json({
      data: {
        items: items.map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: `https://picsum.photos/seed/${v.id}/400/600`,
          videoUrl: v.source || null,
          source: v.source ? 'external' : 'demo',
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          categoryName: v.category,
          instructor: v.coach,
          targetMuscles: v.tags?.filter((t) => ['臀腿', '核心', '手臂', '肩背'].includes(t)) || [],
          equipment: [],
          tags: v.tags || [],
          viewCount: Math.floor(Math.random() * 100000) + 5000,
          likeCount: Math.floor(Math.random() * 10000) + 500,
          isLiked: false,
          isSaved: saved.some((s) => s.workoutId === v.id),
          reason: v.reason || '',
          createdAt: new Date().toISOString(),
        })),
        total: videos.length,
        page: p,
        pageSize: ps,
        hasMore: start + ps < videos.length,
      },
    });
  } catch (e) {
    console.error('[workouts] feed error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/workouts/categories — 分类列表
 */
router.get('/categories', (req, res) => {
  try {
    const data = CATEGORIES.map((c) => ({
      ...c,
      count: c.slug === 'recommended'
        ? WORKOUT_LIBRARY.length
        : WORKOUT_LIBRARY.filter((w) => w.category === SLUG_TO_CATEGORY[c.slug]).length,
    }));
    res.json({ data });
  } catch (e) {
    console.error('[workouts] categories error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/workouts/category/:slug — 分类视频列表
 */
router.get('/category/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, pageSize = 10, difficulty, sort = 'hot' } = req.query;

    const catName = SLUG_TO_CATEGORY[slug];
    let videos = catName
      ? WORKOUT_LIBRARY.filter((w) => w.category === catName)
      : [...WORKOUT_LIBRARY];

    if (difficulty) {
      videos = videos.filter((w) => w.difficulty === difficulty);
    }

    if (sort === 'newest') {
      videos.sort((a, b) => b.id.localeCompare(a.id));
    } else if (sort === 'trending') {
      videos.sort(() => Math.random() - 0.5);
    } else {
      videos.sort((a, b) => b.duration - a.duration);
    }

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;

    res.json({
      data: {
        items: videos.slice(start, start + ps).map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: `https://picsum.photos/seed/${v.id}/400/600`,
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          instructor: v.coach,
          tags: v.tags || [],
          viewCount: Math.floor(Math.random() * 100000) + 5000,
          isLiked: false,
          isSaved: false,
        })),
        total: videos.length,
        page: p,
        pageSize: ps,
        hasMore: start + ps < videos.length,
      },
    });
  } catch (e) {
    console.error('[workouts] category error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/workouts/search — 搜索视频
 */
router.get('/search', (req, res) => {
  try {
    const { q, page = 1, pageSize = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '请输入搜索关键词' } });
    }

    const keyword = q.toLowerCase();
    let videos = WORKOUT_LIBRARY.filter(
      (w) =>
        w.title.toLowerCase().includes(keyword) ||
        w.coach.toLowerCase().includes(keyword) ||
        w.category.includes(keyword) ||
        w.tags?.some((t) => t.includes(keyword))
    );

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;

    res.json({
      data: {
        items: videos.slice(start, start + ps).map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: `https://picsum.photos/seed/${v.id}/400/600`,
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          instructor: v.coach,
          tags: v.tags || [],
          viewCount: Math.floor(Math.random() * 100000) + 5000,
        })),
        total: videos.length,
        page: p,
        pageSize: ps,
        hasMore: start + ps < videos.length,
      },
    });
  } catch (e) {
    console.error('[workouts] search error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * GET /api/v1/workouts/:id — 视频详情
 */
router.get('/:id', (req, res) => {
  try {
    const video = WORKOUT_LIBRARY.find((w) => w.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: { code: 'VIDEO_NOT_FOUND', message: '视频不存在或已失效' } });
    }

    const userId = req.user?.userId || 'anonymous';
    const saved = db.find('saved_workouts', { userId, workoutId: video.id });

    res.json({
      data: {
        id: video.id,
        title: video.title,
        coverUrl: `https://picsum.photos/seed/${video.id}/400/600`,
        videoUrl: video.source || null,
        source: video.source ? 'external' : 'demo',
        duration: video.duration,
        difficulty: video.difficulty,
        category: video.category,
        categoryName: video.category,
        instructor: video.coach,
        tags: video.tags || [],
        viewCount: Math.floor(Math.random() * 100000) + 5000,
        likeCount: Math.floor(Math.random() * 10000) + 500,
        isLiked: false,
        isSaved: saved.length > 0,
        reason: video.reason || '',
        description: `${video.coach} 教练的「${video.title}」跟练课程，${video.difficulty}级别，适合${video.category}训练。`,
      },
    });
  } catch (e) {
    console.error('[workouts] detail error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * POST /api/v1/workouts/:id/like — 点赞
 */
router.post('/:id/like', (req, res) => {
  res.json({ data: { workoutId: req.params.id }, message: '已点赞' });
});

/**
 * DELETE /api/v1/workouts/:id/like — 取消点赞
 */
router.delete('/:id/like', (req, res) => {
  res.json({ data: { workoutId: req.params.id }, message: '已取消点赞' });
});

/**
 * POST /api/v1/workouts/:id/save — 收藏视频
 */
router.post('/:id/save', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const video = WORKOUT_LIBRARY.find((w) => w.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: { code: 'VIDEO_NOT_FOUND', message: '视频不存在' } });
    }
    const existing = db.find('saved_workouts', { userId, workoutId: req.params.id });
    if (existing.length === 0) {
      db.insert('saved_workouts', { userId, workoutId: req.params.id });
    }
    res.json({ data: { workoutId: req.params.id }, message: '已收藏' });
  } catch (e) {
    console.error('[workouts] save error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * DELETE /api/v1/workouts/:id/save — 取消收藏
 */
router.delete('/:id/save', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    db.removeMany('saved_workouts', { userId, workoutId: req.params.id });
    res.json({ data: { workoutId: req.params.id }, message: '已取消收藏' });
  } catch (e) {
    console.error('[workouts] unsave error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * GET /api/v1/workouts/saved — 收藏列表
 */
router.get('/saved/list', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const saved = db.find('saved_workouts', { userId });
    const videos = saved
      .map((savedItem) => ({
        savedItem,
        video: WORKOUT_LIBRARY.find((workout) => workout.id === savedItem.workoutId),
      }))
      .filter(({ video }) => Boolean(video))
      .map(({ savedItem, video }) => ({
        id: video.id,
        title: video.title,
        coverUrl: `https://picsum.photos/seed/${video.id}/400/600`,
        duration: video.duration,
        difficulty: video.difficulty,
        category: video.category,
        instructor: video.coach,
        tags: video.tags || [],
        savedAt: savedItem.createdAt,
      }));
    res.json({ data: videos });
  } catch (e) {
    console.error('[workouts] saved list error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

module.exports = router;
