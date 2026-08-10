import type { FitnessGoal } from '@/types/workout';
import type { RecipeSourceVideo } from '@/types/recipe';

export type HealthInspiration = {
  id: string;
  meal: string;
  group: '早餐' | '正餐' | '加餐' | '素食';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'dessert';
  title: string;
  videoSearchAliases?: string[];
  sourceVideo?: RecipeSourceVideo;
  description: string;
  time: number;
  calories: number;
  protein: number;
  image: string;
  ingredients: string[];
  goals: FitnessGoal['type'][];
  highlights: string[];
  bestFor: string;
};

type ExtraInspirationSeed = Pick<HealthInspiration,
  'id' | 'meal' | 'group' | 'mealType' | 'title' | 'videoSearchAliases' | 'time' | 'calories' | 'protein' | 'ingredients' | 'goals' | 'sourceVideo'>;

const EXTRA_IMAGES = {
  早餐: 'https://images.unsplash.com/photo-1494859802809-d069c3b71a8a?auto=format&fit=crop&w=900&q=84',
  正餐: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=84',
  加餐: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=84',
  素食: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=84',
} as const;

/**
 * 共享/重复图片菜品的真实食物封面（来自对应视频）。
 * - https://i*.hdslb.com/...  B站官方封面
 * - /covers/<id>.webp        抖音封面，已下载到 server/data/covers/，由后端 /covers 路由提供
 */
const RESOLVED_IMAGES: Record<string, string> = {
  'asparagus-shrimp': 'https://i0.hdslb.com/bfs/archive/8ba5153623808efff92e541a904ef76056ae7210.jpg',
  'banana-oat-pancake': 'https://i1.hdslb.com/bfs/archive/eb00e8c1c1898041a500ab075a83f126c55e9cd1.jpg',
  'beef-pepper-bowl': 'https://i2.hdslb.com/bfs/archive/8497940a654ceb8869e85faace0a6b263f3ad651.jpg',
  'black-sesame-oat-milk': 'https://i0.hdslb.com/bfs/archive/d653a5722a617a163c8521c1217f5f5df7cad99c.jpg',
  'blackpepper-beef-rice': 'https://i0.hdslb.com/bfs/archive/108214bad28236f12075ec6d9f7726916ecf7e20.jpg',
  'broccoli-beef-bowl': 'https://i2.hdslb.com/bfs/archive/33b3f509d664d50cb3045659b48399aec4d77d2e.jpg',
  'cabbage-tofu-stew': '/covers/7576955901978938664.webp',
  'chia-overnight-oats': 'https://i2.hdslb.com/bfs/archive/a94aee6e93ff6314dfd58c991bf89496ce891c92.jpg',
  'chicken-avocado-wrap': 'https://i2.hdslb.com/bfs/archive/13e838e14180719b13bbe3029fb5c772127a9fa7.jpg',
  'chicken-quinoa-bowl': 'https://i1.hdslb.com/bfs/archive/dad85a01b65a673b499542677732001ce2c6198f.jpg',
  'chicken-veggie-patty': 'https://i1.hdslb.com/bfs/archive/80b72a0d613abbb57e4609da2f5f018d4502b1cb.jpg',
  'chickpea-curry': 'https://i1.hdslb.com/bfs/archive/8fbdde1c1dcb2783cdb91dc315b11eda20b74317.jpg',
  'chickpea-salad': 'https://i0.hdslb.com/bfs/archive/af725b5fb93f0b8e2d8219b4cdb7447f3f8b2519.jpg',
  'corn-egg-sandwich': 'https://i1.hdslb.com/bfs/archive/77333c9cd75eb31c5a6d08310797044cbf29881e.jpg',
  'corn-yam-chicken-soup': 'https://i1.hdslb.com/bfs/archive/93f32439b181e54eb088f550b6f3d8f0cc1fad67.jpg',
  'douyin-broccoli-chicken': '/covers/7125036796890713344.webp',
  'douyin-chicken-cabbage': '/covers/7532058146686684475.webp',
  'douyin-chicken-fried-rice': '/covers/7221097927857491239.webp',
  'douyin-chicken-salad': '/covers/7636384362929474816.webp',
  'douyin-egg-tofu': 'https://i1.hdslb.com/bfs/archive/eed3b641712f277e8e8b6a17926a31eff1574b14.jpg',
  'douyin-pea-egg': '/covers/7360214224808840483.webp',
  'douyin-stirfry-tofu': '/covers/7286415783532530979.webp',
  'douyin-tomato-egg': '/covers/7575053309933800713.webp',
  'douyin-yam-fungus': '/covers/7598016733894544674.webp',
  'douyin-yuanbao-tofu': '/covers/7238557310061251895.webp',
  'eggplant-chicken': 'https://i2.hdslb.com/bfs/archive/98673e197be1ff4d3e3011a3d15d42a41e126949.jpg',
  'mango-chia-yogurt': 'https://i2.hdslb.com/bfs/archive/a15a9b53b19e7f273274c939a2ff72c79b62bda4.jpg',
  'mapo-tofu-lean': 'https://i2.hdslb.com/bfs/archive/4b3e6cbe13f77ae4965902e94c0aebf840d722d5.jpg',
  'milk-oat-congee': 'https://i2.hdslb.com/bfs/archive/c50c6cf69a821fed7d55c2dc94378f817038acc8.jpg',
  'mushroom-chicken-soup': 'https://i1.hdslb.com/bfs/archive/c8b2a9a1d60031a97b79e45765f44a570dbe71ed.jpg',
  'mushroom-soba': 'https://i1.hdslb.com/bfs/archive/5a504a9b46d0e5040622c47f72efd7e323145f2e.jpg',
  'mushroom-steamed-chicken': 'https://i0.hdslb.com/bfs/archive/0359adec1ff7837e1d969da932c9c9c8396b4f9d.jpg',
  'oat-breakfast': 'https://i0.hdslb.com/bfs/archive/8420ab3ba516f6b228b608f2363545fcd6386fc8.jpg',
  'pepper-chicken': 'https://i2.hdslb.com/bfs/archive/06a71f7191dfcc875a24edec7204a0c3aea2aadb.jpg',
  'pepper-pork-tenderloin': 'https://i2.hdslb.com/bfs/archive/808ef9b2471c8c5cb8fd3acff263f565da6009af.jpg',
  'pumpkin-millet-congee': 'https://i1.hdslb.com/bfs/archive/412c88229405e9e522b939dac6a5e0aab1e8abd4.jpg',
  'pumpkin-steamed-chicken': 'https://i0.hdslb.com/bfs/archive/945c35c1ee855a2954a564e06bd5f3068860ccad.jpg',
  'purple-yam-milk': 'https://i2.hdslb.com/bfs/archive/ee52edacc33103aa10a4a85a0eec20e6a111ab49.jpg',
  'salmon-avocado-salad': 'https://i2.hdslb.com/bfs/archive/226b9e20d0bd7e99d1e9c115e23a59d5483396b8.jpg',
  'salmon-bagel': 'https://i0.hdslb.com/bfs/archive/d579852c0d9a3f1bb4668aa21b613e33fa6fbc15.jpg',
  'salmon-pumpkin-rice': 'https://i2.hdslb.com/bfs/archive/aa024b606713504684c7b6443f5a76a23beaccba.jpg',
  'seared-chicken': 'https://i0.hdslb.com/bfs/archive/ed21b098066972eb69417922fa096d1da6a1c81b.jpg',
  'seaweed-tofu-egg-soup': 'https://i1.hdslb.com/bfs/archive/3bf69a8b543259dd620fe2e8508a73fd7258d1fd.jpg',
  'sesame-tofu-noodles': 'https://i0.hdslb.com/bfs/archive/4a1ad6f887beea32337575d64e3cadf45d2e4832.jpg',
  'shrimp-quinoa-salad': 'https://i0.hdslb.com/bfs/archive/c6ac5e12934e5c5a7935b1c6e65f51ad7c63ae7c.jpg',
  'shrimp-scrambled-egg': '/covers/7417358970479824154.webp',
  'spinach-mushroom-omelet': 'https://i1.hdslb.com/bfs/archive/321e2d9771d3586e677778aa27abbdf9c7d2fb6e.jpg',
  'steamed-bass': '/covers/7491322053539171596.webp',
  'tofu-veggie-pancake': 'https://i2.hdslb.com/bfs/archive/edf09785ff586906b85d1aa8b9a0863d7c8438d3.jpg',
  'tomato-beef-noodles': 'https://i2.hdslb.com/bfs/archive/70e2e7ee9a3b86eac9f776dcbd064cc8fa102dcc.jpg',
  'tomato-beef-stew': 'https://i1.hdslb.com/bfs/archive/8a2635c7fc183dd313ca8739dc8c38346f900ca5.jpg',
  'tomato-egg-shrimp-noodle': 'https://i2.hdslb.com/bfs/archive/94e5b7e62c71e83662a67a59ade595e950f4b90a.jpg',
  'tomato-tofu-soup': 'https://i2.hdslb.com/bfs/archive/fd7e5f8d16d315ca47d42b42fba0c900fcd37255.jpg',
  'tuna-corn-riceball': 'https://i0.hdslb.com/bfs/archive/545db15b845360628ff93bdcb4ab75362be0b0a3.jpg',
  'wintermelon-shrimp-soup': 'https://i0.hdslb.com/bfs/archive/7fb1348d297a3647658cf5991007f1bf975c30c8.jpg',
  'yogurt-oat-bowl': 'https://i2.hdslb.com/bfs/archive/d3f98f3b5c197855fface6734db910c52c70912a.jpg',
};

function bilibiliVideo(id: string, title: string, author: string, description: string): RecipeSourceVideo {
  return { id, title, author, duration: 0, coverUrl: null, sourceUrl: `https://www.bilibili.com/video/${id}`, description, platform: 'bilibili' };
}

function douyinVideo(id: string, title: string, author: string, description: string): RecipeSourceVideo {
  return { id, title, author, duration: 0, coverUrl: null, sourceUrl: `https://www.douyin.com/video/${id}`, description, platform: 'douyin' };
}

const EXTRA_INSPIRATION_SEEDS: ExtraInspirationSeed[] = [
  { id: 'milk-oat-congee', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '牛奶燕麦粥', videoSearchAliases: ['牛奶燕麦粥'], time: 10, calories: 350, protein: 15, ingredients: ['牛奶', '燕麦', '香蕉', '坚果'], goals: ['减脂', '保持健康'], sourceVideo: bilibiliVideo('BV1db411t78a', '周末的早上做一碗牛奶燕麦粥，健康的一天从这里开始！', '一家之煮官方', '完整展示牛奶燕麦粥的制作方法。') },
  { id: 'yogurt-oat-bowl', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '酸奶燕麦碗', videoSearchAliases: ['酸奶燕麦碗'], time: 8, calories: 330, protein: 14, ingredients: ['无糖酸奶', '燕麦', '水果', '坚果'], goals: ['减脂', '保持健康'], sourceVideo: bilibiliVideo('BV1uiLgzYE5f', '酸奶燕麦碗', '岳了个饭', '视频展示酸奶燕麦碗的完整搭配做法。') },
  { id: 'chicken-veggie-patty', meal: '午餐', group: '正餐', mealType: 'lunch', title: '鸡胸肉蔬菜饼', videoSearchAliases: ['鸡胸肉蔬菜饼', '蔬菜鸡肉饼'], time: 25, calories: 450, protein: 40, ingredients: ['鸡胸肉', '胡萝卜', '西兰花', '玉米'], goals: ['减脂', '增肌', '塑形'], sourceVideo: bilibiliVideo('BV19o4y1o7fW', '【鸡胸肉蔬菜饼】高蛋白低脂，减脂健身美味便当', '优食志', '高蛋白低脂鸡胸肉蔬菜饼分步做法。') },
  { id: 'pepper-chicken', meal: '午餐', group: '正餐', mealType: 'lunch', title: '青椒炒鸡胸肉', videoSearchAliases: ['青美人椒炒鸡胸肉', '青椒炒鸡胸肉'], time: 18, calories: 430, protein: 39, ingredients: ['鸡胸肉', '青椒', '洋葱', '糙米饭'], goals: ['减脂', '增肌'], sourceVideo: bilibiliVideo('BV1Etd6BQEyx', '生活化减脂餐 青美人椒炒鸡胸肉 超详细做法', '火焰魔法师gogo', '青椒炒鸡胸肉的详细制作教程。') },
  { id: 'seared-chicken', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '香煎鸡胸肉', videoSearchAliases: ['鸡胸肉简单又好吃的做法', '香煎鸡胸肉'], time: 18, calories: 410, protein: 42, ingredients: ['鸡胸肉', '西兰花', '番茄', '杂粮饭'], goals: ['减脂', '增肌', '塑形'], sourceVideo: bilibiliVideo('BV1MW4y1b76z', '鸡胸肉简单又好吃的做法，不用油炸，出锅鲜嫩入味', '超子美食', '演示鸡胸肉的完整处理与香煎制作过程。') },
  { id: 'salmon-avocado-salad', meal: '午餐', group: '正餐', mealType: 'lunch', title: '三文鱼牛油果沙拉', videoSearchAliases: ['三文鱼牛油果沙拉'], time: 20, calories: 500, protein: 32, ingredients: ['三文鱼', '牛油果', '生菜', '番茄'], goals: ['塑形', '保持健康'], sourceVideo: bilibiliVideo('BV19VPveREDh', '三文鱼牛油果沙拉，简单又美味！', '认真吃饭研究所', '包含三文鱼煎制、牛油果处理和沙拉组合步骤。') },
  { id: 'salmon-bagel', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '三文鱼贝果三明治', videoSearchAliases: ['三文鱼贝果三明治'], time: 12, calories: 470, protein: 27, ingredients: ['全麦贝果', '三文鱼', '生菜', '奶酪'], goals: ['增肌', '保持健康'], sourceVideo: bilibiliVideo('BV1VG4y1Q7Kg', '网红早午餐！三文鱼贝果三明治！简单快手！', '涛姐做西餐', '完整展示三文鱼贝果三明治的快手做法。') },
  { id: 'spinach-mushroom-omelet', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '菠菜菌菇欧姆蛋', videoSearchAliases: ['菠菜蘑菇欧姆蛋'], time: 15, calories: 390, protein: 24, ingredients: ['鸡蛋', '菠菜', '菌菇', '牛奶'], goals: ['减脂', '增肌'] },
  { id: 'pumpkin-millet-congee', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '南瓜小米粥配鸡蛋', videoSearchAliases: ['南瓜小米粥'], time: 25, calories: 370, protein: 16, ingredients: ['南瓜', '小米', '鸡蛋', '牛奶'], goals: ['保持健康'] },
  { id: 'corn-egg-sandwich', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '玉米鸡蛋全麦三明治', videoSearchAliases: ['玉米鸡蛋三明治'], time: 12, calories: 420, protein: 22, ingredients: ['全麦面包', '玉米', '鸡蛋', '生菜'], goals: ['减脂', '增肌'] },
  { id: 'chia-overnight-oats', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '奇亚籽隔夜燕麦', videoSearchAliases: ['奇亚籽隔夜燕麦'], time: 8, calories: 360, protein: 15, ingredients: ['燕麦', '奇亚籽', '牛奶', '蓝莓'], goals: ['减脂', '保持健康'] },
  { id: 'purple-yam-milk', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '紫薯燕麦牛奶糊', videoSearchAliases: ['紫薯燕麦奶', '紫薯燕麦糊'], time: 15, calories: 340, protein: 14, ingredients: ['紫薯', '燕麦', '牛奶', '坚果'], goals: ['增肌', '保持健康'] },
  { id: 'chicken-avocado-wrap', meal: '午餐', group: '正餐', mealType: 'lunch', title: '鸡肉牛油果全麦卷', videoSearchAliases: ['鸡肉牛油果卷饼'], time: 18, calories: 520, protein: 36, ingredients: ['鸡胸肉', '牛油果', '全麦饼', '生菜'], goals: ['减脂', '增肌'] },
  { id: 'tuna-corn-riceball', meal: '午餐', group: '正餐', mealType: 'lunch', title: '金枪鱼玉米杂粮饭团', videoSearchAliases: ['金枪鱼玉米饭团'], time: 20, calories: 480, protein: 28, ingredients: ['金枪鱼', '玉米', '杂粮饭', '海苔'], goals: ['减脂', '塑形'] },
  { id: 'tofu-veggie-pancake', meal: '早餐', group: '素食', mealType: 'breakfast', title: '豆腐蔬菜早餐饼', videoSearchAliases: ['豆腐蔬菜饼'], time: 18, calories: 380, protein: 21, ingredients: ['豆腐', '鸡蛋', '胡萝卜', '青菜'], goals: ['减脂', '保持健康'] },
  { id: 'banana-oat-pancake', meal: '加餐', group: '加餐', mealType: 'dessert', title: '香蕉燕麦鸡蛋饼', videoSearchAliases: ['香蕉燕麦饼'], time: 12, calories: 300, protein: 14, ingredients: ['香蕉', '燕麦', '鸡蛋', '牛奶'], goals: ['增肌', '保持健康'] },
  { id: 'blackpepper-beef-rice', meal: '午餐', group: '正餐', mealType: 'lunch', title: '黑椒牛肉糙米饭', videoSearchAliases: ['黑椒牛肉饭', '黑椒牛肉'], time: 25, calories: 580, protein: 40, ingredients: ['瘦牛肉', '彩椒', '糙米饭', '洋葱'], goals: ['增肌', '塑形'], sourceVideo: bilibiliVideo('BV1p4411C7JE', '一盘教科书级别的黑椒牛肉，拌饭下酒都优秀', '马蹄厨房', '完整展示黑椒牛肉的腌制、炒制和黑椒调味过程，可搭配糙米饭。') },
  { id: 'tomato-beef-stew', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '番茄土豆炖牛肉', videoSearchAliases: ['番茄土豆牛肉'], time: 40, calories: 560, protein: 38, ingredients: ['瘦牛肉', '番茄', '土豆', '胡萝卜'], goals: ['增肌', '保持健康'] },
  { id: 'pumpkin-steamed-chicken', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '南瓜蒸鸡胸肉', videoSearchAliases: ['南瓜蒸鸡肉'], time: 28, calories: 450, protein: 40, ingredients: ['鸡胸肉', '南瓜', '菌菇', '青菜'], goals: ['减脂', '增肌'] },
  { id: 'mushroom-steamed-chicken', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '香菇蒸鸡腿肉', videoSearchAliases: ['香菇蒸鸡腿', '香菇蒸滑鸡'], time: 30, calories: 510, protein: 39, ingredients: ['去皮鸡腿肉', '香菇', '木耳', '青菜'], goals: ['增肌', '保持健康'], sourceVideo: bilibiliVideo('BV1554y1J7g4', '厨师长教你香菇蒸滑鸡的家常做法，鲜香嫩滑', '美食作家王刚R', '从鸡肉处理、腌制到香菇蒸制的完整教程。') },
  { id: 'shrimp-scrambled-egg', meal: '午餐', group: '正餐', mealType: 'lunch', title: '虾仁滑蛋配杂粮饭', videoSearchAliases: ['虾仁滑蛋'], time: 15, calories: 490, protein: 34, ingredients: ['虾仁', '鸡蛋', '杂粮饭', '青菜'], goals: ['减脂', '增肌'], sourceVideo: douyinVideo('7417358970479824154', '鸡蛋的 12 种家常做法：虾仁滑蛋', '杰哥厨房', '视频第八道为虾仁滑蛋，包含虾仁腌制、蛋液调配和滑炒步骤。') },
  { id: 'asparagus-shrimp', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '芦笋炒虾仁', videoSearchAliases: ['芦笋虾仁', '芦笋炒虾仁'], time: 15, calories: 360, protein: 30, ingredients: ['虾仁', '芦笋', '彩椒', '玉米'], goals: ['减脂', '塑形'], sourceVideo: bilibiliVideo('BV1NZMTzKEFS', '这样做的芦笋炒虾仁绝了，色香味俱全', '美食强', '菜名一致的芦笋炒虾仁制作教程。') },
  { id: 'steamed-bass', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '清蒸鲈鱼配时蔬', videoSearchAliases: ['清蒸鲈鱼'], time: 25, calories: 420, protein: 40, ingredients: ['鲈鱼', '青菜', '胡萝卜', '糙米饭'], goals: ['减脂', '增肌', '保持健康'], sourceVideo: douyinVideo('7491322053539171596', '清蒸鲈鱼的正确方法', '庆阳强哥教做菜', '菜名一致的清蒸鲈鱼教程，讲解蒸制与白灼汁调味。') },
  { id: 'salmon-pumpkin-rice', meal: '午餐', group: '正餐', mealType: 'lunch', title: '三文鱼南瓜杂粮饭', videoSearchAliases: ['三文鱼南瓜饭'], time: 28, calories: 570, protein: 35, ingredients: ['三文鱼', '南瓜', '杂粮饭', '西兰花'], goals: ['增肌', '塑形'] },
  { id: 'chicken-quinoa-bowl', meal: '午餐', group: '正餐', mealType: 'lunch', title: '鸡胸藜麦能量碗', videoSearchAliases: ['鸡胸肉藜麦饭'], time: 25, calories: 540, protein: 41, ingredients: ['鸡胸肉', '藜麦', '生菜', '牛油果'], goals: ['减脂', '增肌'] },
  { id: 'mapo-tofu-lean', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '少油肉末麻婆豆腐', videoSearchAliases: ['肉末麻婆豆腐'], time: 22, calories: 470, protein: 30, ingredients: ['豆腐', '瘦肉末', '青菜', '杂粮饭'], goals: ['增肌', '保持健康'] },
  { id: 'tomato-egg-shrimp-noodle', meal: '午餐', group: '正餐', mealType: 'lunch', title: '番茄鸡蛋虾仁面', videoSearchAliases: ['番茄虾仁鸡蛋面'], time: 20, calories: 520, protein: 32, ingredients: ['番茄', '鸡蛋', '虾仁', '荞麦面'], goals: ['增肌', '保持健康'] },
  { id: 'cabbage-tofu-stew', meal: '晚餐', group: '素食', mealType: 'dinner', title: '白菜豆腐菌菇煲', videoSearchAliases: ['白菜豆腐煲'], time: 22, calories: 390, protein: 22, ingredients: ['白菜', '豆腐', '菌菇', '粉丝'], goals: ['减脂', '保持健康'], sourceVideo: douyinVideo('7576955901978938664', '暖呼呼的白菜豆腐煲，好吃又下饭', '袁锐（萌新的圆）', '菜名一致的白菜豆腐煲完整制作视频，可在原做法中加入菌菇。') },
  { id: 'eggplant-chicken', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '茄汁鸡肉末烧茄子', videoSearchAliases: ['鸡肉末烧茄子'], time: 25, calories: 460, protein: 34, ingredients: ['鸡肉末', '茄子', '番茄', '杂粮饭'], goals: ['减脂', '增肌'] },
  { id: 'pepper-pork-tenderloin', meal: '午餐', group: '正餐', mealType: 'lunch', title: '彩椒炒里脊肉', videoSearchAliases: ['彩椒炒肉丝'], time: 18, calories: 490, protein: 35, ingredients: ['猪里脊', '彩椒', '洋葱', '糙米饭'], goals: ['增肌', '塑形'] },
  { id: 'wintermelon-shrimp-soup', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '冬瓜虾仁豆腐汤', videoSearchAliases: ['冬瓜虾仁汤'], time: 20, calories: 350, protein: 29, ingredients: ['冬瓜', '虾仁', '豆腐', '玉米'], goals: ['减脂', '保持健康'] },
  { id: 'seaweed-tofu-egg-soup', meal: '晚餐', group: '素食', mealType: 'dinner', title: '紫菜豆腐鸡蛋汤', videoSearchAliases: ['紫菜豆腐蛋花汤'], time: 15, calories: 320, protein: 22, ingredients: ['紫菜', '豆腐', '鸡蛋', '青菜'], goals: ['减脂', '保持健康'] },
  { id: 'corn-yam-chicken-soup', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '玉米山药鸡肉汤', videoSearchAliases: ['山药玉米鸡汤'], time: 40, calories: 460, protein: 34, ingredients: ['鸡肉', '玉米', '山药', '胡萝卜'], goals: ['增肌', '保持健康'] },
  { id: 'mushroom-soba', meal: '晚餐', group: '素食', mealType: 'dinner', title: '菌菇青菜荞麦面', videoSearchAliases: ['菌菇荞麦面'], time: 18, calories: 430, protein: 20, ingredients: ['荞麦面', '菌菇', '青菜', '豆腐'], goals: ['减脂', '保持健康'] },
  { id: 'chickpea-curry', meal: '午餐', group: '素食', mealType: 'lunch', title: '鹰嘴豆南瓜咖喱饭', videoSearchAliases: ['鹰嘴豆南瓜咖喱'], time: 28, calories: 520, protein: 21, ingredients: ['鹰嘴豆', '南瓜', '糙米饭', '菠菜'], goals: ['塑形', '保持健康'] },
  { id: 'mango-chia-yogurt', meal: '加餐', group: '加餐', mealType: 'dessert', title: '芒果奇亚籽酸奶杯', videoSearchAliases: ['芒果奇亚籽酸奶'], time: 8, calories: 290, protein: 13, ingredients: ['芒果', '无糖酸奶', '奇亚籽', '燕麦'], goals: ['增肌', '保持健康'] },
  { id: 'douyin-chicken-salad', meal: '午餐', group: '正餐', mealType: 'lunch', title: '香煎鸡胸肉沙拉', videoSearchAliases: ['香煎鸡胸肉减脂沙拉', '鸡胸肉沙拉'], time: 20, calories: 450, protein: 40, ingredients: ['鸡胸肉', '羽衣甘蓝', '番茄', '黄瓜', '牛油果'], goals: ['减脂', '塑形'], sourceVideo: douyinVideo('7636384362929474816', '香煎鸡胸肉减脂沙拉', '熊熊饲养员', '展示鸡胸肉煎制与蔬菜沙拉组合的完整制作过程。') },
  { id: 'douyin-chicken-fried-rice', meal: '午餐', group: '正餐', mealType: 'lunch', title: '鸡胸肉蔬菜减脂炒饭', videoSearchAliases: ['鸡胸肉蔬菜减脂炒饭', '鸡胸肉炒饭'], time: 18, calories: 520, protein: 36, ingredients: ['鸡胸肉', '米饭', '鸡蛋', '黄瓜', '胡萝卜', '玉米'], goals: ['减脂', '增肌'], sourceVideo: douyinVideo('7221097927857491239', '鸡胸肉蔬菜减脂炒饭', '老默健身（健身餐）', '从备料到少油炒制的健身餐制作视频。') },
  { id: 'douyin-broccoli-chicken', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '西兰花炒鸡胸肉', videoSearchAliases: ['西兰花炒鸡胸肉', '鸡胸肉炒西兰花'], time: 16, calories: 410, protein: 39, ingredients: ['鸡胸肉', '西兰花', '彩椒', '杂粮饭'], goals: ['减脂', '增肌', '塑形'], sourceVideo: douyinVideo('7125036796890713344', '西兰花炒鸡胸肉低卡家常做法', '晴晴妈教美食', '西兰花与鸡胸肉的低油家常炒制教程。') },
  { id: 'douyin-stirfry-tofu', meal: '晚餐', group: '素食', mealType: 'dinner', title: '健身餐小炒豆腐', videoSearchAliases: ['小炒豆腐', '小炒千页豆腐'], time: 15, calories: 390, protein: 24, ingredients: ['豆腐', '青椒', '木耳', '杂粮饭'], goals: ['减脂', '保持健康'], sourceVideo: douyinVideo('7286415783532530979', '健身餐小炒豆腐做法', '真滴好吃的二轩', '小炒豆腐的备料与炒制步骤。') },
  { id: 'douyin-chicken-cabbage', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '鸡胸肉炒包菜', videoSearchAliases: ['鸡胸肉炒包菜', '鸡肉包菜'], time: 16, calories: 400, protein: 38, ingredients: ['鸡胸肉', '包菜', '西兰花', '玉米'], goals: ['减脂', '塑形'], sourceVideo: douyinVideo('7532058146686684475', '鸡胸肉炒包菜与凉拌西兰花减脂餐', '永吉麻麻', '一餐包含鸡胸肉炒包菜和凉拌西兰花两个明确做法。') },
  { id: 'douyin-yuanbao-tofu', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '元宝豆腐', videoSearchAliases: ['元宝豆腐', '肉酿豆腐'], time: 35, calories: 500, protein: 30, ingredients: ['豆腐', '瘦猪肉', '西兰花', '番茄'], goals: ['增肌', '保持健康'], sourceVideo: douyinVideo('7238557310061251895', '元宝豆腐完整制作教程', '聚珍大酒店范文珍', '豆腐填馅、定型、烹饪和番茄调味的完整过程。') },
  { id: 'douyin-tomato-egg', meal: '午餐', group: '正餐', mealType: 'lunch', title: '番茄炒鸡蛋', videoSearchAliases: ['番茄炒蛋', '西红柿炒鸡蛋'], time: 12, calories: 390, protein: 20, ingredients: ['番茄', '鸡蛋', '杂粮饭', '青菜'], goals: ['减脂', '保持健康'], sourceVideo: douyinVideo('7575053309933800713', '经典家常番茄炒蛋完整做法', 'Ricky讲煮讲食', '从炒蛋、炒番茄到混合调味的完整演示。') },
  { id: 'douyin-yam-fungus', meal: '晚餐', group: '素食', mealType: 'dinner', title: '木耳炒山药', videoSearchAliases: ['木耳炒山药', '山药炒木耳', '木耳山药'], time: 15, calories: 350, protein: 14, ingredients: ['木耳', '山药', '彩椒', '豆腐'], goals: ['减脂', '保持健康'], sourceVideo: douyinVideo('7598016733894544674', '鸡蛋豆腐、木耳山药等四道家常菜', '山东卫视', '视频中包含木耳炒山药的分步做法。') },
  { id: 'douyin-pea-egg', meal: '早餐', group: '素食', mealType: 'breakfast', title: '豌豆滑蛋', videoSearchAliases: ['豌豆滑蛋'], time: 12, calories: 370, protein: 23, ingredients: ['豌豆', '鸡蛋', '牛奶', '全麦面包'], goals: ['增肌', '保持健康'], sourceVideo: douyinVideo('7360214224808840483', '豌豆滑蛋、鸡蛋豆腐等家常素菜', '天天家常菜', '视频中包含豌豆滑蛋的制作方法。') },
  { id: 'douyin-egg-tofu', meal: '晚餐', group: '素食', mealType: 'dinner', title: '鸡蛋豆腐', videoSearchAliases: ['鸡蛋豆腐'], time: 18, calories: 410, protein: 27, ingredients: ['鸡蛋', '豆腐', '番茄', '青菜'], goals: ['减脂', '增肌', '保持健康'], sourceVideo: douyinVideo('7417358970479824154', '鸡蛋的 12 种家常做法', '杰哥厨房', '视频中包含鸡蛋豆腐的详细做法。') },
];

function expandExtraInspiration(seed: ExtraInspirationSeed): HealthInspiration {
  const mealContext = seed.group === '早餐' ? '早餐' : seed.group === '加餐' ? '加餐' : '一餐';
  return {
    ...seed,
    description: `${seed.title}把${seed.ingredients.slice(0, 3).join('、')}组合进${mealContext}，可以按当天训练量调整主食份量。`,
    image: EXTRA_IMAGES[seed.group],
    highlights: seed.group === '素食' ? ['植物性食材', '完整搭配', '步骤清晰'] : ['食材多样', '蛋白质搭配', '适合日常制作'],
    bestFor: seed.group === '加餐' ? '两餐之间按饥饿程度选择的人' : '希望把健康饮食落实到日常做饭的人',
  };
}

const BASE_INSPIRATIONS: HealthInspiration[] = [
  {
    id: 'oat-breakfast', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '牛奶燕麦坚果碗',
    videoSearchAliases: ['牛奶燕麦碗', '燕麦坚果碗'],
    description: '不用开火也能完成的组合早餐，用燕麦、奶类、水果和少量坚果构成更完整的一餐。',
    time: 10, calories: 430, protein: 18,
    image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=84',
    ingredients: ['牛奶', '燕麦', '香蕉', '原味坚果', '鸡蛋'], goals: ['减脂', '保持健康'],
    highlights: ['复合碳水', '奶类与蛋白质', '坚果控制份量'], bestFor: '早晨时间紧、希望稳定饱腹感的人',
  },
  {
    id: 'chicken-lunch', meal: '午餐', group: '正餐', mealType: 'lunch', title: '彩蔬鸡胸糙米饭',
    videoSearchAliases: ['鸡胸肉糙米饭', '鸡胸糙米饭'],
    description: '一份包含主食、优质蛋白和多色蔬菜的训练日正餐，食材可以按家中库存替换。',
    time: 25, calories: 560, protein: 38,
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=84',
    ingredients: ['鸡胸肉', '糙米', '西兰花', '彩椒', '鸡蛋'], goals: ['减脂', '增肌', '塑形'],
    highlights: ['高蛋白', '蔬菜多样', '训练日主食'], bestFor: '力量训练日或需要提前备餐的人',
  },
  {
    id: 'salmon-dinner', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '香煎三文鱼时蔬',
    videoSearchAliases: ['香煎三文鱼'],
    sourceVideo: bilibiliVideo('BV1HTUrBzEvJ', '【一锅出料理】香煎三文鱼佐焖时蔬｜完美火候把控技巧分享', '美威水产', '完整演示香煎三文鱼和时蔬的一锅制作过程。'),
    description: '鱼类搭配薯类和绿叶菜，适合作为不想吃得太复杂的完整晚餐。',
    time: 30, calories: 520, protein: 34,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=84',
    ingredients: ['三文鱼', '菠菜', '土豆', '柠檬', '原味坚果'], goals: ['增肌', '塑形', '保持健康'],
    highlights: ['鱼类蛋白质', '薯类主食', '深色蔬菜'], bestFor: '晚间训练后或希望增加鱼类摄入的人',
  },
  {
    id: 'yogurt-snack', meal: '加餐', group: '加餐', mealType: 'dessert', title: '酸奶水果坚果杯',
    videoSearchAliases: ['酸奶水果杯', '水果坚果酸奶杯'],
    description: '用原味酸奶、水果和少量坚果替代高糖甜品，适合两餐之间按饥饿程度选择。',
    time: 8, calories: 280, protein: 13,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=84',
    ingredients: ['无糖酸奶', '草莓', '蓝莓', '原味坚果'], goals: ['增肌', '保持健康'],
    highlights: ['无需烹饪', '水果与乳制品', '少精制糖'], bestFor: '想吃甜味但不想选择高糖零食的人',
  },
  {
    id: 'tomato-tofu-soup', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '番茄豆腐虾仁汤',
    videoSearchAliases: ['番茄虾仁豆腐汤'],
    description: '家常汤菜里同时放入豆制品、虾仁和蔬菜，搭配一份主食就是完整一餐。',
    time: 22, calories: 390, protein: 32,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=84',
    ingredients: ['番茄', '豆腐', '虾仁', '青菜', '玉米'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['双来源蛋白质', '一锅完成', '适合配主食'], bestFor: '喜欢热汤、希望少洗锅具的人',
  },
  {
    id: 'egg-wrap', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '全麦鸡蛋蔬菜卷',
    videoSearchAliases: ['鸡蛋蔬菜卷饼', '全麦蔬菜鸡蛋卷'],
    description: '把鸡蛋和蔬菜卷进全麦饼，方便携带，也能按计划补充肉类或豆制品。',
    time: 15, calories: 410, protein: 21,
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=900&q=84',
    ingredients: ['全麦饼', '鸡蛋', '生菜', '番茄', '奶酪'], goals: ['减脂', '增肌', '保持健康'],
    highlights: ['方便携带', '蔬菜早餐', '可灵活加料'], bestFor: '通勤、上课或需要带走早餐的人',
  },
  {
    id: 'tofu-grain-bowl', meal: '午餐', group: '素食', mealType: 'lunch', title: '豆腐菌菇杂粮饭',
    videoSearchAliases: ['菌菇豆腐杂粮饭'],
    description: '豆腐、菌菇、杂粮和绿叶菜组成的植物友好正餐，调味可以保持简单。',
    time: 28, calories: 500, protein: 24,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=84',
    ingredients: ['豆腐', '菌菇', '杂粮饭', '青菜', '毛豆'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['植物蛋白', '全谷杂粮', '高食物多样性'], bestFor: '希望增加植物性食物比例的人',
  },
  {
    id: 'pumpkin-oat-cup', meal: '加餐', group: '加餐', mealType: 'dessert', title: '南瓜酸奶燕麦杯',
    videoSearchAliases: ['南瓜燕麦酸奶杯'],
    description: '南瓜泥和燕麦带来自然甜味，搭配原味酸奶，适合作为训练后的轻加餐。',
    time: 18, calories: 310, protein: 15,
    image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=84',
    ingredients: ['南瓜', '无糖酸奶', '燕麦', '牛奶', '肉桂粉'], goals: ['增肌', '塑形', '保持健康'],
    highlights: ['自然甜味', '训练后加餐', '可提前准备'], bestFor: '需要提前备好加餐或喜欢软糯口感的人',
  },
  {
    id: 'beef-pepper-bowl', meal: '午餐', group: '正餐', mealType: 'lunch', title: '彩椒牛肉藜麦饭',
    videoSearchAliases: ['彩椒牛肉饭', '牛肉藜麦饭'],
    description: '瘦牛肉、彩椒与藜麦组成的训练日正餐，也可以用糙米或杂粮饭替换。',
    time: 28, calories: 590, protein: 39,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=84',
    ingredients: ['瘦牛肉', '彩椒', '藜麦', '洋葱', '青菜'], goals: ['增肌', '塑形'],
    highlights: ['高蛋白正餐', '多色蔬菜', '训练日碳水'], bestFor: '希望正餐更有饱腹感、训练量较高的人',
  },
  {
    id: 'tuna-egg-sandwich', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '金枪鱼鸡蛋全麦三明治',
    videoSearchAliases: ['金枪鱼鸡蛋三明治'],
    sourceVideo: bilibiliVideo('BV1i64y1b7Rp', '全麦金枪鱼鸡蛋三明治', '初霁chuji_', '全麦金枪鱼鸡蛋三明治制作教程。'),
    description: '全麦面包夹鸡蛋、金枪鱼和生菜，适合提前准备并带走。',
    time: 12, calories: 450, protein: 30,
    image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=900&q=84',
    ingredients: ['全麦面包', '金枪鱼', '鸡蛋', '生菜', '番茄'], goals: ['减脂', '增肌', '塑形'],
    highlights: ['便携早餐', '优质蛋白', '蔬菜夹层'], bestFor: '通勤、上课或晨练后需要快速进餐的人',
  },
  {
    id: 'shrimp-tofu-bowl', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '虾仁豆腐菌菇煲',
    videoSearchAliases: ['虾仁豆腐煲', '菌菇虾仁豆腐煲', '鲜虾豆腐煲'],
    sourceVideo: bilibiliVideo('BV1dg4y1w7M1', '鲜虾豆腐煲，二十分钟完成一锅', '一颗糯栗子', '鲜虾豆腐煲的完整家常制作教程，可按灵感加入菌菇。'),
    description: '虾仁、豆腐与菌菇一锅完成，配少量米饭或玉米即可成为完整晚餐。',
    time: 24, calories: 430, protein: 35,
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=84',
    ingredients: ['虾仁', '豆腐', '菌菇', '青菜', '玉米'], goals: ['减脂', '增肌', '保持健康'],
    highlights: ['双来源蛋白质', '一锅完成', '适合配主食'], bestFor: '想做热菜但不希望步骤太复杂的人',
  },
  {
    id: 'banana-milk-smoothie', meal: '加餐', group: '加餐', mealType: 'dessert', title: '香蕉牛奶燕麦昔',
    videoSearchAliases: ['香蕉燕麦奶昔', '香蕉牛奶燕麦奶昔'],
    description: '香蕉、牛奶与燕麦打成浓稠饮品，训练前后按当天总量选择。',
    time: 6, calories: 320, protein: 14,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=84',
    ingredients: ['牛奶', '香蕉', '燕麦', '原味坚果'], goals: ['增肌', '保持健康'],
    highlights: ['快速补充', '奶类与水果', '可调浓稠度'], bestFor: '食欲较小但训练后需要补充的人',
  },
  {
    id: 'chickpea-salad', meal: '午餐', group: '素食', mealType: 'lunch', title: '鹰嘴豆彩蔬沙拉',
    videoSearchAliases: ['鹰嘴豆蔬菜沙拉'],
    description: '鹰嘴豆搭配多色蔬菜和薯类，适合希望增加豆类摄入的轻正餐。',
    time: 18, calories: 470, protein: 20,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=84',
    ingredients: ['鹰嘴豆', '彩椒', '黄瓜', '番茄', '红薯'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['豆类蛋白', '食物多样', '适合备餐'], bestFor: '想提高植物性食物比例、喜欢清爽口感的人',
  },
  {
    id: 'sesame-tofu-noodles', meal: '晚餐', group: '素食', mealType: 'dinner', title: '芝麻豆腐荞麦面',
    videoSearchAliases: ['豆腐荞麦面'],
    description: '荞麦面配豆腐和青菜，调味不过重也能兼顾口感与完整度。',
    time: 20, calories: 510, protein: 25,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=84',
    ingredients: ['荞麦面', '豆腐', '青菜', '胡萝卜', '芝麻酱'], goals: ['塑形', '保持健康'],
    highlights: ['植物蛋白', '面食正餐', '蔬菜搭配'], bestFor: '偏爱面食、又希望一餐结构更完整的人',
  },
  {
    id: 'egg-veggie-congee', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '鸡蛋蔬菜杂粮粥',
    videoSearchAliases: ['鸡蛋蔬菜粥', '蔬菜鸡蛋粥'],
    description: '杂粮粥里加入鸡蛋和切碎蔬菜，温热柔和，也方便按食量搭配一份水果。',
    time: 22, calories: 360, protein: 17,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=84',
    ingredients: ['杂粮米', '鸡蛋', '胡萝卜', '青菜', '香菇'], goals: ['减脂', '保持健康'],
    highlights: ['温热早餐', '谷物与蛋类', '蔬菜入粥'], bestFor: '晨起偏爱热食或希望早餐更柔和的人',
  },
  {
    id: 'chicken-vegetable-stirfry', meal: '午餐', group: '正餐', mealType: 'lunch', title: '鸡胸肉炒时蔬',
    videoSearchAliases: ['时蔬炒鸡胸肉', '鸡胸肉炒杂蔬'],
    description: '鸡胸肉与当季蔬菜快速翻炒，搭配米饭、玉米或薯类即可组成训练日正餐。',
    time: 20, calories: 480, protein: 39,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=84',
    ingredients: ['鸡胸肉', '西兰花', '彩椒', '胡萝卜', '糙米饭'], goals: ['减脂', '增肌', '塑形'],
    highlights: ['高蛋白', '快手翻炒', '蔬菜可替换'], bestFor: '需要快速备餐、又希望蔬菜量充足的人',
  },
  {
    id: 'tomato-beef-noodles', meal: '午餐', group: '正餐', mealType: 'lunch', title: '番茄牛肉荞麦面',
    videoSearchAliases: ['番茄牛肉面', '番茄肥牛荞麦面'],
    description: '番茄汤底搭配瘦牛肉和荞麦面，加入青菜后成为结构完整的一碗面。',
    time: 25, calories: 550, protein: 36,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=84',
    ingredients: ['番茄', '瘦牛肉', '荞麦面', '青菜', '菌菇'], goals: ['增肌', '塑形', '保持健康'],
    highlights: ['汤面正餐', '牛肉蛋白质', '蔬菜搭配'], bestFor: '训练后想吃热汤面、又希望控制搭配的人',
  },
  {
    id: 'tofu-egg-custard', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '豆腐虾仁蒸蛋',
    videoSearchAliases: ['虾仁豆腐蒸蛋', '豆腐蒸蛋'],
    sourceVideo: bilibiliVideo('BV1dV4y1m7a7', '今日减脂菜单——豆腐虾仁蒸蛋，超嫩滑！', '给谷先生的减脂餐', '豆腐虾仁蒸蛋的完整制作步骤。'),
    description: '鸡蛋、嫩豆腐和虾仁一锅蒸熟，口感软嫩，配蔬菜和少量主食即可。',
    time: 20, calories: 380, protein: 31,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=84',
    ingredients: ['鸡蛋', '嫩豆腐', '虾仁', '青菜', '玉米'], goals: ['减脂', '增肌', '保持健康'],
    highlights: ['蒸制少油', '多来源蛋白质', '口感软嫩'], bestFor: '晚餐想吃清淡热食或不想复杂炒制的人',
  },
  {
    id: 'salmon-avocado-sandwich', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '三文鱼牛油果全麦三明治',
    videoSearchAliases: ['三文鱼牛油果三明治'],
    description: '全麦面包夹三文鱼、牛油果和生菜，适合提前准备的便携早餐或轻午餐。',
    time: 12, calories: 490, protein: 27,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=84',
    ingredients: ['全麦面包', '三文鱼', '牛油果', '生菜', '番茄'], goals: ['增肌', '塑形', '保持健康'],
    highlights: ['便携组合', '鱼类蛋白质', '全谷主食'], bestFor: '通勤或晨练后需要快速进餐的人',
  },
  {
    id: 'sweet-potato-yogurt', meal: '加餐', group: '加餐', mealType: 'dessert', title: '红薯酸奶坚果杯',
    videoSearchAliases: ['红薯酸奶杯', '紫薯酸奶坚果杯'],
    description: '蒸熟红薯搭配原味酸奶和少量坚果，甜味自然，适合提前冷藏准备。',
    time: 18, calories: 300, protein: 12,
    image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=84',
    ingredients: ['红薯', '无糖酸奶', '原味坚果', '蓝莓'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['自然甜味', '薯类加餐', '可提前准备'], bestFor: '下午容易饿、想用完整食物替代甜品的人',
  },
  {
    id: 'shrimp-quinoa-salad', meal: '午餐', group: '正餐', mealType: 'lunch', title: '虾仁藜麦彩蔬沙拉',
    videoSearchAliases: ['虾仁藜麦沙拉', '藜麦虾仁沙拉'],
    description: '虾仁、藜麦与多色蔬菜组成清爽正餐，酱汁单独放更适合提前备餐。',
    time: 22, calories: 460, protein: 32,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=84',
    ingredients: ['虾仁', '藜麦', '生菜', '彩椒', '黄瓜'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['海鲜蛋白质', '全谷搭配', '多色蔬菜'], bestFor: '喜欢清爽口感或需要带饭的人',
  },
  {
    id: 'mushroom-chicken-soup', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '菌菇鸡肉蔬菜汤',
    videoSearchAliases: ['鸡肉菌菇汤', '菌菇鸡胸肉汤'],
    description: '鸡肉、菌菇和蔬菜慢煮成一锅热汤，搭配玉米或杂粮饭就是完整晚餐。',
    time: 30, calories: 420, protein: 35,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=84',
    ingredients: ['鸡胸肉', '菌菇', '胡萝卜', '青菜', '玉米'], goals: ['减脂', '增肌', '保持健康'],
    highlights: ['一锅完成', '温热晚餐', '蔬菜与蛋白质'], bestFor: '天气偏凉或晚餐希望简单少油的人',
  },
  {
    id: 'black-sesame-oat-milk', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '黑芝麻燕麦牛奶糊',
    videoSearchAliases: ['黑芝麻燕麦糊', '黑芝麻燕麦奶'],
    description: '黑芝麻、燕麦和牛奶打成温热浓糊，搭配鸡蛋或水果能让早餐更完整。',
    time: 12, calories: 350, protein: 15,
    image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=84',
    ingredients: ['黑芝麻', '燕麦', '牛奶', '香蕉', '鸡蛋'], goals: ['增肌', '保持健康'],
    highlights: ['温热饮食', '谷物与奶类', '快速制作'], bestFor: '早餐食欲较小、偏爱顺滑口感的人',
  },
  {
    id: 'broccoli-beef-bowl', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '西兰花牛肉杂粮饭',
    videoSearchAliases: ['西兰花炒牛肉', '牛肉西兰花杂粮饭'],
    description: '瘦牛肉与西兰花快炒，配一份杂粮饭，适合力量训练日补充正餐。',
    time: 24, calories: 570, protein: 40,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=84',
    ingredients: ['瘦牛肉', '西兰花', '杂粮饭', '彩椒', '洋葱'], goals: ['增肌', '塑形'],
    highlights: ['高蛋白正餐', '力量训练日', '荤素搭配'], bestFor: '训练量较高、希望正餐更有饱腹感的人',
  },
  ...EXTRA_INSPIRATION_SEEDS.map(expandExtraInspiration),
];

export const HEALTH_INSPIRATIONS: HealthInspiration[] = BASE_INSPIRATIONS.map((inspiration) => {
  // 有真实食物封面的菜（B站封面 / 抖音封面）覆盖共享占位图
  const resolved = RESOLVED_IMAGES[inspiration.id];
  return resolved ? { ...inspiration, image: resolved } : inspiration;
});

export function findHealthInspiration(id?: string) {
  return HEALTH_INSPIRATIONS.find((item) => item.id === id);
}
