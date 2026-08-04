/** 识别出的食材 */
export interface Ingredient {
  id?: string;
  name: string;
  amount: string;
  confidence: number;
  category?: string;
  unit?: string;
}

/** 菜谱 */
export interface Recipe {
  id: string;
  /** 生成时间戳（毫秒），用于统计"今日摄入" */
  createdAt?: number;
  name: string;
  description: string;
  coverEmoji: string;
  calories: number; // 千卡
  protein: number; // 克
  carbs: number; // 克
  fat: number; // 克
  ingredients: { name: string; amount: string }[];
  steps: string[];
  cookTime: number; // 分钟
  difficulty: '简单' | '中等' | '困难';
  tips?: string[];
  servings?: number;
  nutritionTarget?: {
    targetCalories: number;
    calorieDiff: number;
    caloriePercentage: number;
    isAcceptable: boolean;
  } | null;
}

export interface RecipeVideo {
  id: string;
  title: string;
  author: string;
  duration: number;
  coverUrl?: string | null;
  sourceUrl: string;
  playCount?: number;
  reason: string;
  platform: 'bilibili';
}

export interface RecipeVideoRecommendation {
  query: string;
  searchUrl: string;
  platformSearches: {
    platform: 'bilibili' | 'douyin' | 'xiaohongshu' | 'youtube';
    label: string;
    url: string;
    resultType: 'video' | 'search';
  }[];
  rankingMode: 'ai' | 'search' | 'fallback';
  videos: RecipeVideo[];
  warning?: string | null;
}

/** 生成菜谱的请求参数 */
export interface RecipeGenerateParams {
  ingredients: { name: string; amount: string }[];
  people: number;
  cookTime: number;
  difficulty: '简单' | '中等' | '困难';
  /** 用户身体数据/目标（用于热量对比），可空 */
  user?: {
    caloriesTarget?: number;
    goal?: string;
  };
}
