/**
 * 菜谱路由 — AI 生成 / 收藏 / 历史
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateRecipe } = require('../ai');
const { pickMockRecipe } = require('../demo-data');

// 每个用户每分钟最多生成 3 次
const generationLimit = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const window = 60 * 1000;
  const record = generationLimit.get(userId) || [];
  const recent = record.filter((t) => now - t < window);
  if (recent.length >= 3) return false;
  recent.push(now);
  generationLimit.set(userId, recent);
  return true;
}

/**
 * POST /api/v1/recipes/generate — AI 生成菜谱
 */
router.post('/generate', async (req, res) => {
  try {
    const { sessionId, ingredients, mealType, servings, maxCookTime, difficulty, includeNutritionTarget } = req.body;
    const userId = req.user?.userId || 'anonymous';

    // 限流检查
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: {
          code: 'RECIPE_LIMIT_EXCEEDED',
          message: '每分钟最多生成 3 次，请稍后再试',
          detail: { retryAfterSeconds: 35 },
        },
      });
    }

    // 获取用户身体数据和目标（用于热量计算）
    const bodyData = db.find('body_data', { userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0] || null;
    const goal = db.find('fitness_goals', { userId })[0] || null;

    // 计算目标热量
    const targetCalories = calculateTargetCalories(bodyData, goal);

    // 调用 AI 生成菜谱
    const recipe = await generateRecipe({
      ingredients: ingredients || [],
      people: servings || 1,
      cookTime: maxCookTime || 20,
      difficulty: difficulty || '简单',
      user: {
        caloriesTarget: targetCalories,
        goal: goal?.goalType || '保持健康',
        bodyData,
      },
    });

    const recipeRecord = db.insert('recipes', {
      userId,
      name: recipe.name,
      description: recipe.description || '',
      coverEmoji: recipe.coverEmoji || '🍽️',
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0,
      fiber: recipe.fiber || 0,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      cookTime: recipe.cookTime || maxCookTime || 20,
      difficulty: recipe.difficulty || difficulty || '简单',
      tips: recipe.tips || [],
      mealType: mealType || 'lunch',
      servings: servings || 1,
      isSaved: false,
    });

    // 热量对比
    const nutritionTarget = {
      targetCalories,
      calorieDiff: recipeRecord.calories - targetCalories,
      caloriePercentage: targetCalories > 0 ? Math.round((recipeRecord.calories / targetCalories) * 100) : 100,
      isAcceptable: targetCalories > 0
        ? Math.abs(recipeRecord.calories - targetCalories) <= targetCalories * 0.15
        : true,
    };

    res.json({
      data: {
        recipeId: recipeRecord.id,
        name: recipeRecord.name,
        description: recipeRecord.description,
        coverEmoji: recipeRecord.coverEmoji,
        prepTime: recipeRecord.prepTime || 5,
        cookTime: recipeRecord.cookTime,
        difficulty: recipeRecord.difficulty,
        mealType: recipeRecord.mealType,
        servings: recipeRecord.servings,
        ingredients: recipeRecord.ingredients,
        nutrition: {
          calories: recipeRecord.calories,
          protein: recipeRecord.protein,
          fat: recipeRecord.fat,
          carbs: recipeRecord.carbs,
          fiber: recipeRecord.fiber,
        },
        nutritionTarget,
        steps: recipeRecord.steps,
        tips: recipeRecord.tips,
        isSaved: false,
        createdAt: recipeRecord.createdAt,
      },
      message: '菜谱生成成功',
    });
  } catch (e) {
    console.error('[recipes] generate error:', e);
    res.status(500).json({
      error: { code: 'RECIPE_GENERATION_FAILED', message: '菜谱生成失败，请重试' },
    });
  }
});

/**
 * POST /api/v1/recipes/:id/reimagine — 换做法
 */
router.post('/:id/reimagine', async (req, res) => {
  try {
    const { style, maxCookTime } = req.body;
    const original = db.findById('recipes', req.params.id);
    if (!original) {
      return res.status(404).json({
        error: { code: 'RECIPE_NOT_FOUND', message: '菜谱不存在' },
      });
    }

    // 用原来的食材生成新菜谱
    const recipe = await generateRecipe({
      ingredients: (original.ingredients || []).map((i) =>
        typeof i === 'string' ? { name: i, amount: '适量' } : i
      ),
      people: original.servings || 1,
      cookTime: maxCookTime || original.cookTime || 20,
      difficulty: original.difficulty || '简单',
      style: style || 'stir_fry',
      user: {
        caloriesTarget: original.calories,
        goal: '保持健康',
      },
    });

    const recipeRecord = db.insert('recipes', {
      userId: req.user?.userId || original.userId,
      name: recipe.name,
      description: recipe.description || '',
      coverEmoji: recipe.coverEmoji || '🍽️',
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      cookTime: recipe.cookTime || 20,
      difficulty: recipe.difficulty || '简单',
      tips: recipe.tips || [],
      mealType: 'lunch',
      servings: original.servings || 1,
      isSaved: false,
      reimaginedFrom: req.params.id,
    });

    res.json({
      data: { ...recipeRecord, recipeId: recipeRecord.id },
      message: '新做法已生成',
    });
  } catch (e) {
    console.error('[recipes] reimagine error:', e);
    res.status(500).json({
      error: { code: 'RECIPE_GENERATION_FAILED', message: '换做法失败，请重试' },
    });
  }
});

/**
 * GET /api/v1/recipes/:id — 获取菜谱详情
 */
router.get('/:id', (req, res) => {
  try {
    const recipe = db.findById('recipes', req.params.id);
    if (!recipe) {
      return res.status(404).json({
        error: { code: 'RECIPE_NOT_FOUND', message: '菜谱不存在' },
      });
    }
    res.json({ data: { ...recipe, recipeId: recipe.id } });
  } catch (e) {
    console.error('[recipes] get error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * POST /api/v1/recipes/:id/save — 收藏菜谱
 */
router.post('/:id/save', (req, res) => {
  try {
    const recipe = db.findById('recipes', req.params.id);
    if (!recipe) {
      return res.status(404).json({
        error: { code: 'RECIPE_NOT_FOUND', message: '菜谱不存在' },
      });
    }
    db.update('recipes', req.params.id, { isSaved: true });
    // 记录到收藏表
    const userId = req.user?.userId || 'anonymous';
    const existing = db.find('saved_recipes', { userId, recipeId: req.params.id });
    if (existing.length === 0) {
      db.insert('saved_recipes', { userId, recipeId: req.params.id });
    }
    res.json({ data: { recipeId: req.params.id }, message: '已收藏' });
  } catch (e) {
    console.error('[recipes] save error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * DELETE /api/v1/recipes/:id/save — 取消收藏
 */
router.delete('/:id/save', (req, res) => {
  try {
    db.update('recipes', req.params.id, { isSaved: false });
    db.removeMany('saved_recipes', {
      userId: req.user?.userId || 'anonymous',
      recipeId: req.params.id,
    });
    res.json({ data: { recipeId: req.params.id }, message: '已取消收藏' });
  } catch (e) {
    console.error('[recipes] unsave error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/recipes/saved — 我的收藏
 */
router.get('/saved/list', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const saved = db.find('saved_recipes', { userId });
    const recipes = saved
      .map((s) => db.findById('recipes', s.recipeId))
      .filter(Boolean)
      .map((r) => ({ ...r, recipeId: r.id }));
    res.json({ data: recipes });
  } catch (e) {
    console.error('[recipes] saved list error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/recipes/history — 菜谱历史
 */
router.get('/history/list', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const recipes = db.find('recipes', { userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({
      data: recipes.slice(0, 50).map((r) => ({ ...r, recipeId: r.id })),
    });
  } catch (e) {
    console.error('[recipes] history error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

// ---- 辅助函数 ----

function calculateTargetCalories(bodyData, goal) {
  if (!bodyData || !goal) return 500;
  const { height, weight, age = 25 } = bodyData;
  const gender = bodyData.gender || '男';
  let bmr;
  if (gender === '男' || gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityMap = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
  };
  const tdee = bmr * (activityMap[goal.activityLevel] || 1.55);

  switch (goal.goalType) {
    case 'lose_fat':
    case '减脂':
      return Math.round(tdee - 500);
    case 'gain_muscle':
    case '增肌':
      return Math.round(tdee + 300);
    case 'shape':
    case '塑形':
      return Math.round(tdee);
    default:
      return Math.round(tdee);
  }
}

module.exports = router;
