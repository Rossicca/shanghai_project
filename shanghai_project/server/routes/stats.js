/**
 * 统计路由 — 数据看板 / 体重趋势
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/v1/stats/dashboard — 用户数据看板
 */
router.get('/dashboard', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';

    // 身体数据
    const bodyRecords = db.find('body_data', { userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const currentBody = bodyRecords[0] || null;
    const previousBody = bodyRecords[1] || null;

    // 健身目标
    const goal = db.find('fitness_goals', { userId })[0] || null;

    // 菜谱统计
    const recipes = db.find('recipes', { userId });
    const savedRecipes = db.find('saved_recipes', { userId });

    // 视频统计
    const savedWorkouts = db.find('saved_workouts', { userId });
    const watchedWorkouts = db.find('workout_history', { userId });
    // 每日打卡：与真实训练完成一起计入「训练次数」
    const checkins = db.find('daily_checkins', { userId });

    // 本周活动（模拟最近7天）
    const today = new Date();
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayWorkouts = watchedWorkouts.filter((workout) => workout.createdAt?.startsWith(dateStr));
      weeklyActivity.push({
        date: dateStr,
        workout: dayWorkouts.length > 0,
        recipe: recipes.some((r) => r.createdAt?.startsWith(dateStr)),
        caloriesBurned: dayWorkouts.reduce((sum, workout) => sum + Number(workout.calories || 200), 0),
      });
    }

    // 体重变化
    const weightChange = currentBody && previousBody
      ? Math.round((currentBody.weight - previousBody.weight) * 10) / 10
      : 0;

    // 目标进度
    const startWeight = bodyRecords[bodyRecords.length - 1]?.weight || currentBody?.weight || 0;
    const weightProgress = goal?.targetWeight && currentBody
      ? Math.round(((startWeight - currentBody.weight) / (startWeight - goal.targetWeight)) * 100)
      : 0;

    res.json({
      data: {
        streakDays: Math.min(watchedWorkouts.length + checkins.length, 30),
        totalWorkouts: watchedWorkouts.length + checkins.length,
        totalCaloriesBurned: watchedWorkouts.reduce(
          (sum, workout) => sum + Number(workout.calories || 0),
          0
        ),
        totalRecipes: recipes.length,
        totalWatchTimeMinutes: watchedWorkouts.length * 15,
        currentWeight: currentBody?.weight || null,
        weightChange,
        startWeight,
        goalWeight: goal?.targetWeight || null,
        weightProgressPercentage: Math.max(0, Math.min(100, weightProgress)),
        thisWeek: {
          workoutDays: weeklyActivity.filter((a) => a.workout).length,
          recipesGenerated: recipes.filter((r) => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return new Date(r.createdAt) > d;
          }).length,
          caloriesBurned: weeklyActivity.reduce((sum, a) => sum + a.caloriesBurned, 0),
          caloriesFromRecipe: recipes
            .filter((r) => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              return new Date(r.createdAt) > d;
            })
            .reduce((sum, r) => sum + (r.calories || 0), 0),
        },
        weeklyActivity,
        totalSavedRecipes: savedRecipes.length,
        totalSavedWorkouts: savedWorkouts.length,
      },
    });
  } catch (e) {
    console.error('[stats] dashboard error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/stats/weight-trend — 体重趋势
 */
router.get('/weight-trend', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const records = db.find('body_data', { userId }).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.json({
      data: records.map((r) => ({
        date: r.measuredAt || r.createdAt?.slice(0, 10),
        weight: r.weight,
        bodyFat: r.bodyFat,
      })),
    });
  } catch (e) {
    console.error('[stats] weight-trend error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/stats/daily — 每日统计
 */
router.get('/daily', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const recipes = db.find('recipes', { userId }).filter(
      (r) => r.createdAt?.startsWith(targetDate)
    );
    const workouts = db.find('workout_history', { userId }).filter(
      (w) => w.createdAt?.startsWith(targetDate)
    );

    res.json({
      data: {
        date: targetDate,
        recipesCount: recipes.length,
        recipesCalories: recipes.reduce((sum, r) => sum + (r.calories || 0), 0),
        workoutsCount: workouts.length,
        workoutDuration: workouts.length * 15,
        caloriesBurned: workouts.length * 200,
      },
    });
  } catch (e) {
    console.error('[stats] daily error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

module.exports = router;
