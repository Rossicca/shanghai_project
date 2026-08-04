/**
 * 演示数据（mock）。真实 AI 未启用或调用失败时使用。
 * 注意：这些是演示数据，页面须标注"演示数据"。
 */

/** 演示识别结果：直接给一组常见健康食材 */
const DEMO_INGREDIENTS = [
  { name: '鸡胸肉', amount: '200g', confidence: 0.97 },
  { name: '西兰花', amount: '150g', confidence: 0.95 },
  { name: '鸡蛋', amount: '2个', confidence: 0.93 },
  { name: '糙米', amount: '120g', confidence: 0.90 },
];

/** 食谱模板：按食材关键词匹配 */
const RECIPE_TEMPLATES = [
  {
    keywords: ['鸡胸肉', '鸡腿', '鸡肉', '肉'],
    recipe: {
      name: '香煎鸡胸时蔬糙米饭',
      coverEmoji: '🍗',
      description: '高蛋白低脂的增肌减脂友好套餐，鸡胸嫩滑不柴，时蔬清甜，糙米提供持久饱腹。',
      calories: 480,
      protein: 45,
      carbs: 52,
      fat: 12,
      steps: [
        '鸡胸肉用盐、黑胡椒、少许橄榄油腌制 15 分钟。',
        '平底锅中小火，放入鸡胸每面煎 4-5 分钟至金黄熟透，静置 3 分钟再切。',
        '西兰花掰小朵焯水 1 分钟，过冷水保持翠绿。',
        '糙米提前泡 30 分钟煮熟，鸡蛋水煮或煎至喜欢熟度。',
        '摆盘：糙米打底，码上鸡胸、西兰花、鸡蛋，淋少许生抽。',
      ],
      cookTime: 25,
      difficulty: '简单',
      tips: ['鸡胸横切薄片更易入味', '煎鸡胸盖盖焖 2 分钟更嫩'],
    },
  },
  {
    keywords: ['鸡蛋', '蛋', '西红柿', '番茄'],
    recipe: {
      name: '西红柿炒蛋盖饭',
      coverEmoji: '🍅',
      description: '国民家常菜，酸甜开胃，蛋白质与番茄红素兼备，十分钟快手。',
      calories: 420,
      protein: 20,
      carbs: 58,
      fat: 13,
      steps: [
        '西红柿划十字烫去皮切块，鸡蛋打散加少许盐。',
        '热锅少油，倒入蛋液快速炒散盛出。',
        '原锅下西红柿块，中火炒出汁水，加一勺糖、半勺盐。',
        '倒回鸡蛋翻炒均匀，撒葱花出锅。',
        '浇在热米饭上即可。',
      ],
      cookTime: 12,
      difficulty: '简单',
      tips: ['西红柿先炒出沙再放蛋更入味'],
    },
  },
  {
    keywords: ['虾', '鱼', '海鲜', '豆腐'],
    recipe: {
      name: '蒜蓉虾仁蒸豆腐',
      coverEmoji: '🦐',
      description: '清爽高蛋白，蒸制保留原味，低脂又饱腹。',
      calories: 360,
      protein: 38,
      carbs: 18,
      fat: 14,
      steps: [
        '嫩豆腐切块铺盘底，虾仁去虾线放豆腐上。',
        '蒜末用热油泼香，加生抽、蚝油调成料汁。',
        '料汁淋在虾仁豆腐上，水开蒸 8 分钟。',
        '出锅撒葱花，可淋少许热油。',
      ],
      cookTime: 15,
      difficulty: '简单',
      tips: ['豆腐选嫩豆腐口感更滑'],
    },
  },
  {
    keywords: ['西兰花', '蔬菜', '沙拉', '彩椒', '黄瓜'],
    recipe: {
      name: '缤纷时蔬鸡蛋沙拉',
      coverEmoji: '🥗',
      description: '低卡清爽，富含膳食纤维，适合减脂期正餐。',
      calories: 320,
      protein: 18,
      carbs: 24,
      fat: 16,
      steps: [
        '西兰花焯水，鸡蛋煮熟切块，彩椒、黄瓜切丁。',
        '混合所有食材。',
        '用酸奶、柠檬汁、黑胡椒调一份低脂油醋汁淋上。',
      ],
      cookTime: 10,
      difficulty: '简单',
      tips: ['蔬菜提前沥干水分更爽脆'],
    },
  },
];

function pickMockRecipe(ingredients) {
  const names = ingredients.map((i) => i.name).join(' ');
  for (const t of RECIPE_TEMPLATES) {
    if (t.keywords.some((k) => names.includes(k))) return structuredClone(t.recipe);
  }
  return structuredClone(RECIPE_TEMPLATES[0].recipe);
}

function mockRecipeRecommendations(params) {
  const availableNames = (params.ingredients || []).map((item) => String(item.name || '').trim()).filter(Boolean);
  const main = availableNames[0] || '时令蔬菜';
  const has = (pattern) => availableNames.some((name) => pattern.test(name));
  let templates;
  if (has(/牛奶|酸奶|奶油|奶酪/) || has(/坚果|核桃|杏仁|腰果|花生/)) {
    const dairy = availableNames.find((name) => /牛奶|酸奶|奶油|奶酪/.test(name)) || '牛奶';
    const nut = availableNames.find((name) => /坚果|核桃|杏仁|腰果|花生/.test(name)) || '坚果';
    templates = [
      { name: `${dairy}${nut}燕麦杯`, emoji: '🥣', category: '早餐', required: [dairy, nut, '燕麦', '香蕉'], minutes: 8, calories: 380 },
      { name: `${dairy}水果奶昔`, emoji: '🥛', category: '饮品', required: [dairy, '香蕉', '蓝莓'], minutes: 5, calories: 260 },
      { name: `${dairy}鸡蛋布丁`, emoji: '🍮', category: '甜品', required: [dairy, '鸡蛋', '白砂糖'], minutes: 30, calories: 280 },
      { name: `${nut}燕麦能量球`, emoji: '🍪', category: '加餐', required: [nut, '燕麦', '蜂蜜'], minutes: 15, calories: 320 },
      { name: `奶香${nut}吐司`, emoji: '🍞', category: '烘焙', required: [dairy, nut, '吐司', '鸡蛋'], minutes: 18, calories: 410 },
      { name: `${dairy}南瓜浓汤`, emoji: '🥣', category: '汤羹', required: [dairy, '南瓜', '洋葱'], minutes: 25, calories: 300 },
    ];
  } else {
    templates = [
      { name: `香煎${main}时蔬盘`, emoji: '🍳', category: '快手主菜', required: [main, '西兰花', '黑胡椒'], minutes: 20, calories: 420 },
      { name: `番茄${main}暖汤`, emoji: '🥣', category: '汤羹', required: [main, '番茄', '洋葱'], minutes: 25, calories: 310 },
      { name: `${main}鸡蛋炒饭`, emoji: '🍚', category: '主食组合', required: [main, '鸡蛋', '米饭', '小葱'], minutes: 15, calories: 520 },
      { name: `${main}菌菇豆腐煲`, emoji: '🍲', category: '炖菜', required: [main, '豆腐', '香菇'], minutes: 30, calories: 390 },
      { name: `${main}荞麦拌面`, emoji: '🍜', category: '轻食主食', required: [main, '荞麦面', '黄瓜', '芝麻酱'], minutes: 18, calories: 450 },
      { name: `${main}彩蔬烘蛋`, emoji: '🥚', category: '高蛋白轻食', required: [main, '鸡蛋', '彩椒', '牛奶'], minutes: 22, calories: 360 },
    ];
  }
  return templates.map((item, index) => {
    const availableIngredients = item.required.filter((required) =>
      availableNames.some((owned) => owned.includes(required) || required.includes(owned))
    );
    const missingIngredients = item.required.filter((required) => !availableIngredients.includes(required));
    return {
      id: `candidate-${index + 1}`,
      name: item.name,
      coverEmoji: item.emoji,
      category: item.category,
      pantryLevel: index < 2 ? 'existing' : index < 4 ? 'topup' : 'explore',
      description: `以${main}为主食材的${item.category}方案，允许补充少量常见食材获得更完整的口味。`,
      reason: `结合现有${availableNames.slice(0, 3).join('、') || main}与${params.user?.goal || '日常均衡'}目标推荐。`,
      availableIngredients,
      missingIngredients,
      cookTime: item.minutes,
      difficulty: '简单',
      estimatedCalories: item.calories,
      sourceVideo: null,
    };
  });
}

/** 运动视频库 */
const WORKOUT_LIBRARY = [
  // 全身燃脂
  { id: 'w1', title: '12分钟全身燃脂操·无器械', coach: '周六野Zoe', duration: 720, difficulty: '入门', category: '全身燃脂', calories: 140, coverColor: '#FF6B35', reason: '短时高效燃脂，无器械在家就能做', tags: ['燃脂', '无器械', '新手'], sourceUrl: 'https://search.bilibili.com/all?keyword=周六野+12分钟全身燃脂', platform: 'bilibili' },
  { id: 'w2', title: '帕梅拉20分钟全身HIIT', coach: 'PamelaReif', duration: 1200, difficulty: '进阶', category: '全身燃脂', calories: 280, coverColor: '#E74C3C', reason: '高强度间歇，突破平台期', tags: ['HIIT', '进阶', '暴汗'], sourceUrl: 'https://search.bilibili.com/all?keyword=帕梅拉+20分钟全身HIIT', platform: 'bilibili' },
  { id: 'w3', title: '刘畊宏本草纲目毽子操', coach: '刘畊宏', duration: 900, difficulty: '入门', category: '全身燃脂', calories: 200, coverColor: '#FFC94D', reason: '全程站立，膝盖友好，跟着音乐跳', tags: ['站立', '膝盖友好', '跟练'], sourceUrl: 'https://search.bilibili.com/all?keyword=刘畊宏+本草纲目毽子操', platform: 'bilibili' },
  // 臀腿
  { id: 'w4', title: '周六野20分钟翘臀不粗腿训练', coach: '周六野Zoe', duration: 1200, difficulty: '入门', category: '臀腿', calories: 160, coverColor: '#2ECC71', reason: '强化臀腿肌群，改善久坐僵硬', tags: ['深蹲', '翘臀'], sourceUrl: 'https://search.bilibili.com/all?keyword=周六野+翘臀不粗腿', platform: 'bilibili' },
  { id: 'w5', title: '帕梅拉15分钟蜜桃臀训练', coach: 'PamelaReif', duration: 900, difficulty: '进阶', category: '臀腿', calories: 190, coverColor: '#1ABC9C', reason: '弹力带抗阻，针对性塑形', tags: ['弹力带', '塑形'], sourceUrl: 'https://search.bilibili.com/all?keyword=帕梅拉+蜜桃臀训练', platform: 'bilibili' },
  // 肩背
  { id: 'w6', title: '韩小四10分钟改善圆肩驼背', coach: '韩小四', duration: 600, difficulty: '入门', category: '肩背', calories: 90, coverColor: '#4A90E2', reason: '改善体态，缓解久坐肩颈紧张', tags: ['体态', '久坐'], sourceUrl: 'https://search.bilibili.com/all?keyword=韩小四+改善圆肩驼背', platform: 'bilibili' },
  { id: 'w7', title: '欧阳春晓少女背训练', coach: '欧阳春晓', duration: 960, difficulty: '挑战', category: '肩背', calories: 170, coverColor: '#9B59B6', reason: '上肢力量强化，雕塑肩背线条', tags: ['力量', '俯卧撑'], sourceUrl: 'https://search.bilibili.com/all?keyword=欧阳春晓+少女背', platform: 'bilibili' },
  // 手臂
  { id: 'w8', title: '周六野手臂紧致·告别拜拜肉', coach: '周六野Zoe', duration: 660, difficulty: '入门', category: '手臂', calories: 110, coverColor: '#F39C12', reason: '小重量多次数，紧致手臂线条', tags: ['手臂', '紧致'], sourceUrl: 'https://search.bilibili.com/all?keyword=周六野+手臂紧致拜拜肉', platform: 'bilibili' },
  { id: 'w9', title: 'Coffee林芊妤15分钟手臂塑形', coach: 'Coffee林芊妤', duration: 900, difficulty: '进阶', category: '手臂', calories: 140, coverColor: '#E67E22', reason: '哑铃抗阻，雕刻二头三头', tags: ['哑铃', '塑形'], sourceUrl: 'https://search.bilibili.com/all?keyword=Coffee林芊妤+手臂塑形', platform: 'bilibili' },
  // 核心
  { id: 'w10', title: '帕梅拉10分钟腹肌训练', coach: 'PamelaReif', duration: 600, difficulty: '进阶', category: '核心', calories: 130, coverColor: '#8E44AD', reason: '核心训练，稳定躯干保护腰椎', tags: ['腹肌', '核心'], sourceUrl: 'https://search.bilibili.com/all?keyword=帕梅拉+10分钟腹肌训练', platform: 'bilibili' },
  { id: 'w11', title: '刘逗逗5分钟平板支撑挑战', coach: '刘逗逗', duration: 300, difficulty: '入门', category: '核心', calories: 80, coverColor: '#2ECC71', reason: '静态核心耐力，新手友好', tags: ['平板支撑', '新手'], sourceUrl: 'https://search.bilibili.com/all?keyword=刘逗逗+平板支撑', platform: 'bilibili' },
  // 有氧
  { id: 'w12', title: '帕梅拉20分钟有氧燃脂舞', coach: 'PamelaReif', duration: 1200, difficulty: '入门', category: '有氧', calories: 250, coverColor: '#FF6B35', reason: '中等强度有氧，稳定燃脂', tags: ['跑步', '有氧'], sourceUrl: 'https://search.bilibili.com/all?keyword=帕梅拉+20分钟有氧燃脂舞', platform: 'bilibili' },
  { id: 'w13', title: 'SomiFit 15分钟跳绳间歇', coach: 'SomiFit', duration: 900, difficulty: '进阶', category: '有氧', calories: 230, coverColor: '#E74C3C', reason: '跳绳高效燃脂，空间占用小', tags: ['跳绳', '间歇'], sourceUrl: 'https://search.bilibili.com/all?keyword=SomiFit+跳绳间歇', platform: 'bilibili' },
  // 拉伸
  { id: 'w14', title: '周六野睡前全身拉伸', coach: '周六野Zoe', duration: 600, difficulty: '入门', category: '拉伸', calories: 60, coverColor: '#1ABC9C', reason: '放松肌肉，改善睡眠与柔韧', tags: ['拉伸', '睡前'], sourceUrl: 'https://search.bilibili.com/all?keyword=周六野+睡前拉伸', platform: 'bilibili' },
  { id: 'w15', title: '韩小四运动后15分钟拉伸', coach: '韩小四', duration: 900, difficulty: '入门', category: '拉伸', calories: 80, coverColor: '#4A90E2', reason: '运动后必做，缓解延迟酸痛', tags: ['拉伸', '恢复'], sourceUrl: 'https://search.bilibili.com/all?keyword=韩小四+运动后拉伸', platform: 'bilibili' },
];

/** 按身体数据 + 目标 做 mock 推荐 */
function mockRecommendWorkout(params) {
  const { goal, preference } = params;
  // 未填身体数据时用默认值，避免崩
  const bodyData = params.bodyData ?? { height: 170, weight: 60, age: 22, gender: '男' };
  let pool = [...WORKOUT_LIBRARY];

  // 目标导向筛选
  const goalType = goal?.type ?? '保持健康';
  if (goalType === '减脂') {
    pool = pool.filter((w) => ['全身燃脂', '有氧'].includes(w.category));
  } else if (goalType === '增肌') {
    pool = pool.filter((w) => ['臀腿', '肩背', '手臂'].includes(w.category));
  } else if (goalType === '塑形') {
    pool = pool.filter((w) => ['核心', '臀腿', '手臂'].includes(w.category));
  } else {
    pool = pool.filter((w) => ['全身燃脂', '有氧', '拉伸'].includes(w.category));
  }

  // 身体数据（BMI + 年龄）估算强度
  const bmi = bodyData.height > 0 ? bodyData.weight / (bodyData.height / 100) ** 2 : 22;
  const highBmi = bmi >= 24;
  if (highBmi) pool = pool.filter((w) => w.difficulty !== '挑战');
  if (bodyData.age >= 45) pool = pool.filter((w) => w.difficulty !== '挑战');

  // 时长偏好
  if (preference?.duration) {
    const maxSec = preference.duration * 60 * 1.3;
    const minSec = preference.duration * 60 * 0.6;
    const filtered = pool.filter((w) => w.duration <= maxSec && w.duration >= minSec);
    if (filtered.length >= 2) pool = filtered;
  }

  // 去重 + 补足：数量不够从全库补
  const seen = new Set(pool.map((w) => w.id));
  for (const w of WORKOUT_LIBRARY) {
    if (pool.length >= (params.limit ?? 8)) break;
    if (!seen.has(w.id)) pool.push(w);
  }

  const limit = params.limit ?? 8;
  const result = pool.slice(0, limit).map((w) => ({ ...w }));
  // 至少一条推荐理由来自身体数据
  if (result[0]) result[0].reason = `基于你的数据（${bodyData.height}cm/${bodyData.weight}kg，目标${goalType}）为你匹配，${result[0].reason}`;
  return result;
}

module.exports = {
  DEMO_INGREDIENTS,
  WORKOUT_LIBRARY,
  pickMockRecipe,
  mockRecipeRecommendations,
  mockRecommendWorkout,
};
