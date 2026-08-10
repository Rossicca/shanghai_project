/**
 * 人工核验的国内公开烹饪教程索引。
 * 仅保存元数据与原平台链接，不下载、不转存视频；菜名别名用于避免“推荐菜与视频不是同一道菜”。
 */
const CURATED_RECIPE_VIDEOS = [
  {
    id: '7491322053539171596', platform: 'douyin', title: '清蒸鲈鱼的正确方法', author: '庆阳强哥教做菜', duration: 129,
    sourceUrl: 'https://www.douyin.com/video/7491322053539171596', coverUrl: null, playCount: 0,
    description: '菜名一致的清蒸鲈鱼教程，讲解蒸制火候与白灼汁调味。',
    dishAliases: ['清蒸鲈鱼', '清蒸鲈鱼配时蔬'], ingredients: ['鲈鱼', '葱', '姜'],
  },
  {
    id: '7576955901978938664', platform: 'douyin', title: '暖呼呼的白菜豆腐煲，好吃又下饭', author: '袁锐（萌新的圆）', duration: 205,
    sourceUrl: 'https://www.douyin.com/video/7576955901978938664', coverUrl: null, playCount: 0,
    description: '菜名一致的白菜豆腐煲完整制作视频。',
    dishAliases: ['白菜豆腐煲', '白菜豆腐菌菇煲'], ingredients: ['白菜', '豆腐', '菌菇'],
  },
  {
    id: '7417358970479824154', platform: 'douyin', title: '鸡蛋的 12 种家常做法', author: '杰哥厨房', duration: 720,
    sourceUrl: 'https://www.douyin.com/video/7417358970479824154', coverUrl: null, playCount: 7374000,
    description: '包含鸡蛋豆腐、酱油蒸蛋、虾仁滑蛋、糖醋荷包蛋、洋葱炒蛋等分步做法。',
    dishAliases: ['鸡蛋豆腐', '酱油蒸蛋', '虾仁滑蛋', '糖醋荷包蛋', '洋葱炒蛋', '青椒炒蛋', '青椒爆蛋'],
    ingredients: ['鸡蛋', '豆腐', '虾仁', '番茄', '洋葱', '青椒'],
  },
  {
    id: '7582761265493380411', platform: 'douyin', title: '10 分钟懒人快速菜：10 道家常做法', author: '美味小厨娘', duration: 600,
    sourceUrl: 'https://www.douyin.com/video/7582761265493380411', coverUrl: null, playCount: 12000,
    description: '包含酱油蒸全蛋、口蘑蒸鹌鹑蛋、孜然土豆和番茄鱼片等快手教程。',
    dishAliases: ['酱油蒸蛋', '口蘑蒸鹌鹑蛋', '孜然土豆', '番茄鱼片'],
    ingredients: ['鸡蛋', '鹌鹑蛋', '口蘑', '土豆', '鱼片', '番茄'],
  },
  {
    id: '7575053309933800713', platform: 'douyin', title: '经典家常番茄炒蛋完整做法', author: 'Ricky讲煮讲食', duration: 172,
    sourceUrl: 'https://www.douyin.com/video/7575053309933800713', coverUrl: null, playCount: 680000,
    description: '从炒蛋、炒番茄到混合调味，完整演示番茄炒蛋。',
    dishAliases: ['番茄炒蛋', '西红柿炒鸡蛋', '番茄鸡蛋'], ingredients: ['番茄', '西红柿', '鸡蛋'],
  },
  {
    id: '7636384362929474816', platform: 'douyin', title: '香煎鸡胸肉减脂沙拉', author: '熊熊饲养员', duration: 125,
    sourceUrl: 'https://www.douyin.com/video/7636384362929474816', coverUrl: null, playCount: 560000,
    description: '香煎鸡胸肉搭配羽衣甘蓝、番茄、蓝莓、黄瓜和牛油果。',
    dishAliases: ['鸡胸肉沙拉', '香煎鸡胸肉沙拉', '彩蔬鸡胸沙拉'], ingredients: ['鸡胸肉', '生菜', '羽衣甘蓝', '番茄', '黄瓜', '牛油果'],
  },
  {
    id: '7606287794554863946', platform: 'douyin', title: '低脂鲜嫩香煎鸡胸肉', author: '马羚', duration: 119,
    sourceUrl: 'https://www.douyin.com/video/7606287794554863946', coverUrl: null, playCount: 820000,
    description: '演示鸡胸肉腌制、火候和煎制过程。',
    dishAliases: ['香煎鸡胸肉', '低脂煎鸡胸肉', '嫩煎鸡胸肉'], ingredients: ['鸡胸肉'],
  },
  {
    id: '7125036796890713344', platform: 'douyin', title: '西兰花炒鸡胸肉低卡家常做法', author: '晴晴妈教美食', duration: 95,
    sourceUrl: 'https://www.douyin.com/video/7125036796890713344', coverUrl: null, playCount: 127000,
    description: '西兰花与鸡胸肉的低油家常炒制教程。',
    dishAliases: ['西兰花炒鸡胸肉', '鸡胸肉炒西兰花'], ingredients: ['鸡胸肉', '西兰花'],
  },
  {
    id: '7221097927857491239', platform: 'douyin', title: '鸡胸肉蔬菜减脂炒饭', author: '老默健身（健身餐）', duration: 150,
    sourceUrl: 'https://www.douyin.com/video/7221097927857491239', coverUrl: null, playCount: 2020000,
    description: '鸡胸肉、黄瓜、胡萝卜、青椒、鸡蛋、玉米和米饭的少油炒饭。',
    dishAliases: ['鸡胸肉炒饭', '蔬菜减脂炒饭', '彩蔬鸡肉炒饭'], ingredients: ['鸡胸肉', '米饭', '鸡蛋', '黄瓜', '胡萝卜', '青椒', '玉米'],
  },
  {
    id: '7286415783532530979', platform: 'douyin', title: '健身餐小炒豆腐做法', author: '真滴好吃的二轩', duration: 95,
    sourceUrl: 'https://www.douyin.com/video/7286415783532530979', coverUrl: null, playCount: 548,
    description: '小炒豆腐的备料与炒制步骤。',
    dishAliases: ['小炒豆腐', '家常炒豆腐', '小炒千页豆腐'], ingredients: ['豆腐', '千页豆腐', '青椒'],
  },
  {
    id: '7532058146686684475', platform: 'douyin', title: '鸡胸肉炒包菜与凉拌西兰花减脂餐', author: '永吉麻麻', duration: 54,
    sourceUrl: 'https://www.douyin.com/video/7532058146686684475', coverUrl: null, playCount: 430000,
    description: '一餐包含鸡胸肉炒包菜和凉拌西兰花两个明确做法。',
    dishAliases: ['鸡胸肉炒包菜', '凉拌西兰花', '鸡肉包菜'], ingredients: ['鸡胸肉', '包菜', '西兰花'],
  },
  {
    id: '7632638587511330417', platform: 'douyin', title: '自律期鲜嫩鸡胸肉做法', author: '歪栗方女士', duration: 78,
    sourceUrl: 'https://www.douyin.com/video/7632638587511330417', coverUrl: null, playCount: 740000,
    description: '自律期鸡胸肉腌制和烹饪方法。',
    dishAliases: ['鲜嫩鸡胸肉', '自律鸡胸肉', '低脂鸡胸肉'], ingredients: ['鸡胸肉'],
  },
  {
    id: '7598016733894544674', platform: 'douyin', title: '鸡蛋豆腐、木耳山药等四道家常菜', author: '山东卫视', duration: 300,
    sourceUrl: 'https://www.douyin.com/video/7598016733894544674', coverUrl: null, playCount: 92890000,
    description: '包含鸡蛋豆腐、香煎鸡蛋和木耳炒山药等分步做法，适合作为家常组合灵感。',
    dishAliases: ['鸡蛋豆腐', '香煎鸡蛋', '木耳炒山药', '山药炒木耳'], ingredients: ['鸡蛋', '豆腐', '木耳', '山药'],
  },
  {
    id: '7238557310061251895', platform: 'douyin', title: '元宝豆腐完整制作教程', author: '聚珍大酒店范文珍', duration: 260,
    sourceUrl: 'https://www.douyin.com/video/7238557310061251895', coverUrl: null, playCount: 32000,
    description: '演示豆腐填入肉馅、定型、烹饪和番茄调味的完整过程。',
    dishAliases: ['元宝豆腐', '肉酿豆腐', '酿豆腐'], ingredients: ['豆腐', '猪肉', '西兰花', '番茄'],
  },
  {
    id: '7360214224808840483', platform: 'douyin', title: '豌豆滑蛋、鸡蛋豆腐等家常素菜', author: '天天家常菜', duration: 480,
    sourceUrl: 'https://www.douyin.com/video/7360214224808840483', coverUrl: null, playCount: 46000,
    description: '包含豌豆滑蛋、鸡蛋豆腐、凉拌菠菜等多种蔬菜家常做法。',
    dishAliases: ['豌豆滑蛋', '鸡蛋豆腐', '凉拌菠菜', '番茄豆腐'], ingredients: ['豌豆', '鸡蛋', '豆腐', '菠菜', '番茄'],
  },
];

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[\s·•_—\-（）()]/g, '');
}

function asCandidate(video) {
  return {
    ...video,
    matchedDishes: [...video.dishAliases],
    _matchedDishes: video.dishAliases.map((dishName) => ({ dishName, usedIngredients: [] })),
  };
}

function findCuratedRecipeVideos({ name = '', ingredients = [] } = {}) {
  const normalizedName = normalize(name);
  const ingredientNames = ingredients.map((item) => normalize(item?.name || item)).filter(Boolean);
  return CURATED_RECIPE_VIDEOS
    .map((video) => {
      const exactDish = normalizedName && video.dishAliases.some((alias) => {
        const normalizedAlias = normalize(alias);
        return normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName);
      });
      const ingredientMatches = video.ingredients.filter((ingredient) =>
        ingredientNames.some((namePart) => namePart.includes(normalize(ingredient)) || normalize(ingredient).includes(namePart))
      );
      return { video, exactDish, ingredientMatches, score: (exactDish ? 100 : 0) + ingredientMatches.length * 10 };
    })
    .filter((item) => item.exactDish || item.ingredientMatches.length > 0)
    .sort((a, b) => b.score - a.score || Number(b.video.playCount || 0) - Number(a.video.playCount || 0))
    .map(({ video, ingredientMatches }) => ({
      ...asCandidate(video),
      _matchedDishes: video.dishAliases.map((dishName) => ({ dishName, usedIngredients: ingredientMatches })),
    }));
}

function validateRecipeVideo(video) {
  if (video?.platform === 'douyin' || /^\d{15,22}$/.test(String(video?.id || ''))) {
    const curated = CURATED_RECIPE_VIDEOS.find((item) => String(item.id) === String(video.id));
    return curated ? asCandidate(curated) : null;
  }
  const { validateBilibiliVideo } = require('./bilibili-search');
  return validateBilibiliVideo(video);
}

module.exports = { CURATED_RECIPE_VIDEOS, findCuratedRecipeVideos, validateRecipeVideo };
