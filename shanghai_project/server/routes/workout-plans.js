const express = require('express');
const db = require('../db');
const { generateWorkoutPlan } = require('../ai');
const { mergeCuratedWorkoutVideos } = require('../workout-video-safety');

const router = express.Router();
const ALLOWED_GOALS = new Set(['lose_fat', 'gain_muscle', 'shape', 'maintain']);
const ALLOWED_LOCATIONS = new Set(['home', 'gym', 'outdoor']);
const ALLOWED_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const ALLOWED_TRAINING_MODES = new Set(['gentle', 'balanced', 'progressive']);
const GOAL_LABELS = {
  lose_fat: '减脂',
  gain_muscle: '增肌',
  shape: '塑形',
  maintain: '保持健康',
};
const HIGH_RISK_PATTERN = /\u80f8\u75db|\u5fc3\u810f|\u5fc3\u810f\u75c5|\u5b55\u671f|\u6000\u5b55|\u672f\u540e|\u9aa8\u6298|\u6655\u53a5|chest pain|pregnan|heart disease|recent surgery/i;
const SAFE_VIDEO_HOSTS = new Set([
  'www.bilibili.com', 'bilibili.com', 'search.bilibili.com',
  'www.douyin.com', 'douyin.com',
  'www.youtube.com', 'youtube.com', 'youtu.be',
]);
const PLAN_EVIDENCE = [
  { title: '中国居民膳食指南（2022）八项准则', organization: '中国营养学会', url: 'https://www.chinanutri.cn/xwzx_238/xyxw/202204/t20220427_258627.html', note: '用于食物多样、吃动平衡、规律进餐与合理搭配原则。' },
  { title: '成人体重判定 WS/T 428—2013', organization: '国家卫生健康委员会', url: 'https://www.nhc.gov.cn/wjw/yingyang/201308/a233d450fdbc47c5ad4f08b7e394d1e8.shtml', note: '仅用于成年人 BMI 的一般筛查分层；BMI 不能替代体脂、围度或医学诊断。' },
  { title: 'Physical activity recommendations', organization: '世界卫生组织（WHO）', url: 'https://www.who.int/initiatives/behealthy/physical-activity', note: '用于成人有氧活动与主要肌群力量训练的周频率框架。' },
  { title: 'Resistance Training Guidelines Update', organization: '美国运动医学会（ACSM）', url: 'https://acsm.org/resistance-training-guidelines-update-2026/', note: '用于按目标调整抗阻训练量，并强调可坚持性和个体化。' },
  { title: '抗阻训练处方的系统综述与网络荟萃分析', organization: 'British Journal of Sports Medicine', url: 'https://pubmed.ncbi.nlm.nih.gov/37414459/', note: '用于力量训练频率、负荷和组数的分层安排；训练量按能力递进，不盲目堆叠。' },
  { title: '蛋白质补充与抗阻训练的系统综述及荟萃分析', organization: 'British Journal of Sports Medicine', url: 'https://bjsm.bmj.com/content/52/6/376', note: '用于蛋白质目标范围；不会把补剂作为必需条件，也不会无限提高推荐量。' },
  { title: 'Mifflin–St Jeor 静息能量预测方程', organization: 'American Journal of Clinical Nutrition / PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/', note: '用于估算成年人静息能量需求；结果是起始参考，需要按实际变化复核。' },
];

function numberInRange(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function normalizeRequest(body) {
  const incomingGoals = Array.isArray(body.goalTypes) ? body.goalTypes : [body.goalType];
  let goalTypes = [...new Set(incomingGoals.filter((goal) => ALLOWED_GOALS.has(goal)))].slice(0, 4);
  if (goalTypes.length > 1) goalTypes = goalTypes.filter((goal) => goal !== 'maintain');
  if (goalTypes.length === 0) goalTypes = ['maintain'];
  return {
    goalType: goalTypes[0],
    goalTypes,
    weeklyFrequency: numberInRange(body.weeklyFrequency, 3, 1, 7),
    sessionDurationMinutes: numberInRange(body.sessionDurationMinutes, 30, 10, 90),
    workoutLocation: ALLOWED_LOCATIONS.has(body.workoutLocation) ? body.workoutLocation : 'home',
    hasEquipment: Boolean(body.hasEquipment),
    equipment: Array.isArray(body.equipment)
      ? body.equipment.map((item) => String(item).trim()).filter(Boolean).slice(0, 24)
      : [],
    fitnessLevel: ALLOWED_LEVELS.has(body.fitnessLevel) ? body.fitnessLevel : 'beginner',
    trainingMode: ALLOWED_TRAINING_MODES.has(body.trainingMode) ? body.trainingMode : 'balanced',
    limitations: Array.isArray(body.limitations)
      ? body.limitations.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [],
    preferredTraining: Array.isArray(body.preferredTraining)
      ? body.preferredTraining.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
      : [],
    dietaryPreferences: Array.isArray(body.dietaryPreferences)
      ? body.dietaryPreferences.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
      : [],
    allergies: Array.isArray(body.allergies)
      ? body.allergies.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
      : [],
    mealsPerDay: numberInRange(body.mealsPerDay, 4, 3, 5),
  };
}

function safeVideoUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && SAFE_VIDEO_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function findVideo(exercise, videos) {
  const category = String(exercise.category || '');
  return videos.find((video) => video.category === category) ||
    videos.find((video) => (video.tags || []).some((tag) => exercise.name?.includes(tag))) || null;
}

function buildProfileAnalysis(bodyData, input) {
  const goalNames = input.goalTypes.map((goal) => GOAL_LABELS[goal]).filter(Boolean);
  const hasRecompositionGoals = input.goalTypes.includes('lose_fat') && input.goalTypes.includes('gain_muscle');
  const insights = [];
  let bmi = null;
  let bmiCategory = null;
  if (bodyData?.height && bodyData?.weight) {
    bmi = Math.round((bodyData.weight / ((bodyData.height / 100) ** 2)) * 10) / 10;
    if (Number(bodyData.age) >= 18) {
      bmiCategory = bmi < 18.5 ? '偏低' : bmi < 24 ? '正常范围' : bmi < 28 ? '超重范围' : '肥胖筛查范围';
      insights.push(`BMI ${bmi}（${bmiCategory}），仅作为成年人一般筛查参考，不单独判断健康状态。`);
    } else {
      insights.push(`当前 BMI 为 ${bmi}；未成年人需要结合年龄和生长曲线评估，本计划不做体重诊断。`);
    }
  }
  if (bodyData?.waist && bodyData?.hip) {
    const waistHipRatio = Math.round((bodyData.waist / bodyData.hip) * 100) / 100;
    insights.push(`腰臀比记录为 ${waistHipRatio}，后续更适合观察趋势，而不是用单次测量下结论。`);
  }
  if (bodyData?.bodyFat) {
    insights.push(`已记录体脂 ${bodyData.bodyFat}%，训练复盘会同时参考体重、体脂和围度变化。`);
  }
  if (hasRecompositionGoals) {
    insights.push('同时选择减脂与增肌，采用身体重组思路：温和能量控制、足量蛋白质和持续抗阻训练。');
  } else if (goalNames.length > 1) {
    insights.push(`主要目标为${goalNames[0]}，同时兼顾${goalNames.slice(1).join('、')}，训练量不会为次要目标过度堆叠。`);
  } else {
    insights.push(`本阶段以${goalNames[0] || '保持健康'}为主要方向，后续按执行感受和趋势调整。`);
  }
  insights.push(`每周可训练 ${input.weeklyFrequency} 天、每次约 ${input.sessionDurationMinutes} 分钟，计划按可坚持的节奏安排。`);
  if (input.equipment.length) insights.push(`现有器材：${input.equipment.join('、')}；动作只会使用已选择的器材。`);
  else insights.push('当前按徒手训练设计，不把器械作为完成计划的前提。');
  if (input.preferredTraining.length) insights.push(`偏好的运动方式：${input.preferredTraining.join('、')}，会在安全和目标允许时优先安排。`);
  if (input.limitations.length) insights.push(`需要避开的情况：${input.limitations.join('、')}。`);

  const filledMetrics = bodyData
    ? ['height', 'weight', 'age', 'gender', 'bodyFat', 'chest', 'waist', 'hip', 'upperArm', 'thigh', 'calf']
      .filter((key) => bodyData[key] !== null && bodyData[key] !== undefined && bodyData[key] !== '').length
    : 0;
  return {
    bmi,
    bmiCategory,
    dataCompleteness: Math.round((filledMetrics / 11) * 100),
    goalStrategy: hasRecompositionGoals ? 'body_recomposition' : goalNames.length > 1 ? 'primary_plus_secondary' : 'single_goal',
    goalSummary: goalNames.join(' + '),
    insights,
  };
}

function buildNutritionTargets(bodyData, input) {
  if (!bodyData?.height || !bodyData?.weight || !bodyData?.age) return null;
  if (Number(bodyData.age) < 18) return null;
  const genderOffset = ['female', '女'].includes(bodyData.gender) ? -161 : 5;
  const bmr = 10 * bodyData.weight + 6.25 * bodyData.height - 5 * bodyData.age + genderOffset;
  const activityFactor = input.weeklyFrequency <= 2 ? 1.35 : input.weeklyFrequency <= 4 ? 1.5 : 1.65;
  const tdee = bmr * activityFactor;
  const adjustmentRate = input.trainingMode === 'gentle' ? 0.08 : input.trainingMode === 'progressive' ? 0.15 : 0.12;
  const recomposition = input.goalTypes.includes('lose_fat') && input.goalTypes.includes('gain_muscle');
  const calorieFactor = recomposition
    ? 1
    : input.goalTypes.includes('lose_fat')
    ? 1 - adjustmentRate
    : input.goalTypes.includes('gain_muscle') ? 1 + Math.min(adjustmentRate, 0.1) : 1;
  const safeMinimum = ['female', '女'].includes(bodyData.gender) ? 1200 : 1500;
  const calories = Math.max(safeMinimum, Math.round(tdee * calorieFactor));
  const proteinPerKg = input.goalTypes.some((goal) => ['gain_muscle', 'lose_fat'].includes(goal)) ? 1.6 : input.goalTypes.includes('shape') ? 1.5 : 1.2;
  const protein = Math.round(bodyData.weight * proteinPerKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat, water: Math.round(bodyData.weight * 32) };
}

function normalizeActivities(rawItems, videos, fallback, category) {
  const defaults = category === '拉伸'
    ? [
        { name: '低强度走动与呼吸恢复', durationSeconds: 90, notes: '先让心率逐步回落，避免突然停下', category },
        { name: '下肢肌群静态拉伸', durationSeconds: 90, notes: '左右侧均匀完成，保持自然呼吸，不追求疼痛', category },
        { name: '肩背与躯干舒展', durationSeconds: 60, notes: '动作缓慢，关节不锁死', category },
      ]
    : [
        { name: '低冲击原地踏步', durationSeconds: 90, notes: '逐步提高心率，保持可以正常交流的强度', category },
        { name: '肩髋踝关节动态活动', durationSeconds: 90, notes: '从小幅度开始，逐步扩大活动范围', category },
        { name: '训练动作轻量预演', durationSeconds: 90, notes: '用徒手或轻重量熟悉当天动作路径', category },
      ];
  const incoming = Array.isArray(rawItems) ? rawItems.slice(0, 4) : [];
  const seen = new Set();
  const source = [...incoming, ...defaults]
    .filter((item) => {
      const name = String(item?.name || fallback);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .slice(0, Math.max(3, Math.min(4, incoming.length || 3)));
  return source.map((activity) => {
    const video = findVideo({ ...activity, category: activity.category || category }, videos);
    return {
      name: String(activity.name || fallback).slice(0, 80),
      durationSeconds: numberInRange(activity.durationSeconds, 60, 20, 300),
      notes: String(activity.notes || '保持自然呼吸，不追求疼痛幅度').slice(0, 180),
      videoId: video?.id || null,
      videoUrl: safeVideoUrl(video?.sourceUrl),
    };
  });
}

const DEFAULT_MEALS = [
  { mealType: '早餐', name: '燕麦鸡蛋牛奶杯', reason: '复合碳水与蛋白质搭配，适合晨间补充', ingredients: ['燕麦', '鸡蛋', '牛奶', '香蕉'] },
  { mealType: '早餐', name: '全麦鸡蛋蔬菜卷', reason: '准备简单，兼顾主食、蛋白质和蔬菜', ingredients: ['全麦饼', '鸡蛋', '生菜', '番茄'] },
  { mealType: '早餐', name: '无糖酸奶水果坚果碗', reason: '适合时间紧张的早晨，注意坚果份量', ingredients: ['无糖酸奶', '水果', '坚果', '燕麦'] },
  { mealType: '午餐', name: '鸡胸杂蔬糙米饭', reason: '蛋白质、蔬菜与主食搭配完整', ingredients: ['鸡胸肉', '糙米', '西兰花', '胡萝卜'] },
  { mealType: '午餐', name: '牛肉彩椒藜麦饭', reason: '适合训练日补充蛋白质与碳水', ingredients: ['瘦牛肉', '彩椒', '藜麦', '青菜'] },
  { mealType: '午餐', name: '豆腐菌菇杂粮饭', reason: '植物蛋白与全谷物组合，口味清爽', ingredients: ['豆腐', '菌菇', '杂粮饭', '青菜'] },
  { mealType: '晚餐', name: '番茄豆腐虾仁汤', reason: '清爽易做，适合训练后的晚餐', ingredients: ['番茄', '豆腐', '虾仁', '青菜'] },
  { mealType: '晚餐', name: '清蒸鱼配时蔬和红薯', reason: '优质蛋白与适量主食，饱腹不过量', ingredients: ['鱼', '时蔬', '红薯'] },
  { mealType: '晚餐', name: '鸡蛋豆腐蔬菜煲', reason: '家常食材容易准备，适合休息日', ingredients: ['鸡蛋', '豆腐', '青菜', '菌菇'] },
  { mealType: '加餐', name: '水果与原味坚果', reason: '在正餐间补充，避免无意识高糖零食', ingredients: ['水果', '原味坚果'] },
  { mealType: '加餐', name: '无糖酸奶水果杯', reason: '提供乳制品与水果，份量容易控制', ingredients: ['无糖酸奶', '水果'] },
  { mealType: '加餐', name: '牛奶与全麦面包', reason: '训练前后需要额外能量时使用', ingredients: ['牛奶', '全麦面包'] },
];

function normalizeMealSuggestions(rawMeals, input) {
  const allergies = input.allergies.map((item) => item.toLowerCase());
  const isVegetarian = input.dietaryPreferences.some((item) => /素食/.test(item));
  const all = [...(Array.isArray(rawMeals) ? rawMeals : []), ...DEFAULT_MEALS];
  const seen = new Set();
  return all
    .map((meal) => ({
      mealType: String(meal.mealType || '正餐').slice(0, 12),
      name: String(meal.name || '').slice(0, 50),
      reason: String(meal.reason || '').slice(0, 180),
      ingredients: (Array.isArray(meal.ingredients) ? meal.ingredients : [])
        .map((item) => String(item).trim()).filter(Boolean).slice(0, 12),
    }))
    .filter((meal) => meal.name && meal.ingredients.length)
    .filter((meal) => {
      const text = `${meal.name} ${meal.ingredients.join(' ')}`.toLowerCase();
      if (allergies.some((allergy) => allergy && text.includes(allergy))) return false;
      if (isVegetarian && /鸡|牛|猪|鱼|虾|肉/.test(text)) return false;
      if (seen.has(meal.name)) return false;
      seen.add(meal.name);
      return true;
    })
    .slice(0, 16);
}

function buildDietPlan(mealSuggestions, input) {
  const groups = { 早餐: [], 午餐: [], 晚餐: [], 加餐: [] };
  for (const meal of mealSuggestions) {
    const type = meal.mealType.includes('早') ? '早餐'
      : meal.mealType.includes('午') ? '午餐'
        : meal.mealType.includes('晚') ? '晚餐' : '加餐';
    groups[type].push({ ...meal, mealType: type });
  }
  const trainingSlots = {
    1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6],
    5: [1, 2, 4, 5, 7], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7],
  }[input.weeklyFrequency] || [1, 3, 5];
  const mealTypes = input.mealsPerDay === 3
    ? ['早餐', '午餐', '晚餐']
    : input.mealsPerDay === 5
      ? ['早餐', '加餐', '午餐', '晚餐', '加餐']
      : ['早餐', '午餐', '晚餐', '加餐'];
  return Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const trainingDay = trainingSlots.includes(day);
    const usedByType = {};
    const meals = mealTypes.map((type) => {
      const options = groups[type].length ? groups[type] : mealSuggestions;
      const offset = usedByType[type] || 0;
      usedByType[type] = offset + 1;
      return options[(index + offset) % Math.max(options.length, 1)] || {
        mealType: type,
        name: '按过敏信息自选均衡餐',
        reason: '优先搭配蔬菜、优质蛋白和适量主食',
        ingredients: ['蔬菜', '不过敏的蛋白质食物', '主食'],
      };
    });
    return {
      day,
      trainingDay,
      focus: trainingDay
        ? '训练日：主食和蛋白质围绕训练安排，避免空腹高强度训练'
        : '恢复日：保持规律三餐和蔬菜量，不用极端减少主食',
      meals,
    };
  });
}

function normalizePlan(raw, input, bodyData) {
  const videos = mergeCuratedWorkoutVideos(db.readCollection('workout_videos'));
  const rawDays = Array.isArray(raw.weeklySchedule) ? raw.weeklySchedule : [];
  const days = Array.from({ length: input.weeklyFrequency }, (_, index) => {
    const day = rawDays[index] || rawDays[index % Math.max(rawDays.length, 1)] || {};
    const exercises = (Array.isArray(day.exercises) ? day.exercises : []).slice(0, 8).map((exercise) => {
      const video = findVideo(exercise, videos);
      return {
        name: String(exercise.name || '\u4f4e\u51b2\u51fb\u539f\u5730\u8e0f\u6b65').slice(0, 80),
        sets: numberInRange(exercise.sets, 3, 1, 8),
        reps: String(exercise.reps || '10-12').slice(0, 30),
        restSeconds: numberInRange(exercise.restSeconds, 45, 15, 180),
        notes: String(exercise.notes || '\u4fdd\u6301\u547c\u5438\u5e73\u7a33\uff0c\u4e0d\u9002\u65f6\u7acb\u5373\u505c\u6b62').slice(0, 180),
        videoId: video?.id || null,
        videoUrl: safeVideoUrl(video?.sourceUrl),
      };
    });
    return {
      day: index + 1,
      title: String(day.title || `\u7b2c ${index + 1} \u5929\u8bad\u7ec3`).slice(0, 80),
      durationMinutes: numberInRange(day.durationMinutes, input.sessionDurationMinutes, 10, 90),
      warmup: normalizeActivities(day.warmup, videos, '动态热身与关节活动', '全身燃脂'),
      exercises: exercises.length ? exercises : [{
        name: '\u4f4e\u51b2\u51fb\u539f\u5730\u8e0f\u6b65', sets: 3, reps: '40\u79d2', restSeconds: 40,
        notes: '\u4fdd\u6301\u547c\u5438\u5e73\u7a33\uff0c\u4e0d\u9002\u65f6\u7acb\u5373\u505c\u6b62', videoId: null, videoUrl: null,
      }],
      cooldown: normalizeActivities(day.cooldown, videos, '低强度走动与全身拉伸', '拉伸'),
    };
  });
  const mealSuggestions = normalizeMealSuggestions(raw.mealSuggestions, input);
  return {
    goalType: input.goalType,
    goalTypes: input.goalTypes,
    summary: String(raw.summary || `\u6bcf\u5468 ${input.weeklyFrequency} \u5929\u7684\u5faa\u5e8f\u6e10\u8fdb\u8bad\u7ec3\u8ba1\u5212`).slice(0, 240),
    weeklySchedule: days,
    nutritionSummary: String(raw.nutritionSummary || '保持规律三餐，优先选择优质蛋白、蔬菜和适量主食。').slice(0, 300),
    nutritionTargets: buildNutritionTargets(bodyData, input),
    mealSuggestions,
    dietPlan: buildDietPlan(mealSuggestions, input),
    generationMode: raw.generationMode || 'ai',
    generationWarning: raw.generationWarning || null,
    reminders: (Array.isArray(raw.reminders) ? raw.reminders : [])
      .map((item) => String(item).slice(0, 180)).filter(Boolean).slice(0, 8),
    evidence: PLAN_EVIDENCE,
  };
}

router.post('/generate', async (req, res) => {
  const input = normalizeRequest(req.body || {});
  if (input.limitations.some((item) => HIGH_RISK_PATTERN.test(item))) {
    return res.status(422).json({
      error: {
        code: 'PROFESSIONAL_GUIDANCE_REQUIRED',
        message: '\u5f53\u524d\u8eab\u4f53\u9650\u5236\u9700\u5148\u54a8\u8be2\u533b\u751f\u6216\u4e13\u4e1a\u6559\u7ec3\uff0c\u6682\u4e0d\u751f\u6210\u81ea\u52a8\u8ba1\u5212',
      },
    });
  }

  try {
    const userId = req.user.userId;
    const bodyData = db.find('body_data', { userId })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
    const storedGoal = db.find('fitness_goals', { userId })[0] || null;
    const preferences = db.find('preferences', { userId })[0] || {};
    const effectiveInput = {
      ...input,
      allergies: [...new Set([
        ...input.allergies,
        ...(Array.isArray(preferences.allergies) ? preferences.allergies : []),
      ])].slice(0, 12),
    };
    const personalizationAnalysis = buildProfileAnalysis(bodyData, effectiveInput);
    const generated = await generateWorkoutPlan({
      ...effectiveInput,
      bodyData,
      storedGoal,
      personalizationAnalysis,
    });
    const normalized = normalizePlan(generated, effectiveInput, bodyData);
    const record = db.insert('workout_plans', {
      userId,
      ...normalized,
      profileSnapshot: bodyData ? {
        height: bodyData.height,
        weight: bodyData.weight,
        age: bodyData.age,
        gender: bodyData.gender,
        bodyFat: bodyData.bodyFat ?? null,
        chest: bodyData.chest ?? null,
        waist: bodyData.waist ?? null,
        hip: bodyData.hip ?? null,
        upperArm: bodyData.upperArm ?? null,
        thigh: bodyData.thigh ?? null,
        calf: bodyData.calf ?? null,
      } : null,
      planConditions: {
        goalTypes: effectiveInput.goalTypes,
        weeklyFrequency: effectiveInput.weeklyFrequency,
        sessionDurationMinutes: effectiveInput.sessionDurationMinutes,
        workoutLocation: effectiveInput.workoutLocation,
        fitnessLevel: effectiveInput.fitnessLevel,
        trainingMode: effectiveInput.trainingMode,
        equipment: effectiveInput.equipment,
        preferredTraining: effectiveInput.preferredTraining,
        dietaryPreferences: effectiveInput.dietaryPreferences,
        allergies: effectiveInput.allergies,
        mealsPerDay: effectiveInput.mealsPerDay,
      },
      profileAnalysis: personalizationAnalysis,
      isSaved: 0,
      isFavorite: 0,
      reminders: normalized.reminders.length ? normalized.reminders : [
        '\u8bad\u7ec3\u524d\u70ed\u8eab 5 \u5206\u949f',
        '\u4efb\u4f55\u52a8\u4f5c\u5f15\u8d77\u660e\u663e\u75bc\u75db\u65f6\u7acb\u5373\u505c\u6b62',
        '\u6bcf\u5468\u81f3\u5c11\u5b89\u6392 1 \u5929\u5b8c\u6574\u4f11\u606f',
      ],
      disclaimer: '\u672c\u8ba1\u5212\u4e3a\u4e00\u822c\u5065\u8eab\u5efa\u8bae\uff0c\u4e0d\u80fd\u66ff\u4ee3\u533b\u751f\u6216\u4e13\u4e1a\u6559\u7ec3\u7684\u4e2a\u4f53\u5316\u6307\u5bfc\u3002',
    });
    res.json({ data: serializePlan(record), message: 'ok' });
  } catch (error) {
    console.error('[workout-plans] generate error:', error);
    res.status(502).json({
      error: { code: 'WORKOUT_PLAN_GENERATION_FAILED', message: '\u5065\u8eab\u8ba1\u5212\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' },
    });
  }
});

router.get('/latest', (req, res) => {
  const plan = db.find('workout_plans', { userId: req.user.userId })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  res.json({ data: plan ? serializePlan(plan) : null, message: 'ok' });
});

router.get('/saved/list', (req, res) => {
  const plans = db.find('workout_plans', { userId: req.user.userId })
    .filter((plan) => Boolean(plan.isSaved) || Boolean(plan.isFavorite))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(serializePlan);
  res.json({ data: plans, message: 'ok' });
});

router.get('/:planId', (req, res) => {
  const plan = db.findById('workout_plans', req.params.planId);
  if (!plan || plan.userId !== req.user.userId) {
    return res.status(404).json({ error: { code: 'PLAN_NOT_FOUND', message: '计划不存在' } });
  }
  res.json({ data: serializePlan(plan), message: 'ok' });
});

router.post('/:planId/save', (req, res) => updatePlanFlag(req, res, 'isSaved', true));
router.delete('/:planId/save', (req, res) => updatePlanFlag(req, res, 'isSaved', false));
router.post('/:planId/favorite', (req, res) => updatePlanFlag(req, res, 'isFavorite', true));
router.delete('/:planId/favorite', (req, res) => updatePlanFlag(req, res, 'isFavorite', false));

function serializePlan(plan) {
  return {
    ...plan,
    planId: plan.id,
    isSaved: Boolean(plan.isSaved),
    isFavorite: Boolean(plan.isFavorite),
  };
}

function updatePlanFlag(req, res, field, enabled) {
  const plan = db.findById('workout_plans', req.params.planId);
  if (!plan || plan.userId !== req.user.userId) {
    return res.status(404).json({ error: { code: 'PLAN_NOT_FOUND', message: '计划不存在' } });
  }
  const updated = db.update('workout_plans', plan.id, { [field]: enabled ? 1 : 0 });
  return res.json({ data: serializePlan(updated), message: 'ok' });
}

module.exports = router;
