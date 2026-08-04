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
  /** B站真实封面图 URL */
  coverUrl?: string | null;
  /** 真实视频地址，可空（空则用示范动画代替） */
  source?: string;
  /** 外部跳转链接（B站/YouTube 搜索页或视频页） */
  sourceUrl?: string;
  /** 视频平台 */
  platform?: 'bilibili' | 'youtube' | 'douyin';
  /** AI 推荐理由 */
  reason: string;
  tags?: string[];
}

/** 身体数据 */
export interface BodyData {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: '男' | '女';
  bodyFat?: number; // %
  waist?: number; // cm
  hip?: number; // cm
}

/** 健身目标 */
export interface FitnessGoal {
  types?: string[];              // 多选：['减脂', '增肌']
  type?: string;                 // 兼容旧版
  targetWeight?: number;
  deadline?: string;
  weeklyFrequency?: number;
  trainingStyle?: 'gentle' | 'moderate' | 'intense';  // 训练偏好
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

export interface WorkoutPlanInput {
  goalType: 'lose_fat' | 'gain_muscle' | 'shape' | 'maintain';
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  workoutLocation: 'home' | 'gym' | 'outdoor';
  hasEquipment: boolean;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  limitations: string[];
  bodyData?: {
    height: number;
    weight: number;
    age: number;
    gender: string;
    bmi?: number;
    bmr?: number;
    tdee?: number;
    targetCalories?: number;
    bodyFat?: number;
  };
  goal?: {
    type: string;
    targetWeight?: number;
  };
}

export interface PlanSection {
  name: string;
  duration?: string;
  notes: string;
}

export interface WorkoutPlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
  category?: string;
  searchKeyword?: string;
}

export interface WorkoutPlanDay {
  day: number;
  title: string;
  focusDescription?: string;
  durationMinutes: number;
  warmup?: PlanSection[];
  exercises: WorkoutPlanExercise[];
  stretching?: PlanSection[];
}

export interface WorkoutPlan {
  planId?: string;
  goalType: WorkoutPlanInput['goalType'];
  summary: string;
  weeklySchedule: WorkoutPlanDay[];
  restDays?: number[];
  reminders: string[];
  disclaimer?: string;
  createdAt?: string;
}
