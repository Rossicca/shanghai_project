/**
 * 识别路由 — 图片上传识别食材
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { recognizeFood } = require('../ai');
const { DEMO_INGREDIENTS } = require('../demo-data');

/**
 * POST /api/v1/recognition/upload — 上传图片并识别食材
 * Body: { image: base64字符串, mealType?: string }
 * 或 multipart/form-data: image 文件
 */
router.post('/upload', async (req, res) => {
  try {
    const imageBase64 = req.body.image || '';

    if (!imageBase64 && !req.file) {
      // 演示模式：直接返回演示数据
      const demoResult = DEMO_INGREDIENTS.map((i) => ({
        id: db.generateId(),
        name: i.name,
        category: mapCategory(i.name),
        confidence: i.confidence,
        estimatedAmount: parseInt(i.amount) || 100,
        unit: i.amount.includes('g') ? 'g' : '个',
        nutritionPer100g: getNutrition(i.name),
      }));

      const totalNutrition = demoResult.reduce(
        (acc, ing) => {
          const ratio = ing.estimatedAmount / 100;
          acc.calories += (ing.nutritionPer100g?.calories || 0) * ratio;
          acc.protein += (ing.nutritionPer100g?.protein || 0) * ratio;
          acc.fat += (ing.nutritionPer100g?.fat || 0) * ratio;
          acc.carbs += (ing.nutritionPer100g?.carbs || 0) * ratio;
          return acc;
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );

      return res.json({
        data: {
          imageId: 'demo_' + db.generateId(),
          imageUrl: null,
          ingredients: demoResult,
          totalNutrition: {
            calories: Math.round(totalNutrition.calories),
            protein: Math.round(totalNutrition.protein * 10) / 10,
            fat: Math.round(totalNutrition.fat * 10) / 10,
            carbs: Math.round(totalNutrition.carbs * 10) / 10,
          },
        },
        message: '识别成功（演示数据）',
      });
    }

    // 真实 AI 识别
    const ingredients = await recognizeFood(imageBase64);

    const result = ingredients.map((i) => ({
      id: db.generateId(),
      name: i.name,
      category: mapCategory(i.name),
      confidence: i.confidence || 0.9,
      estimatedAmount: parseInt(i.amount) || 100,
      unit: 'g',
      nutritionPer100g: getNutrition(i.name),
    }));

    const totalNutrition = result.reduce(
      (acc, ing) => {
        const ratio = ing.estimatedAmount / 100;
        acc.calories += (ing.nutritionPer100g?.calories || 0) * ratio;
        acc.protein += (ing.nutritionPer100g?.protein || 0) * ratio;
        acc.fat += (ing.nutritionPer100g?.fat || 0) * ratio;
        acc.carbs += (ing.nutritionPer100g?.carbs || 0) * ratio;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    // 保存识别记录
    const sessionId = db.generateId();
    db.insert('recognition_sessions', {
      id: sessionId,
      userId: req.user?.userId || 'anonymous',
      ingredients: result,
      totalNutrition,
    });

    res.json({
      data: {
        imageId: sessionId,
        imageUrl: null,
        ingredients: result,
        totalNutrition: {
          calories: Math.round(totalNutrition.calories),
          protein: Math.round(totalNutrition.protein * 10) / 10,
          fat: Math.round(totalNutrition.fat * 10) / 10,
          carbs: Math.round(totalNutrition.carbs * 10) / 10,
        },
      },
      message: '识别成功',
    });
  } catch (e) {
    console.error('[recognition] upload error:', e);
    res.status(500).json({
      error: { code: 'RECOGNITION_FAILED', message: '图片识别失败，请重试' },
    });
  }
});

/**
 * POST /api/v1/recognition/confirm — 确认/修正食材
 */
router.post('/confirm', (req, res) => {
  try {
    const { imageId, ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '请提供食材列表' },
      });
    }

    const sessionId = db.generateId();
    const enriched = ingredients.map((ing) => ({
      ...ing,
      nutritionPer100g: getNutrition(ing.name),
    }));

    const totalNutrition = enriched.reduce(
      (acc, ing) => {
        const ratio = (ing.amount || 100) / 100;
        acc.calories += (ing.nutritionPer100g?.calories || 0) * ratio;
        acc.protein += (ing.nutritionPer100g?.protein || 0) * ratio;
        acc.fat += (ing.nutritionPer100g?.fat || 0) * ratio;
        acc.carbs += (ing.nutritionPer100g?.carbs || 0) * ratio;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    db.insert('recognition_sessions', {
      id: sessionId,
      userId: req.user?.userId || 'anonymous',
      ingredients: enriched,
      totalNutrition,
      confirmed: true,
    });

    res.json({
      data: {
        sessionId,
        ingredients: enriched,
        totalNutrition: {
          calories: Math.round(totalNutrition.calories),
          protein: Math.round(totalNutrition.protein * 10) / 10,
          fat: Math.round(totalNutrition.fat * 10) / 10,
          carbs: Math.round(totalNutrition.carbs * 10) / 10,
        },
      },
      message: '食材确认成功，可以开始生成菜谱',
    });
  } catch (e) {
    console.error('[recognition] confirm error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * GET /api/v1/recognition/history — 识别历史
 */
router.get('/history', (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const records = db.find('recognition_sessions', { userId }).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({
      data: records.slice(0, 20).map((r) => ({
        id: r.id,
        ingredients: r.ingredients,
        totalNutrition: r.totalNutrition,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    console.error('[recognition] history error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

// ---- 辅助函数 ----

function mapCategory(name) {
  const meat = ['鸡胸肉', '鸡腿', '鸡肉', '牛肉', '猪肉', '羊肉', '鸭肉', '虾', '鱼', '海鲜'];
  const veg = ['西兰花', '菠菜', '青菜', '白菜', '生菜', '番茄', '黄瓜', '胡萝卜', '彩椒', '洋葱', '土豆', '豆腐'];
  const fruit = ['苹果', '香蕉', '橙子', '蓝莓', '草莓', '牛油果'];
  const grain = ['糙米', '米饭', '面条', '面包', '燕麦', '藜麦', '玉米'];
  const dairy = ['鸡蛋', '牛奶', '酸奶', '奶酪'];

  if (meat.some((k) => name.includes(k))) return 'meat';
  if (veg.some((k) => name.includes(k))) return 'vegetable';
  if (fruit.some((k) => name.includes(k))) return 'fruit';
  if (grain.some((k) => name.includes(k))) return 'grain';
  if (dairy.some((k) => name.includes(k))) return 'dairy';
  return 'other';
}

function getNutrition(name) {
  const db = {
    '鸡胸肉': { calories: 167, protein: 31.0, fat: 3.6, carbs: 0.0 },
    '鸡腿': { calories: 181, protein: 20.0, fat: 11.0, carbs: 0.0 },
    '牛肉': { calories: 250, protein: 26.0, fat: 15.0, carbs: 0.0 },
    '猪肉': { calories: 242, protein: 16.0, fat: 19.0, carbs: 0.0 },
    '虾': { calories: 93, protein: 18.6, fat: 0.8, carbs: 0.0 },
    '鱼': { calories: 113, protein: 20.0, fat: 3.0, carbs: 0.0 },
    '鸡蛋': { calories: 144, protein: 13.3, fat: 8.8, carbs: 1.5 },
    '豆腐': { calories: 81, protein: 8.1, fat: 3.7, carbs: 4.2 },
    '西兰花': { calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6 },
    '菠菜': { calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6 },
    '番茄': { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
    '黄瓜': { calories: 15, protein: 0.7, fat: 0.1, carbs: 3.6 },
    '胡萝卜': { calories: 41, protein: 0.9, fat: 0.2, carbs: 9.6 },
    '糙米': { calories: 111, protein: 2.6, fat: 0.9, carbs: 23.0 },
    '米饭': { calories: 116, protein: 2.6, fat: 0.3, carbs: 25.9 },
    '燕麦': { calories: 367, protein: 13.5, fat: 6.7, carbs: 66.3 },
    '牛奶': { calories: 66, protein: 3.2, fat: 3.6, carbs: 4.8 },
    '酸奶': { calories: 61, protein: 3.5, fat: 1.5, carbs: 7.0 },
    '牛油果': { calories: 160, protein: 2.0, fat: 14.7, carbs: 8.5 },
    '香蕉': { calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8 },
    '苹果': { calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8 },
    '土豆': { calories: 76, protein: 2.0, fat: 0.1, carbs: 17.5 },
    '红薯': { calories: 86, protein: 1.6, fat: 0.1, carbs: 20.1 },
  };
  const match = Object.keys(db).find((k) => name.includes(k));
  return match ? db[match] : { calories: 100, protein: 5.0, fat: 3.0, carbs: 10.0 };
}

module.exports = router;