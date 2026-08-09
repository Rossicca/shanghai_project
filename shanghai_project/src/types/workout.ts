/** 跟练视频分类 */
export type WorkoutCategory =
  | '全身燃脂'
  | '臀腿'
  | '肩背'
  | '手臂'
  | '核心'
  | '有氧'
  | '拉伸';

/** 跟练视频 */
export interface WorkoutVideo {
  id: string;
  historyId?: string;
  completedAt?: number;
  title: string;
  coach: string;
  duration: number; // 秒
  difficulty: '入门' | '进阶' | '挑战';
  category: WorkoutCategory;
  /** 预估每节消耗（千卡） */
  calories: number;
  /** 封面主题色（本地无真实视频时用于生成示范封面） */
  coverColor: string;
  /** 原视频封面（B站/YouTube 缩略图），可空 */
  coverUrl?: string | null;
  /** 真实视频地址，可空（空则用示范动画代替） */
  source?: string;
  /** 外部跳转链接（B站/YouTube 搜索页或视频页） */
  sourceUrl?: string;
  /** 视频平台 */
  platform?: 'bilibili' | 'youtube' | 'douyin';
  /** 封面原始方向，用于避免横图被裁成竖图或反之 */
  coverOrientation?: 'portrait' | 'landscape' | 'square';
  /** AI 推荐理由 */
  reason: string;
  /** AI 排序时使用的内容类型 */
  contentType?: '跟练训练' | '动作教学' | '热身与恢复' | '健身知识' | '健康成果';
  /** 当前推荐是如何得出的 */
  recommendationBasis?: string;
  tags?: string[];
}

/** 身体数据 */
export interface BodyData {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: '男' | '女';
  bodyFat?: number; // %
  chest?: number; // cm
  waist?: number; // cm
  hip?: number; // cm
  upperArm?: number; // cm
  thigh?: number; // cm
  calf?: number; // cm
}

/** 健身目标 */
export interface FitnessGoal {
  type: '减脂' | '增肌' | '塑形' | '保持健康';
  types?: ('减脂' | '增肌' | '塑形' | '保持健康')[];
  targetWeight?: number;
  deadline?: string;
  weeklyFrequency?: number;
}

/** 运动推荐请求 */
export interface WorkoutRecommendParams {
  bodyData?: BodyData | null;
  goal?: FitnessGoal;
  preference?: {
    duration?: number; // 每节偏好时长（分钟）
    location?: '家' | '健身房';
    hasEquipment?: boolean;
  };
  limit?: number;
}

export type WorkoutGoalType = 'lose_fat' | 'gain_muscle' | 'shape' | 'maintain';

export interface WorkoutPlanInput {
  goalType: WorkoutGoalType;
  goalTypes: WorkoutGoalType[];
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  workoutLocation: 'home' | 'gym' | 'outdoor';
  hasEquipment: boolean;
  equipment: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  trainingMode: 'gentle' | 'balanced' | 'progressive';
  limitations: string[];
  preferredTraining: string[];
  dietaryPreferences: string[];
  allergies: string[];
  mealsPerDay: number;
  mealPrepTime: number;
  foodBudget: 'economy' | 'balanced' | 'flexible';
  cookingFrequency: 'rare' | 'sometimes' | 'often';
  kitchenTools: string[];
  flavorPreferences: string[];
  staplePreferences: string[];
}

export interface WorkoutPlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
  videoId: string | null;
  videoUrl: string | null;
  videoTitle?: string | null;
  videoPlatform?: 'bilibili' | 'douyin' | null;
}

export interface WorkoutPlanActivity {
  name: string;
  durationSeconds: number;
  notes: string;
  videoId: string | null;
  videoUrl: string | null;
  videoTitle?: string | null;
  videoPlatform?: 'bilibili' | 'douyin' | null;
}

export interface WorkoutPlan {
  planId: string;
  goalType: WorkoutPlanInput['goalType'];
  goalTypes?: WorkoutGoalType[];
  summary: string;
  weeklySchedule: {
    day: number;
    title: string;
    durationMinutes: number;
    warmup: WorkoutPlanActivity[];
    exercises: WorkoutPlanExercise[];
    cooldown: WorkoutPlanActivity[];
  }[];
  nutritionSummary?: string;
  nutritionTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  } | null;
  mealSuggestions?: {
    mealType: string;
    name: string;
    reason: string;
    ingredients: string[];
  }[];
  dietPlan?: {
    day: number;
    trainingDay: boolean;
    focus: string;
    meals: {
      mealType: string;
      name: string;
      reason: string;
      ingredients: string[];
    }[];
  }[];
  profileAnalysis?: {
    bmi: number | null;
    bmiCategory: string | null;
    dataCompleteness: number;
    goalStrategy: 'body_recomposition' | 'primary_plus_secondary' | 'single_goal';
    goalSummary: string;
    insights: string[];
  };
  profileSnapshot?: BodyData | null;
  planConditions?: {
    weeklyFrequency: number;
    sessionDurationMinutes: number;
    workoutLocation: WorkoutPlanInput['workoutLocation'];
    fitnessLevel: WorkoutPlanInput['fitnessLevel'];
    trainingMode?: WorkoutPlanInput['trainingMode'];
    equipment: string[];
    goalTypes?: WorkoutGoalType[];
    preferredTraining?: string[];
    dietaryPreferences?: string[];
    allergies?: string[];
    mealsPerDay?: number;
    mealPrepTime?: number;
    foodBudget?: WorkoutPlanInput['foodBudget'];
    cookingFrequency?: WorkoutPlanInput['cookingFrequency'];
    kitchenTools?: string[];
    flavorPreferences?: string[];
    staplePreferences?: string[];
  };
  isSaved?: boolean;
  isFavorite?: boolean;
  evidence?: {
    title: string;
    organization: string;
    url: string;
    note: string;
  }[];
  reminders: string[];
  disclaimer: string;
  generationMode?: 'ai' | 'safe_fallback' | 'demo';
  generationWarning?: string | null;
  createdAt: string;
}
