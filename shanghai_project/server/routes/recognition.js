/**
 * 识别路由 — 图片上传识别食材
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const { recognizeFood, normalizeVisionImage } = require('../ai');
const { isVisionReady } = require('../config');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    callback(allowed.has(file.mimetype) ? null : new Error('INVALID_IMAGE_TYPE'), allowed.has(file.mimetype));
  },
});

function parseImageUpload(req, res, next) {
  imageUpload.single('image')(req, res, (error) => {
    if (!error) return next();

    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      error: {
        code: tooLarge ? 'IMAGE_TOO_LARGE' : 'INVALID_IMAGE_TYPE',
        message: tooLarge ? '图片不能超过 10MB' : '仅支持 jpg、png、webp 图片',
      },
    });
  });
}

/**
 * POST /api/v1/recognition/upload — 上传图片并识别食材
 * Body: { image: base64字符串, mealType?: string }
 * 或 multipart/form-data: image 文件
 */
router.post('/upload', parseImageUpload, async (req, res) => {
  try {
    // 网页相机传来的是完整 data URL，先剥前缀再按纯 base64 计算体积
    const imageBase64 = normalizeVisionImage(req.body.image) || req.file?.buffer.toString('base64') || '';

    if (!imageBase64) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '请上传图片' },
      });
    }

    if (!req.file && Buffer.byteLength(imageBase64, 'base64') > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: { code: 'IMAGE_TOO_LARGE', message: '图片不能超过 10MB' },
      });
    }

    if (process.env.AI_FORCE_DEMO !== 'true' && !isVisionReady()) {
      return res.status(503).json({
        error: {
          code: 'AI_VISION_NOT_READY',
          message: '图片识别服务尚未配置完成，请联系管理员检查视觉模型',
        },
      });
    }

    // 真实 AI 识别
    const ingredients = await recognizeFood(imageBase64);

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(422).json({
        error: {
          code: 'NO_INGREDIENTS_FOUND',
          message: '\u672a\u8bc6\u522b\u5230\u6709\u6548\u98df\u6750\uff0c\u53ef\u4ee5\u91cd\u62cd\u6216\u624b\u52a8\u6dfb\u52a0',
        },
      });
    }

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
    const timedOut = /timeout/i.test(String(e?.message || ''));
    res.status(502).json({
      error: {
        code: timedOut ? 'AI_RECOGNITION_TIMEOUT' : 'AI_RECOGNITION_FAILED',
        message: timedOut ? '图片识别等待超时，请检查网络后重试' : '图片识别服务调用失败，请稍后重试',
      },
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
