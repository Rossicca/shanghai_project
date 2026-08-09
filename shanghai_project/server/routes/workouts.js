/**
 * 健身视频路由 — 推荐流 / 分类 / 搜索 / 互动
 * 视频数据来自 B站爬虫（seed-workout-videos.js）+ 抖音精选（seed-douyin-videos.js）
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { rankWorkoutVideos } = require('../ai');
const { mergeCuratedWorkoutVideos } = require('../workout-video-safety');

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

function normalizedGoal(value) {
  return ({ lose_fat: '减脂', gain_muscle: '增肌', shape: '塑形', maintain: '保持健康' })[value] || value || '保持健康';
}

function coverOrientation(video) {
  if (['portrait', 'landscape', 'square'].includes(video.coverOrientation)) return video.coverOrientation;
  return video.platform === 'douyin' ? 'portrait' : 'landscape';
}

function diversifyPlatforms(videos) {
  const groups = new Map();
  for (const video of videos) {
    const platform = video.platform || 'bilibili';
    if (!groups.has(platform)) groups.set(platform, []);
    groups.get(platform).push(video);
  }
  if (groups.size < 2) return videos;

  // 小体量平台优先进入首屏，再逐个平台轮换。这样数据量大的 B 站不会
  // 把抖音等来源挤到后续分页，同时保留每个平台原有的热度顺序。
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

/** 获取视频库 */
function getVideoDB() {
  const videos = db.readCollection('workout_videos');
  if (videos.length > 0) return mergeCuratedWorkoutVideos(videos)
    .filter((video) => ['bilibili', 'douyin'].includes(video.platform || 'bilibili'));
  // 如果还没有爬取数据，返回空数组
  return [];
}

function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowed = [
      'bilibili.com', 'www.bilibili.com', 'search.bilibili.com',
      'douyin.com', 'www.douyin.com',
    ];
    return url.protocol === 'https:' && allowed.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function stableMetric(id, base, range) {
  const hash = String(id).split('').reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
  return base + (hash % range);
}

function latestByCreatedAt(collection, userId) {
  return db.find(collection, { userId }).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )[0] || null;
}

function inferContentType(video) {
  const text = [video.title, ...(Array.isArray(video.tags) ? video.tags : [])].join(' ');
  if (/热身|拉伸|放松|泡沫轴|灵活性|恢复/i.test(text)) return '热身与恢复';
  if (/讲解|教学|动作|姿势|错误|要领|基础知识|科普/i.test(text)) return '动作教学';
  if (/知识|原理|饮食|营养|睡眠|论文|研究/i.test(text)) return '健身知识';
  if (/成果|改变|蜕变|记录|打卡/i.test(text)) return '健康成果';
  return '跟练训练';
}

function mapFeedVideo(video, { saved = [], reason = '', basis = '' } = {}) {
  return {
    id: video.id,
    title: video.title,
    coverUrl: video.coverUrl || null,
    coverOrientation: coverOrientation(video),
    coverColor: video.coverColor || null,
    videoUrl: safeExternalUrl(video.sourceUrl),
    sourceUrl: safeExternalUrl(video.sourceUrl),
    platform: video.platform || 'bilibili',
    source: safeExternalUrl(video.sourceUrl) ? 'external' : 'demo',
    duration: video.duration,
    difficulty: video.difficulty,
    category: video.category,
    categoryName: video.category,
    contentType: inferContentType(video),
    instructor: video.coach,
    targetMuscles: [],
    equipment: [],
    tags: video.tags || [],
    viewCount: video.playCount || stableMetric(video.id, 5000, 100000),
    likeCount: stableMetric(video.id, 500, 10000),
    isLiked: false,
    isSaved: saved.some((item) => item.workoutId === video.id),
    reason: reason || video.reason || '',
    recommendationBasis: basis || '按视频内容质量与安全性推荐',
    createdAt: video.fetchedAt || new Date().toISOString(),
  };
}

function buildRecommendationProfile(userId) {
  const body = latestByCreatedAt('body_data', userId);
  const goal = latestByCreatedAt('fitness_goals', userId);
  const plan = latestByCreatedAt('workout_plans', userId);
  const history = db.find('workout_history', { userId }).slice(-20);
  const saved = db.find('saved_workouts', { userId }).slice(-20);
  const bmi = body?.height && body?.weight
    ? Math.round((Number(body.weight) / ((Number(body.height) / 100) ** 2)) * 10) / 10
    : null;
  return {
    gender: body?.gender || null,
    age: body?.age || null,
    height: body?.height || null,
    weight: body?.weight || null,
    bmiScreening: bmi,
    bodyFat: body?.bodyFat || null,
    waist: body?.waist || null,
    hip: body?.hip || null,
    goalTypes: Array.isArray(goal?.goalTypes) && goal.goalTypes.length
      ? goal.goalTypes
      : [goal?.goalType || goal?.type].filter(Boolean),
    weeklyFrequency: plan?.planConditions?.weeklyFrequency || goal?.weeklyFrequency || null,
    fitnessLevel: plan?.planConditions?.fitnessLevel || null,
    trainingMode: plan?.planConditions?.trainingMode || null,
    equipment: plan?.planConditions?.equipment || [],
    preferredTraining: plan?.planConditions?.preferredTraining || [],
    limitations: plan?.planConditions?.limitations || [],
    recentWorkoutIds: history.map((item) => item.workoutId),
    savedWorkoutIds: saved.map((item) => item.workoutId),
    profileInsights: plan?.profileAnalysis?.insights || [],
  };
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
      const goalType = normalizedGoal(goal?.goalType || goal?.type);
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

    videos = diversifyPlatforms(videos);

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
          coverOrientation: coverOrientation(v),
          coverColor: v.coverColor || null,
          videoUrl: safeExternalUrl(v.sourceUrl),
          sourceUrl: safeExternalUrl(v.sourceUrl),
          platform: v.platform || 'bilibili',
          source: safeExternalUrl(v.sourceUrl) ? 'external' : 'demo',
          duration: v.duration,
          difficulty: v.difficulty,
          category: v.category,
          categoryName: v.category,
          contentType: inferContentType(v),
          instructor: v.coach,
          targetMuscles: [],
          equipment: [],
          tags: v.tags || [],
          viewCount: v.playCount || stableMetric(v.id, 5000, 100000),
          likeCount: stableMetric(v.id, 500, 10000),
          isLiked: false,
          isSaved: saved.some((s) => s.workoutId === v.id),
          reason: v.reason || '',
          recommendationBasis: bodyData || goal
            ? `已结合${bodyData ? '身体数据' : ''}${bodyData && goal ? '和' : ''}${goal ? `“${normalizedGoal(goal.goalType || goal.type)}”目标` : ''}`
            : '按视频热度与内容质量推荐',
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
/** 双击分类栏时，让 AI 只从真实且已通过安全过滤的候选库中换一组。 */
router.post('/feed/refresh', async (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const limit = Math.min(Math.max(Number(req.body?.limit) || 6, 3), 10);
  const category = String(req.body?.category || 'recommended');
  const excludeIds = new Set(
    (Array.isArray(req.body?.excludeIds) ? req.body.excludeIds : []).map(String).slice(0, 80)
  );

  try {
    const profile = buildRecommendationProfile(userId);
    for (const id of profile.recentWorkoutIds) excludeIds.add(String(id));

    let candidates = getVideoDB();
    const categoryName = SLUG_TO_CATEGORY[category];
    if (categoryName) candidates = candidates.filter((video) => video.category === categoryName);

    const unseen = candidates.filter((video) => !excludeIds.has(String(video.id)));
    if (unseen.length >= limit) candidates = unseen;

    const offset = candidates.length
      ? (Date.now() + String(userId).length * 17) % candidates.length
      : 0;
    candidates = diversifyPlatforms([...candidates.slice(offset), ...candidates.slice(0, offset)])
      .slice(0, Math.max(limit * 8, 36))
      .map((video) => ({ ...video, contentType: inferContentType(video) }));

    let ranked = [];
    let generationMode = 'ai';
    let generationWarning = '';
    try {
      ranked = await rankWorkoutVideos({ profile, candidates, limit });
    } catch (error) {
      generationMode = 'safe_fallback';
      generationWarning = 'AI 推荐刚才响应不稳定，已从安全健身视频库中为你换了一组，可稍后再次双击刷新。';
      console.warn('[workouts] AI refresh fallback:', error.message);
    }

    const candidateMap = new Map(candidates.map((video) => [String(video.id), video]));
    const selected = ranked
      .map((item) => ({ video: candidateMap.get(String(item.id)), reason: item.reason }))
      .filter((item) => Boolean(item.video));

    if (selected.length < Math.min(3, limit)) {
      generationMode = 'safe_fallback';
      generationWarning ||= 'AI 没有返回足够合适的内容，已用安全视频库补足本次推荐。';
    }

    if (selected.length < limit) {
      const selectedIds = new Set(selected.map((item) => String(item.video.id)));
      for (const video of diversifyPlatforms(candidates)) {
        if (selected.length >= limit) break;
        if (!selectedIds.has(String(video.id))) {
          selected.push({ video, reason: '匹配当前分类，并已通过健身内容与链接安全筛选。' });
          selectedIds.add(String(video.id));
        }
      }
    }

    const availablePlatforms = new Set(candidates.map((video) => video.platform).filter(Boolean));
    const selectedPlatforms = new Set(selected.map((item) => item.video.platform).filter(Boolean));
    if (availablePlatforms.size > 1 && selectedPlatforms.size === 1 && selected.length > 1) {
      const existingIds = new Set(selected.map((item) => String(item.video.id)));
      const onlyPlatform = selected[0].video.platform;
      const crossPlatform = candidates.find(
        (video) => video.platform !== onlyPlatform && !existingIds.has(String(video.id))
      );
      if (crossPlatform) {
        selected[selected.length - 1] = {
          video: crossPlatform,
          reason: '与当前目标匹配，并补充了不同平台的安全健身内容。',
        };
      }
    }

    const saved = db.find('saved_workouts', { userId });
    const basis = generationMode === 'ai'
      ? 'AI 已结合身体数据、目标、能力、限制、训练记录与收藏重新排序'
      : '安全候选库临时排序；未冒充 AI 个性化结果';

    return res.json({
      data: {
        items: selected.slice(0, limit).map(({ video, reason }) =>
          mapFeedVideo(video, { saved, reason, basis })
        ),
        generationMode,
        generationWarning,
        refreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[workouts] refresh error:', error);
    return res.status(500).json({
      error: { code: 'WORKOUT_REFRESH_FAILED', message: '暂时无法换一组视频，请稍后再试' },
    });
  }
});

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
    videos = diversifyPlatforms(videos);

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;

    res.json({
      data: {
        items: videos.slice(start, start + ps).map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: v.coverUrl || null,
          coverOrientation: coverOrientation(v),
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
    videos = diversifyPlatforms(videos);

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 10, 20);
    const start = (p - 1) * ps;

    res.json({
      data: {
        items: videos.slice(start, start + ps).map((v) => ({
          id: v.id,
          title: v.title,
          coverUrl: v.coverUrl || null,
          coverOrientation: coverOrientation(v),
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
        coverOrientation: coverOrientation(video),
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
        coverOrientation: coverOrientation(video),
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
