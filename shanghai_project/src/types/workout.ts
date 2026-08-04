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
  type: '减脂' | '增肌' | '塑形' | '保持健康';
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

export interface WorkoutPlanInput {
  goalType: 'lose_fat' | 'gain_muscle' | 'shape' | 'maintain';
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  workoutLocation: 'home' | 'gym' | 'outdoor';
  hasEquipment: boolean;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  limitations: string[];
}

export interface WorkoutPlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
  videoId: string | null;
  videoUrl: string | null;
}

export interface WorkoutPlan {
  planId: string;
  goalType: WorkoutPlanInput['goalType'];
  summary: string;
  weeklySchedule: {
    day: number;
    title: string;
    durationMinutes: number;
    exercises: WorkoutPlanExercise[];
  }[];
  reminders: string[];
  disclaimer: string;
  createdAt: string;
}
