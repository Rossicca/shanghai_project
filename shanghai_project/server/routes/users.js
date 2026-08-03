/**
 * 用户路由 — 个人信息 / 身体数据 / 健身目标
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/v1/users/me — 获取个人信息
 */
router.get('/me', (req, res) => {
  try {
    const user = db.findById('users', req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      });
    }

    const bodyData = db.find('body_data', { userId: req.user.userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0] || null;

    const goal = db.find('fitness_goals', { userId: req.user.userId })[0] || null;

    const preferences = db.find('preferences', { userId: req.user.userId })[0] || null;

    res.json({
      data: {
        userId: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        birthday: user.birthday,
        email: user.email,
        fitnessGoal: goal ? {
          goalType: goal.goalType,
          targetWeight: goal.targetWeight,
          targetDate: goal.targetDate,
          activityLevel: goal.activityLevel,
          weeklyFrequency: goal.weeklyFrequency,
        } : null,
        bodyData: bodyData ? {
          height: bodyData.height,
          weight: bodyData.weight,
          bodyFat: bodyData.bodyFat,
          waist: bodyData.waist,
          hip: bodyData.hip,
          measuredAt: bodyData.measuredAt || bodyData.createdAt?.slice(0, 10),
        } : null,
        preferences: preferences ? {
          dietType: preferences.dietType,
          allergies: preferences.allergies || [],
          cuisinePreferences: preferences.cuisinePreferences || [],
          maxCookTime: preferences.maxCookTime,
          workoutLocation: preferences.workoutLocation,
          hasEquipment: preferences.hasEquipment,
        } : null,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    console.error('[users] get me error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * PUT /api/v1/users/me — 更新个人信息
 */
router.put('/me', (req, res) => {
  try {
    const allowed = ['nickname', 'avatarUrl', 'gender', 'birthday'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = db.update('users', req.user.userId, updates);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      });
    }

    res.json({ data: { userId: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl, gender: user.gender, birthday: user.birthday }, message: '更新成功' });
  } catch (e) {
    console.error('[users] update error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * POST /api/v1/users/me/body-data — 保存身体数据
 */
router.post('/me/body-data', (req, res) => {
  try {
    const { height, weight, bodyFat, waist, hip } = req.body;
    if (!height || !weight) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '身高和体重为必填项' },
      });
    }

    const record = db.insert('body_data', {
      userId: req.user.userId,
      height: Number(height),
      weight: Number(weight),
      bodyFat: bodyFat ? Number(bodyFat) : null,
      waist: waist ? Number(waist) : null,
      hip: hip ? Number(hip) : null,
      measuredAt: new Date().toISOString().slice(0, 10),
    });

    res.json({ data: record, message: '身体数据已保存' });
  } catch (e) {
    console.error('[users] body-data error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/users/me/body-data — 获取最新身体数据
 */
router.get('/me/body-data', (req, res) => {
  try {
    const records = db.find('body_data', { userId: req.user.userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ data: records[0] || null });
  } catch (e) {
    console.error('[users] body-data get error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/users/me/body-data/history — 身体数据历史
 */
router.get('/me/body-data/history', (req, res) => {
  try {
    const records = db.find('body_data', { userId: req.user.userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({
      data: records.map((r) => ({
        date: r.measuredAt || r.createdAt?.slice(0, 10),
        weight: r.weight,
        height: r.height,
        bodyFat: r.bodyFat,
      })),
    });
  } catch (e) {
    console.error('[users] body-data history error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * PUT /api/v1/users/me/goal — 设置健身目标
 */
router.put('/me/goal', (req, res) => {
  try {
    const { goalType, targetWeight, targetDate, activityLevel, weeklyFrequency } = req.body;
    if (!goalType) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '请选择健身目标' },
      });
    }

    // 删除旧目标，创建新目标
    db.removeMany('fitness_goals', { userId: req.user.userId });
    const goal = db.insert('fitness_goals', {
      userId: req.user.userId,
      goalType,
      targetWeight: targetWeight ? Number(targetWeight) : null,
      targetDate: targetDate || null,
      activityLevel: activityLevel || 'moderate',
      weeklyFrequency: weeklyFrequency || 3,
    });

    res.json({ data: goal, message: '健身目标已更新' });
  } catch (e) {
    console.error('[users] goal error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/users/me/goal — 获取健身目标
 */
router.get('/me/goal', (req, res) => {
  try {
    const goal = db.find('fitness_goals', { userId: req.user.userId })[0] || null;
    res.json({ data: goal });
  } catch (e) {
    console.error('[users] goal get error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * PUT /api/v1/users/me/preferences — 偏好设置
 */
router.put('/me/preferences', (req, res) => {
  try {
    db.removeMany('preferences', { userId: req.user.userId });
    const pref = db.insert('preferences', {
      userId: req.user.userId,
      dietType: req.body.dietType || 'balanced',
      allergies: req.body.allergies || [],
      cuisinePreferences: req.body.cuisinePreferences || [],
      maxCookTime: req.body.maxCookTime || 30,
      workoutLocation: req.body.workoutLocation || 'home',
      hasEquipment: req.body.hasEquipment || false,
    });
    res.json({ data: pref, message: '偏好设置已更新' });
  } catch (e) {
    console.error('[users] preferences error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/users/me/preferences — 获取偏好设置
 */
router.get('/me/preferences', (req, res) => {
  try {
    const pref = db.find('preferences', { userId: req.user.userId })[0] || null;
    res.json({ data: pref });
  } catch (e) {
    console.error('[users] preferences get error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

module.exports = router;