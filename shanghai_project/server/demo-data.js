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

/** 运动视频库 */
const WORKOUT_LIBRARY = [
  // 全身燃脂
  { id: 'w1', title: '12分钟全身燃脂操·无器械', coach: 'Lina', duration: 720, difficulty: '入门', category: '全身燃脂', calories: 140, coverColor: '#FF6B35', reason: '短时高效燃脂，无器械在家就能做', tags: ['燃脂', '无器械', '新手'] },
  { id: 'w2', title: 'HIIT 全身燃脂·暴汗 20 分钟', coach: 'Kevin', duration: 1200, difficulty: '进阶', category: '全身燃脂', calories: 260, coverColor: '#E74C3C', reason: '高强度间歇，突破平台期', tags: ['HIIT', '进阶', '暴汗'] },
  { id: 'w3', title: '全身燃脂·站立版 15 分钟', coach: 'Lina', duration: 900, difficulty: '入门', category: '全身燃脂', calories: 160, coverColor: '#FFC94D', reason: '全程站立，膝盖友好', tags: ['站立', '膝盖友好'] },
  // 臀腿
  { id: 'w4', title: '徒手深蹲 100 次·翘臀腿训练', coach: 'Mia', duration: 780, difficulty: '入门', category: '臀腿', calories: 150, coverColor: '#2ECC71', reason: '强化臀腿肌群，改善久坐僵硬', tags: ['深蹲', '翘臀'] },
  { id: 'w5', title: '进阶臀腿·弹力带训练', coach: 'Mia', duration: 1080, difficulty: '进阶', category: '臀腿', calories: 190, coverColor: '#1ABC9C', reason: '弹力带抗阻，针对性塑形', tags: ['弹力带', '塑形'] },
  // 肩背
  { id: 'w6', title: '10分钟圆肩驼背纠正·肩背激活', coach: 'Ray', duration: 600, difficulty: '入门', category: '肩背', calories: 90, coverColor: '#4A90E2', reason: '改善体态，缓解久坐肩颈紧张', tags: ['体态', '久坐'] },
  { id: 'w7', title: '上肢力量·俯卧撑进阶课', coach: 'Kevin', duration: 960, difficulty: '挑战', category: '肩背', calories: 170, coverColor: '#9B59B6', reason: '上肢力量强化，雕塑肩背线条', tags: ['力量', '俯卧撑'] },
  // 手臂
  { id: 'w8', title: '手臂紧致·拜拜肉告别训练', coach: 'Vivi', duration: 660, difficulty: '入门', category: '手臂', calories: 110, coverColor: '#F39C12', reason: '小重量多次数，紧致手臂线条', tags: ['手臂', '紧致'] },
  { id: 'w9', title: '哑铃手臂塑形 15 分钟', coach: 'Vivi', duration: 900, difficulty: '进阶', category: '手臂', calories: 140, coverColor: '#E67E22', reason: '哑铃抗阻，雕刻二头三头', tags: ['哑铃', '塑形'] },
  // 核心
  { id: 'w10', title: '8分钟腹肌撕裂者·核心强化', coach: 'Ray', duration: 480, difficulty: '进阶', category: '核心', calories: 120, coverColor: '#8E44AD', reason: '核心训练，稳定躯干保护腰椎', tags: ['腹肌', '核心'] },
  { id: 'w11', title: '平板支撑挑战·核心耐力', coach: 'Mia', duration: 540, difficulty: '入门', category: '核心', calories: 100, coverColor: '#2ECC71', reason: '静态核心耐力，新手友好', tags: ['平板支撑', '新手'] },
  // 有氧
  { id: 'w12', title: '30分钟慢跑有氧·燃脂心率', coach: 'Kevin', duration: 1800, difficulty: '入门', category: '有氧', calories: 320, coverColor: '#FF6B35', reason: '中等强度有氧，稳定燃脂', tags: ['跑步', '有氧'] },
  { id: 'w13', title: '跳绳有氧·间歇 15 分钟', coach: 'Lina', duration: 900, difficulty: '进阶', category: '有氧', calories: 230, coverColor: '#E74C3C', reason: '跳绳高效燃脂，空间占用小', tags: ['跳绳', '间歇'] },
  // 拉伸
  { id: 'w14', title: '全身放松拉伸·睡前舒缓', coach: 'Vivi', duration: 600, difficulty: '入门', category: '拉伸', calories: 60, coverColor: '#1ABC9C', reason: '放松肌肉，改善睡眠与柔韧', tags: ['拉伸', '睡前'] },
  { id: 'w15', title: '运动后静态拉伸·15分钟', coach: 'Ray', duration: 900, difficulty: '入门', category: '拉伸', calories: 80, coverColor: '#4A90E2', reason: '运动后必做，缓解延迟酸痛', tags: ['拉伸', '恢复'] },
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
  mockRecommendWorkout,
};
