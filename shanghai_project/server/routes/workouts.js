/**
 * 健身视频路由 — 推荐流 / 分类 / 搜索 / 互动
 * 视频数据来自 B站爬虫（seed-workout-videos.js）+ 抖音精选（seed-douyin-videos.js）
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

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

const GOAL_CATEGORY_MAP = {
  '减脂': ['全身燃脂', '有氧'],
  '增肌': ['臀腿', '肩背', '手臂'],
  '塑形': ['核心', '臀腿', '手臂'],
  '保持健康': ['全身燃脂', '有氧', '拉伸'],
};

/** 获取视频库 */
function getVideoDB() {
  const videos = db.readCollection('workout_videos');
  if (videos.length > 0) return videos;
  // 如果还没有爬取数据，返回空数组
  return [];
}

function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowed = ['bilibili.com', 'www.bilibili.com', 'search.bilibili.com', 'douyin.com', 'www.douyin.com'];
    return url.protocol === 'https:' && allowed.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function stableMetric(id, base, range) {
  const hash = String(id).split('').reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
  return base + (hash % range);
}

/**
 * GET /api/v1/workouts/feed — 推荐视频流
 * 有身体数据时按目标推荐，无数据时按热度稳定排序
 */
router.get('/feed', async (req, res) => {
  try {
    const { category, page = 1, pageSize = 10 } = req.query;
    const userId = req.user?.userId || 'anonymous';

    const bodyData = db.find('body_data', { userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0] || null;
    const goal = db.find('fitness_goals', { userId })[0] || null;

    let videos = getVideoDB();

    if (category && category !== 'recommended') {
      // 按分类筛选
      const catName = SLUG_TO_CATEGORY[category];
      if (catName) {
        videos = videos.filter((v) => v.category === catName);
      }
    } else if (bodyData || goal) {
      // 有身体数据/目标 → 按目标推荐对应分类
      const goalType = goal?.goalType || '保持健康';
      const targetCats = GOAL_CATEGORY_MAP[goalType] || ['全身燃脂', '有氧', '拉伸'];
      videos = videos.filter((v) => targetCats.includes(v.category));
      // 按播放量排序
      videos.sort(
        (a, b) =>
          (b.playCount || 0) - (a.playCount || 0) || String(a.id).localeCompare(String(b.id))
      );
    } else {
      // 无数据也保持稳定顺序，避免翻页时出现重复或漏项。
      videos.sort(
        (a, b) =>
          (b.playCount || 0) - (a.playCount || 0) || String(a.id).localeCompare(String(b.id))
      );
    }

    // 去重（按 id）
    const seen = new Set();
    videos = videos.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
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
          coverUrl: v.coverUrl || null,
          coverColor: v.coverColor || null,
          videoUrl: safeExternalUrl(v.sourceUrl),
          sourceUrl: safeExternalUrl(v.sourceUrl),
          platform: v.platform || 'bilibili',
          source: safeExternalUrl(v.sourceUrl) ? 'external' : 'demo',
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          categoryName: v.category,
          instructor: v.coach,
          targetMuscles: [],
          equipment: [],
          tags: v.tags || [],
          viewCount: v.playCount || stableMetric(v.id, 5000, 100000),
          likeCount: stableMetric(v.id, 500, 10000),
          isLiked: false,
          isSaved: saved.some((s) => s.workoutId === v.id),
          reason: v.reason || '',
          createdAt: v.fetchedAt || new Date().toISOString(),
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
    const videos = getVideoDB();
    const data = CATEGORIES.map((c) => {
      const catName = SLUG_TO_CATEGORY[c.slug];
      const count = catName
        ? videos.filter((v) => v.category === catName).length
        : videos.length;
      return { ...c, count };
    });
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

    let videos = getVideoDB();
    const catName = SLUG_TO_CATEGORY[slug];
    if (catName) {
      videos = videos.filter((v) => v.category === catName);
    }

    if (difficulty) {
      videos = videos.filter((v) => v.difficulty === difficulty);
    }

    if (sort === 'newest') {
      videos.sort((a, b) => (b.fetchedAt || '').localeCompare(a.fetchedAt || ''));
    } else if (sort === 'trending') {
      videos.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else {
      videos.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    }

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;

    res.json({
      data: {
        items: videos.slice(start, start + ps).map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: v.coverUrl || null,
          coverColor: v.coverColor || null,
          sourceUrl: safeExternalUrl(v.sourceUrl),
          platform: v.platform || 'bilibili',
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          instructor: v.coach,
          tags: v.tags || [],
          viewCount: v.playCount || stableMetric(v.id, 5000, 100000),
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
    let videos = getVideoDB().filter(
      (v) =>
        (v.title && v.title.toLowerCase().includes(keyword)) ||
        (v.coach && v.coach.toLowerCase().includes(keyword)) ||
        (v.category && v.category.includes(keyword)) ||
        (v.tags && v.tags.some((t) => t.includes(keyword)))
    );
    // 按播放量排序：与推荐流/分类保持一致，也让抖音等不同来源的内容能混排进前页
    videos.sort(
      (a, b) =>
        (b.playCount || 0) - (a.playCount || 0) || String(a.id).localeCompare(String(b.id))
    );

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;

    res.json({
      data: {
        items: videos.slice(start, start + ps).map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: v.coverUrl || null,
          coverColor: v.coverColor || null,
          sourceUrl: safeExternalUrl(v.sourceUrl),
          platform: v.platform || 'bilibili',
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          instructor: v.coach,
          tags: v.tags || [],
          viewCount: v.playCount || stableMetric(v.id, 5000, 100000),
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
    const videos = getVideoDB();
    const video = videos.find((v) => v.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: { code: 'VIDEO_NOT_FOUND', message: '视频不存在或已失效' } });
    }

    const userId = req.user?.userId || 'anonymous';
    const saved = db.find('saved_workouts', { userId, workoutId: video.id });

    res.json({
      data: {
        id: video.id,
        title: video.title,
        coverUrl: video.coverUrl || null,
        coverColor: video.coverColor || null,
        sourceUrl: safeExternalUrl(video.sourceUrl),
        platform: video.platform || 'bilibili',
        videoUrl: safeExternalUrl(video.sourceUrl),
        source: safeExternalUrl(video.sourceUrl) ? 'external' : 'demo',
        duration: video.duration,
        difficulty: video.difficulty,
        category: video.category,
        categoryName: video.category,
        instructor: video.coach,
        tags: video.tags || [],
        viewCount: video.playCount || stableMetric(video.id, 5000, 100000),
        likeCount: stableMetric(video.id, 500, 10000),
        isLiked: false,
        isSaved: saved.length > 0,
        reason: video.reason || '',
        description: `${video.coach} 的「${video.title}」跟练视频，${video.difficulty}级别，适合${video.category}训练。`,
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
    const video = getVideoDB().find((workout) => workout.id === req.params.id);
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
 * POST /api/v1/workouts/:id/complete — 记录一次训练打卡
 */
router.post('/:id/complete', (req, res) => {
  try {
    const video = getVideoDB().find((item) => item.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: { code: 'VIDEO_NOT_FOUND', message: '视频不存在' } });
    }
    const record = db.insert('workout_history', {
      userId: req.user.userId,
      workoutId: video.id,
      duration: Number(video.duration || 0),
      calories: Number(video.calories || 0),
    });
    res.status(201).json({ data: { historyId: record.id }, message: '训练记录已保存' });
  } catch (e) {
    console.error('[workouts] complete error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '训练记录保存失败' } });
  }
});

/**
 * GET /api/v1/workouts/history/list — 训练打卡记录
 */
router.get('/history/list', (req, res) => {
  try {
    const videos = getVideoDB();
    const items = db.find('workout_history', { userId: req.user.userId })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map((record) => {
        const video = videos.find((item) => item.id === record.workoutId);
        if (!video) return null;
        return {
          ...video,
          historyId: record.id,
          completedAt: record.createdAt,
          calories: Number(record.calories || video.calories || 0),
        };
      })
      .filter(Boolean);
    res.json({ data: items });
  } catch (e) {
    console.error('[workouts] history error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '训练记录读取失败' } });
  }
});

/**
 * GET /api/v1/workouts/saved/list — 收藏列表
 */
router.get('/saved/list', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const saved = db.find('saved_workouts', { userId });
    const videoDB = getVideoDB();
    const items = saved
      .map((savedItem) => ({
        savedItem,
        video: videoDB.find((workout) => workout.id === savedItem.workoutId),
      }))
      .filter(({ video }) => Boolean(video))
      .map(({ savedItem, video }) => ({
        id: video.id,
        title: video.title,
        coverUrl: video.coverUrl || null,
        coverColor: video.coverColor || null,
        sourceUrl: safeExternalUrl(video.sourceUrl),
        platform: video.platform || 'bilibili',
        duration: video.duration,
        difficulty: video.difficulty,
        category: video.category,
        instructor: video.coach,
        tags: video.tags || [],
        savedAt: savedItem.createdAt,
      }));
    res.json({ data: items });
  } catch (e) {
    console.error('[workouts] saved list error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

module.exports = router;
