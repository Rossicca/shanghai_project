import type { BodyData, FitnessGoal } from '@/types/workout';

/** 估算每日目标热量（Mifflin-St Jeor 基础代谢 × 活动系数 1.4），减脂/增肌微调 */
export function estimateTargetCalories(bodyData: BodyData | null, goal: FitnessGoal | null): number | undefined {
  if (!bodyData) return undefined;
  const s = bodyData.gender === '男' ? 5 : -161;
  const bmr = 10 * bodyData.weight + 6.25 * bodyData.height - 5 * bodyData.age + s;
  const base = bmr * 1.4;
  if (goal?.type === '减脂') return Math.round(base * 0.85);
  if (goal?.type === '增肌') return Math.round(base * 1.1);
  return Math.round(base);
}

export function calcBMI(bodyData: BodyData | null): number | null {
  if (!bodyData || bodyData.height <= 0) return null;
  return bodyData.weight / (bodyData.height / 100) ** 2;
}
