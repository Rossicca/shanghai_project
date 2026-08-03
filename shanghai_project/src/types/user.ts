import type { BodyData, FitnessGoal } from './workout';

/** 用户（demo 阶段本地游客模式） */
export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  gender?: '男' | '女';
  birthDate?: string;
  /** 饮食偏好 */
  dietPreference?: string;
  /** 菜系偏好 */
  cuisinePreference?: string[];
  /** 忌口/过敏源 */
  allergens?: string[];
}

/** 用户完整状态（含身体数据与目标） */
export interface UserState extends User {
  bodyData: BodyData | null;
  goal: FitnessGoal | null;
}
