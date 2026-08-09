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
  sourceVideo?: RecipeSourceVideo | null;
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
  generationMode?: 'ai' | 'safe_fallback' | 'demo';
  generationWarning?: string | null;
}

export interface RecipeSourceVideo {
  id: string;
  title: string;
  author: string;
  duration: number;
  coverUrl?: string | null;
  sourceUrl: string;
  description?: string;
  platform: 'bilibili' | 'douyin';
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
  platform: 'bilibili' | 'douyin';
}

export interface RecipeVideoRecommendation {
  query: string;
  searchUrl: string;
  platformSearches: {
    platform: 'bilibili' | 'douyin';
    label: string;
    url: string;
    resultType: 'video' | 'search';
  }[];
  rankingMode: 'ai' | 'search' | 'fallback';
  videos: RecipeVideo[];
  warning?: string | null;
}

/** AI 在生成完整步骤前给出的可选菜品/甜品/饮品方案。 */
export interface RecipeCandidate {
  id: string;
  name: string;
  coverEmoji: string;
  category: string;
  pantryLevel: 'existing' | 'topup' | 'explore';
  description: string;
  reason: string;
  availableIngredients: string[];
  missingIngredients: string[];
  cookTime: number;
  difficulty: '简单' | '中等' | '困难';
  estimatedCalories: number;
  sourceVideo: RecipeSourceVideo | null;
}

/** 生成菜谱的请求参数 */
export interface RecipeGenerateParams {
  ingredients: { name: string; amount: string }[];
  people: number;
  cookTime: number;
  difficulty: '简单' | '中等' | '困难';
  mealType: 'any' | 'breakfast' | 'lunch' | 'dinner' | 'dessert';
  /** 换一批时需要排除的历史菜名，避免 AI 重复上一批。 */
  excludeDishNames?: string[];
  selectedDish?: Pick<RecipeCandidate, 'name' | 'missingIngredients' | 'pantryLevel' | 'sourceVideo'>;
  /** 用户身体数据/目标（用于热量对比），可空 */
  user?: {
    caloriesTarget?: number;
    goal?: string;
    bodyData?: {
      height: number;
      weight: number;
      age: number;
      gender: string;
      bodyFat?: number;
      chest?: number;
      waist?: number;
      hip?: number;
      upperArm?: number;
      thigh?: number;
      calf?: number;
    };
  };
}
