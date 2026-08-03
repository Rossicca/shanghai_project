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
  title: string;
  coach: string;
  duration: number; // 秒
  difficulty: '入门' | '进阶' | '挑战';
  category: WorkoutCategory;
  /** 预估每节消耗（千卡） */
  calories: number;
  /** 封面主题色（本地无真实视频时用于生成示范封面） */
  coverColor: string;
  /** 真实视频地址，可空（空则用示范动画代替） */
  source?: string;
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
