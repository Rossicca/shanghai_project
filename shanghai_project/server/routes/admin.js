/**
 * admin.js — 管理员路由
 * 用户管理 / 数据看板 / 系统管理
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { DB_PATH } = require('../db');

/**
 * GET /api/v1/admin/stats — 数据看板
 */
router.get('/stats', (req, res) => {
  try {
    const users = db.readCollection('users');
    const bodyData = db.readCollection('body_data');
    const goals = db.readCollection('fitness_goals');
    const recipes = db.readCollection('recipes');
    const sessions = db.readCollection('recognition_sessions');
    const savedWorkouts = db.readCollection('saved_workouts');
    const workoutPlans = db.readCollection('workout_plans');
    const videos = db.readCollection('workout_videos');

    const adminCount = users.filter((u) => u.role === 'admin').length;
    const today = new Date().toISOString().slice(0, 10);
    const todayRegistrations = users.filter((u) => u.createdAt?.startsWith(today)).length;
    const todayRecognitions = sessions.filter((s) => s.createdAt?.startsWith(today)).length;

    // 性别分布
    const genderDist = { male: 0, female: 0, other: 0 };
    users.forEach((u) => {
      if (u.gender === '男' || u.gender === 'male') genderDist.male++;
      else if (u.gender === '女' || u.gender === 'female') genderDist.female++;
      else genderDist.other++;
    });

    // 目标分布
    const goalDist = {};
    goals.forEach((g) => {
      const t = g.goalType || 'unknown';
      goalDist[t] = (goalDist[t] || 0) + 1;
    });

    res.json({
      data: {
        users: {
          total: users.length,
          admin: adminCount,
          todayRegistrations,
          genderDistribution: genderDist,
        },
        bodyData: { total: bodyData.length },
        goals: { total: goals.length, distribution: goalDist },
        recipes: { total: recipes.length },
        recognition: { total: sessions.length, today: todayRecognitions },
        savedWorkouts: { total: savedWorkouts.length },
        workoutPlans: { total: workoutPlans.length },
        workoutVideos: { total: videos.length },
        // 数据来源：每台机器各有一份本地 SQLite，看板只反映本机数据
        source: {
          dbPath: DB_PATH,
          dbSizeBytes: db.getDbSize(),
          scope: 'local',
        },
      },
    });
  } catch (e) {
    console.error('[admin] stats error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * GET /api/v1/admin/users — 用户列表
 */
router.get('/users', (req, res) => {
  try {
    const { page = 1, pageSize = 20, role, search } = req.query;
    let users = db.readCollection('users');

    // 筛选
    if (role) users = users.filter((u) => u.role === role);
    if (search) {
      const keyword = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(keyword) ||
          u.nickname?.toLowerCase().includes(keyword) ||
          u.id?.toLowerCase().includes(keyword)
      );
    }

    // 排序（最新的在前）
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 20, 50);
    const start = (p - 1) * ps;

    const items = users.slice(start, start + ps).map((u) => {
      const bodyData = db.find('body_data', { userId: u.id }).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0] || null;
      const goal = db.find('fitness_goals', { userId: u.id })[0] || null;
      const sessionCount = db.find('recognition_sessions', { userId: u.id }).length;

      return {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        gender: u.gender,
        role: u.role || 'user',
        createdAt: u.createdAt,
        lastBodyData: bodyData
          ? { height: bodyData.height, weight: bodyData.weight, measuredAt: bodyData.measuredAt }
          : null,
        goal: goal ? { goalType: goal.goalType, weeklyFrequency: goal.weeklyFrequency } : null,
        recognitionCount: sessionCount,
      };
    });

    res.json({
      data: {
        items,
        total: users.length,
        page: p,
        pageSize: ps,
        hasMore: start + ps < users.length,
      },
    });
  } catch (e) {
    console.error('[admin] users list error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * GET /api/v1/admin/users/:id — 用户详情
 */
router.get('/users/:id', (req, res) => {
  try {
    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    }

    const bodyData = db.find('body_data', { userId: user.id }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const goal = db.find('fitness_goals', { userId: user.id })[0] || null;
    const preferences = db.find('preferences', { userId: user.id })[0] || null;
    const sessions = db.find('recognition_sessions', { userId: user.id }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const savedWorkouts = db.find('saved_workouts', { userId: user.id });
    const recipes = db.find('recipes', { userId: user.id }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          gender: user.gender,
          birthday: user.birthday,
          role: user.role || 'user',
          createdAt: user.createdAt,
        },
        bodyData: bodyData.slice(0, 10),
        goal,
        preferences,
        recognitionHistory: sessions.slice(0, 20).map((s) => ({
          id: s.id,
          ingredients: s.ingredients,
          totalNutrition: s.totalNutrition,
          createdAt: s.createdAt,
        })),
        savedWorkoutCount: savedWorkouts.length,
        recipeCount: recipes.length,
      },
    });
  } catch (e) {
    console.error('[admin] user detail error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/role — 修改用户角色
 */
router.patch('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: { code: 'INVALID_ROLE', message: '角色必须是 user 或 admin' },
      });
    }

    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    }

    // 不能修改自己的角色
    if (user.id === req.user.userId) {
      return res.status(400).json({
        error: { code: 'CANNOT_SELF_MODIFY', message: '不能修改自己的角色' },
      });
    }

    db.update('users', req.params.id, { role });
    res.json({ data: { id: user.id, email: user.email, role }, message: '角色已更新' });
  } catch (e) {
    console.error('[admin] role update error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

/**
 * DELETE /api/v1/admin/users/:id — 删除用户
 */
router.delete('/users/:id', (req, res) => {
  try {
    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    }

    // 不能删除自己
    if (user.id === req.user.userId) {
      return res.status(400).json({
        error: { code: 'CANNOT_SELF_DELETE', message: '不能删除自己的账号' },
      });
    }

    // 删除用户所有关联数据
    db.removeMany('body_data', { userId: user.id });
    db.removeMany('fitness_goals', { userId: user.id });
    db.removeMany('preferences', { userId: user.id });
    db.removeMany('recognition_sessions', { userId: user.id });
    db.removeMany('saved_workouts', { userId: user.id });
    db.removeMany('recipes', { userId: user.id });
    db.removeMany('workout_plans', { userId: user.id });
    db.remove('users', user.id);

    res.json({ data: { id: user.id, email: user.email }, message: '用户已删除' });
  } catch (e) {
    console.error('[admin] user delete error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
  }
});

module.exports = router;