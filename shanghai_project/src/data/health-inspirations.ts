import type { FitnessGoal } from '@/types/workout';

export type HealthInspiration = {
  id: string;
  meal: string;
  group: '早餐' | '正餐' | '加餐' | '素食';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'dessert';
  title: string;
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

export const HEALTH_INSPIRATIONS: HealthInspiration[] = [
  {
    id: 'oat-breakfast', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '牛奶燕麦坚果碗',
    description: '不用开火也能完成的组合早餐，用燕麦、奶类、水果和少量坚果构成更完整的一餐。',
    time: 10, calories: 430, protein: 18,
    image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=84',
    ingredients: ['牛奶', '燕麦', '香蕉', '原味坚果', '鸡蛋'], goals: ['减脂', '保持健康'],
    highlights: ['复合碳水', '奶类与蛋白质', '坚果控制份量'], bestFor: '早晨时间紧、希望稳定饱腹感的人',
  },
  {
    id: 'chicken-lunch', meal: '午餐', group: '正餐', mealType: 'lunch', title: '彩蔬鸡胸糙米饭',
    description: '一份包含主食、优质蛋白和多色蔬菜的训练日正餐，食材可以按家中库存替换。',
    time: 25, calories: 560, protein: 38,
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=84',
    ingredients: ['鸡胸肉', '糙米', '西兰花', '彩椒', '鸡蛋'], goals: ['减脂', '增肌', '塑形'],
    highlights: ['高蛋白', '蔬菜多样', '训练日主食'], bestFor: '力量训练日或需要提前备餐的人',
  },
  {
    id: 'salmon-dinner', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '香煎三文鱼时蔬',
    description: '鱼类搭配薯类和绿叶菜，适合作为不想吃得太复杂的完整晚餐。',
    time: 30, calories: 520, protein: 34,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=84',
    ingredients: ['三文鱼', '菠菜', '土豆', '柠檬', '原味坚果'], goals: ['增肌', '塑形', '保持健康'],
    highlights: ['鱼类蛋白质', '薯类主食', '深色蔬菜'], bestFor: '晚间训练后或希望增加鱼类摄入的人',
  },
  {
    id: 'yogurt-snack', meal: '加餐', group: '加餐', mealType: 'dessert', title: '酸奶水果坚果杯',
    description: '用原味酸奶、水果和少量坚果替代高糖甜品，适合两餐之间按饥饿程度选择。',
    time: 8, calories: 280, protein: 13,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=84',
    ingredients: ['无糖酸奶', '草莓', '蓝莓', '原味坚果'], goals: ['增肌', '保持健康'],
    highlights: ['无需烹饪', '水果与乳制品', '少精制糖'], bestFor: '想吃甜味但不想选择高糖零食的人',
  },
  {
    id: 'tomato-tofu-soup', meal: '晚餐', group: '正餐', mealType: 'dinner', title: '番茄豆腐虾仁汤',
    description: '家常汤菜里同时放入豆制品、虾仁和蔬菜，搭配一份主食就是完整一餐。',
    time: 22, calories: 390, protein: 32,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=84',
    ingredients: ['番茄', '豆腐', '虾仁', '青菜', '玉米'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['双来源蛋白质', '一锅完成', '适合配主食'], bestFor: '喜欢热汤、希望少洗锅具的人',
  },
  {
    id: 'egg-wrap', meal: '早餐', group: '早餐', mealType: 'breakfast', title: '全麦鸡蛋蔬菜卷',
    description: '把鸡蛋和蔬菜卷进全麦饼，方便携带，也能按计划补充肉类或豆制品。',
    time: 15, calories: 410, protein: 21,
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=900&q=84',
    ingredients: ['全麦饼', '鸡蛋', '生菜', '番茄', '奶酪'], goals: ['减脂', '增肌', '保持健康'],
    highlights: ['方便携带', '蔬菜早餐', '可灵活加料'], bestFor: '通勤、上课或需要带走早餐的人',
  },
  {
    id: 'tofu-grain-bowl', meal: '午餐', group: '素食', mealType: 'lunch', title: '豆腐菌菇杂粮饭',
    description: '豆腐、菌菇、杂粮和绿叶菜组成的植物友好正餐，调味可以保持简单。',
    time: 28, calories: 500, protein: 24,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=84',
    ingredients: ['豆腐', '菌菇', '杂粮饭', '青菜', '毛豆'], goals: ['减脂', '塑形', '保持健康'],
    highlights: ['植物蛋白', '全谷杂粮', '高食物多样性'], bestFor: '希望增加植物性食物比例的人',
  },
  {
    id: 'pumpkin-oat-cup', meal: '加餐', group: '加餐', mealType: 'dessert', title: '南瓜酸奶燕麦杯',
    description: '南瓜泥和燕麦带来自然甜味，搭配原味酸奶，适合作为训练后的轻加餐。',
    time: 18, calories: 310, protein: 15,
    image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=84',
    ingredients: ['南瓜', '无糖酸奶', '燕麦', '牛奶', '肉桂粉'], goals: ['增肌', '塑形', '保持健康'],
    highlights: ['自然甜味', '训练后加餐', '可提前准备'], bestFor: '需要提前备好加餐或喜欢软糯口感的人',
  },
];

export function findHealthInspiration(id?: string) {
  return HEALTH_INSPIRATIONS.find((item) => item.id === id);
}
