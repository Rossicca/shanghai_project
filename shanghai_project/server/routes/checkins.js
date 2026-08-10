/**
 * 每日训练打卡路由 — 按用户 + 日期一天一次，打卡数并入个人主页「训练次数」
 *
 * 说明：打卡与具体视频无关（区别于 /workouts/:id/complete 的 workout_history），
 * 独立记录在 daily_checkins 表；个人主页 totalWorkouts = workout_history 数 + 打卡数。
 * 挂载时带 authMiddleware，所有接口需登录。
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/** 今天（UTC YYYY-MM-DD，与全项目 toISOString 惯例一致） */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** 连续打卡天数：从今天（今天未打卡则从昨天）起向前数连续的日期 */
function computeStreak(checkins) {
  const days = new Set(checkins.map((c) => c.date));
  const cursor = new Date();
  if (!days.has(todayStr())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 训练总次数（打卡 + 真实训练完成），与 stats.js dashboard 口径一致 */
function totalWorkoutsFor(userId) {
  const watched = db.find('workout_history', { userId });
  const checkins = db.find('daily_checkins', { userId });
  return watched.length + checkins.length;
}

/**
 * GET /api/v1/checkins — 今日打卡状态 + 连续打卡 + 总训练次数
 */
router.get('/', (req, res) => {
  try {
    const userId = req.user.userId;
    const checkins = db.find('daily_checkins', { userId });
    res.json({
      data: {
        checkedInToday: checkins.some((c) => c.date === todayStr()),
        streak: computeStreak(checkins),
        totalWorkouts: totalWorkoutsFor(userId),
      },
    });
  } catch (e) {
    console.error('[checkins] status error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '打卡状态读取失败' } });
  }
});

/**
 * POST /api/v1/checkins — 每日打卡（一天一次，重复打卡返回 409）
 */
router.post('/', (req, res) => {
  try {
    const userId = req.user.userId;
    const today = todayStr();
    if (db.find('daily_checkins', { userId, date: today }).length > 0) {
      return res.status(409).json({ error: { code: 'ALREADY_CHECKED_IN', message: '今天已经打过卡啦' } });
    }
    db.insert('daily_checkins', { userId, date: today });
    const checkins = db.find('daily_checkins', { userId });
    res.status(201).json({
      data: {
        checkedInToday: true,
        streak: computeStreak(checkins),
        totalWorkouts: totalWorkoutsFor(userId),
      },
      message: '打卡成功',
    });
  } catch (e) {
    console.error('[checkins] checkin error:', e);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '打卡失败，请稍后重试' } });
  }
});

module.exports = router;
