/**
 * 菜谱路由 — AI 生成 / 收藏 / 历史
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateRecipe } = require('../ai');
const { sanitizeSelectedDish } = require('../recipe-discovery');
const { pickMockRecipe } = require('../demo-data');

// 每个用户每分钟最多生成 3 次
const generationLimit = new Map();

function findOwnedRecipe(req, recipeId) {
  const recipe = db.findById('recipes', recipeId);
  if (!recipe || recipe.userId !== req.user.userId) return null;
  return recipe;
}

function normalizeRecipeSnapshot(value, recipeId, userId) {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim().slice(0, 100);
  const ingredients = (Array.isArray(value.ingredients) ? value.ingredients : [])
    .map((item) => ({
      name: String(item?.name || '').trim().slice(0, 80),
      amount: String(item?.amount || '适量').trim().slice(0, 40),
    }))
    .filter((item) => item.name)
    .slice(0, 40);
  const steps = (Array.isArray(value.steps) ? value.steps : [])
    .map((step) => String(step || '').trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 30);
  if (!name || ingredients.length === 0 || steps.length === 0) return null;

  const video = value.sourceVideo;
  const sourceUrl = String(video?.sourceUrl || '').trim();
  const safeSourceVideo = video &&
    ['bilibili', 'douyin'].includes(video.platform) &&
    /^https:\/\//i.test(sourceUrl)
    ? {
        id: String(video.id || '').slice(0, 120),
        title: String(video.title || '').slice(0, 160),
        author: String(video.author || '').slice(0, 100),
        duration: Math.max(0, Number(video.duration) || 0),
        coverUrl: video.coverUrl ? String(video.coverUrl).slice(0, 1000) : null,
        sourceUrl: sourceUrl.slice(0, 1000),
        description: video.description ? String(video.description).slice(0, 300) : '',
        platform: video.platform,
      }
    : null;

  return {
    id: String(recipeId).slice(0, 120),
    userId,
    name,
    description: String(value.description || '').trim().slice(0, 600),
    coverEmoji: String(value.coverEmoji || '🍽️').slice(0, 8),
    sourceVideo: safeSourceVideo,
    generationMode: ['ai', 'safe_fallback', 'demo'].includes(value.generationMode)
      ? value.generationMode
      : 'ai',
    generationWarning: value.generationWarning ? String(value.generationWarning).slice(0, 300) : null,
    calories: Math.max(0, Number(value.calories) || 0),
    protein: Math.max(0, Number(value.protein) || 0),
    carbs: Math.max(0, Number(value.carbs) || 0),
    fat: Math.max(0, Number(value.fat) || 0),
    fiber: Math.max(0, Number(value.fiber) || 0),
    ingredients,
    steps,
    cookTime: Math.max(1, Math.min(360, Number(value.cookTime) || 20)),
    difficulty: String(value.difficulty || '简单').slice(0, 20),
    tips: (Array.isArray(value.tips) ? value.tips : [])
      .map((tip) => String(tip || '').trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 12),
    mealType: String(value.mealType || 'lunch').slice(0, 20),
    servings: Math.max(1, Math.min(20, Number(value.servings) || 1)),
    isSaved: false,
  };
}

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
    const { sessionId, ingredients, mealType, servings, maxCookTime, difficulty, includeNutritionTarget, selectedDish, conditions } = req.body;
    const userId = req.user?.userId || 'anonymous';

    let sourceIngredients = Array.isArray(ingredients) ? ingredients : [];
    if (sessionId) {
      const session = db.findById('recognition_sessions', sessionId);
      if (!session) {
        return res.status(404).json({
          error: { code: 'RECOGNITION_SESSION_NOT_FOUND', message: '\u98df\u6750\u786e\u8ba4\u8bb0\u5f55\u4e0d\u5b58\u5728\uff0c\u8bf7\u91cd\u65b0\u786e\u8ba4\u98df\u6750' },
        });
      }
      if (session.userId !== userId) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: '\u65e0\u6743\u4f7f\u7528\u8be5\u98df\u6750\u8bb0\u5f55' },
        });
      }
      if (sourceIngredients.length === 0) sourceIngredients = session.ingredients || [];
    }
    if (sourceIngredients.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '\u8bf7\u5148\u786e\u8ba4\u81f3\u5c11\u4e00\u79cd\u98df\u6750' },
      });
    }
    const preferences = db.find('preferences', { userId })[0] || {};
    const allergies = Array.isArray(preferences.allergies) ? preferences.allergies : [];
    const conflictingAllergen = allergies.find((allergen) =>
      sourceIngredients.some((item) => String(item.name || '').includes(allergen))
    );
    if (conflictingAllergen) {
      return res.status(422).json({
        error: {
          code: 'ALLERGEN_CONFLICT',
          message: `\u5f53\u524d\u98df\u6750\u5305\u542b\u5df2\u8bbe\u7f6e\u7684\u8fc7\u654f\u6e90\u201c${conflictingAllergen}\u201d\uff0c\u8bf7\u79fb\u9664\u540e\u518d\u751f\u6210`,
        },
      });
    }

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
      ingredients: sourceIngredients.map((item) => ({
        name: String(item.name || '').trim(),
        amount: typeof item.amount === 'number'
          ? `${item.amount}${item.unit || 'g'}`
          : String(item.amount || item.estimatedAmount || '\u9002\u91cf'),
      })).filter((item) => item.name),
      people: servings || 1,
      cookTime: maxCookTime || 20,
      difficulty: difficulty || '简单',
      selectedDish: sanitizeSelectedDish(selectedDish),
      conditions,
      user: {
        caloriesTarget: targetCalories,
        goal: goal?.goalType || '保持健康',
        bodyData,
        allergies,
        dietType: preferences.dietType || 'balanced',
      },
    });

    const recipeRecord = db.insert('recipes', {
      userId,
      name: recipe.name,
      description: recipe.description || '',
      coverEmoji: recipe.coverEmoji || '🍽️',
      sourceVideo: recipe.sourceVideo || null,
      generationMode: recipe.generationMode || 'ai',
      generationWarning: recipe.generationWarning || null,
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
        sourceVideo: recipeRecord.sourceVideo || null,
        generationMode: recipeRecord.generationMode,
        generationWarning: recipeRecord.generationWarning,
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
        nutritionTarget: includeNutritionTarget === false ? null : nutritionTarget,
        steps: recipeRecord.steps,
        tips: recipeRecord.tips,
        isSaved: false,
        createdAt: recipeRecord.createdAt,
      },
      message: '菜谱生成成功',
    });
  } catch (e) {
    console.error('[recipes] generate error:', e);
    res.status(502).json({
      error: { code: 'RECIPE_GENERATION_FAILED', message: '菜谱生成失败，请重试' },
    });
  }
});

/**
 * POST /api/v1/recipes/:id/reimagine — 换做法
 */
router.post('/:id/reimagine', async (req, res) => {
  try {
    const { style, maxCookTime, conditions } = req.body;
    const original = findOwnedRecipe(req, req.params.id);
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
      conditions,
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
      sourceVideo: recipe.sourceVideo || original.sourceVideo || null,
      generationMode: recipe.generationMode || 'ai',
      generationWarning: recipe.generationWarning || null,
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
    res.status(502).json({
      error: { code: 'RECIPE_GENERATION_FAILED', message: '换做法失败，请重试' },
    });
  }
});

/**
 * GET /api/v1/recipes/:id — 获取菜谱详情
 */
router.get('/:id', (req, res) => {
  try {
    const recipe = findOwnedRecipe(req, req.params.id);
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
    const userId = req.user.userId;
    let recipe = findOwnedRecipe(req, req.params.id);
    const occupiedRecipe = db.findById('recipes', req.params.id);

    // 兼容旧版生成接口留下的前端临时菜谱：收藏时携带完整快照，校验后补写到当前账号。
    // 若同 ID 已属于其他账号，仍按不存在处理，避免越权覆盖。
    if (!recipe && !occupiedRecipe && req.body?.recipe) {
      const snapshot = normalizeRecipeSnapshot(req.body.recipe, req.params.id, userId);
      if (!snapshot) {
        return res.status(422).json({
          error: { code: 'INVALID_RECIPE_SNAPSHOT', message: '菜谱信息不完整，无法收藏，请重新生成' },
        });
      }
      recipe = db.insert('recipes', snapshot);
    }
    if (!recipe) {
      return res.status(404).json({
        error: { code: 'RECIPE_NOT_FOUND', message: '菜谱不存在' },
      });
    }
    db.update('recipes', req.params.id, { isSaved: true });
    // 记录到收藏表
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
    const recipe = findOwnedRecipe(req, req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: { code: 'RECIPE_NOT_FOUND', message: '菜谱不存在' } });
    }
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
      .filter((recipe) => recipe && recipe.userId === userId)
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

  let dailyTarget;
  switch (goal.goalType) {
    case 'lose_fat':
    case '减脂':
      dailyTarget = tdee - 500;
      break;
    case 'gain_muscle':
    case '增肌':
      dailyTarget = tdee + 300;
      break;
    case 'shape':
    case '塑形':
      dailyTarget = tdee;
      break;
    default:
      dailyTarget = tdee;
  }
  // 菜谱营养口径为每份/每餐，不能直接与全日 TDEE 比较。
  return Math.min(900, Math.max(300, Math.round(dailyTarget / 3)));
}

module.exports = router;
