import type { BodyData, FitnessGoal } from '@/types/workout';

/**
 * 体脂率估算（美国海军方法，基于围度）
 * 返回百分比，无数据时返回 null
 */
export function estimateBodyFat(body: BodyData | null): number | null {
  if (!body || !body.height || !body.weight) return null;
  const h = body.height;
  const w = body.weight;
  const waist = body.waist || (body.gender === '女' ? 70 : 85);
  const hip = body.hip || (body.gender === '女' ? 95 : 90);
  const neck = 37; // 默认颈围

  if (body.gender === '女') {
    // 女性: 495/(1.29579 - 0.35004*log10(waist+hip-neck) + 0.22100*log10(h)) - 450
    const v = Math.log10(waist + hip - neck);
    return 495 / (1.29579 - 0.35004 * v + 0.22100 * Math.log10(h)) - 450;
  }
  // 男性: 495/(1.0324 - 0.19077*log10(waist-neck) + 0.15456*log10(h)) - 450
  const v = Math.log10(waist - neck);
  return 495 / (1.0324 - 0.19077 * v + 0.15456 * Math.log10(h)) - 450;
}

/** BMI */
export function calcBMI(body: BodyData | null): number | null {
  if (!body || body.height <= 0) return null;
  return body.weight / (body.height / 100) ** 2;
}

/** BMI 中文标签 */
export function bmiLabel(bmi: number | null): string {
  if (bmi === null) return '未知';
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '偏胖';
  return '肥胖';
}

/** 理想体重范围（基于 BMI 18.5-24） */
export function idealWeightRange(heightCm: number): { min: number; max: number } {
  const h = heightCm / 100;
  return { min: Math.round(18.5 * h * h), max: Math.round(24 * h * h) };
}

/**
 * 基础代谢 BMR（Mifflin-St Jeor 公式）
 * 返回千卡/天
 */
export function calcBMR(body: BodyData | null): number | null {
  if (!body) return null;
  const s = body.gender === '男' ? 5 : -161;
  return Math.round(10 * body.weight + 6.25 * body.height - 5 * body.age + s);
}

/**
 * 每日总消耗 TDEE
 * activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
 * 默认基于 weeklyFrequency 推算
 */
export function calcTDEE(body: BodyData | null, weeklyFrequency?: number): number | null {
  const bmr = calcBMR(body);
  if (!bmr) return null;
  const freq = weeklyFrequency || 2;
  let factor = 1.375; // light
  if (freq >= 6) factor = 1.725; // very active
  else if (freq >= 4) factor = 1.55; // active
  else if (freq >= 2) factor = 1.375; // moderate
  return Math.round(bmr * factor);
}

/** 根据目标调整后的每日热量目标 */
export function targetCalories(
  body: BodyData | null,
  goal: FitnessGoal | null,
  weeklyFrequency?: number
): number | undefined {
  const tdee = calcTDEE(body, weeklyFrequency);
  if (!tdee) return undefined;
  if (goal?.type === '减脂') return Math.round(tdee * 0.8);
  if (goal?.type === '增肌') return Math.round(tdee * 1.12);
  return tdee;
}

/** 宏量营养素分配（克） */
export function macroSplit(
  calories: number,
  goalType: string
): { protein: number; carbs: number; fat: number } {
  let pctP: number, pctC: number, pctF: number;
  if (goalType === '减脂') {
    pctP = 0.40; pctC = 0.30; pctF = 0.30;
  } else if (goalType === '增肌') {
    pctP = 0.30; pctC = 0.50; pctF = 0.20;
  } else {
    pctP = 0.25; pctC = 0.50; pctF = 0.25;
  }
  return {
    protein: Math.round((calories * pctP) / 4),
    carbs: Math.round((calories * pctC) / 4),
    fat: Math.round((calories * pctF) / 9),
  };
}

/**
 * 根据目标和周频率推导训练分化的文字建议
 */
export function trainingSplitAdvice(
  weeklyFrequency: number,
  goalType: string
): { split: string; description: string; intensity: string } {
  if (goalType === '减脂') {
    if (weeklyFrequency <= 2) return { split: '全身训练', description: '每次覆盖全身大肌群，以多关节动作为主，配合中高强度有氧', intensity: '中高' };
    if (weeklyFrequency <= 4) return { split: '上下肢分化', description: '上肢日和下肢日交替，训练后加 20 分钟有氧', intensity: '中高' };
    return { split: '推拉腿分化', description: '推/拉/腿三日循环，每日加 HIIT 或匀速有氧', intensity: '高' };
  }
  if (goalType === '增肌') {
    if (weeklyFrequency <= 2) return { split: '全身训练（大重量）', description: '深蹲/卧推/硬拉/划船/推举五大项，高负荷低次数', intensity: '高' };
    if (weeklyFrequency <= 3) return { split: '推拉腿（PPL）', description: '推日/拉日/腿日各一次，每组 8-12RM，渐进负荷', intensity: '高' };
    if (weeklyFrequency <= 4) return { split: '上下肢分化 × 2', description: '每周两次上肢、两次下肢，重点冲击弱项', intensity: '高' };
    return { split: '五分化（胸/背/腿/肩/臂）', description: '经典健美分化，单次专注 1-2 肌群，高容量训练', intensity: '高' };
  }
  // 塑形 / 维持
  if (weeklyFrequency <= 2) return { split: '全身训练', description: '轻重量多次数，注重动作质量和核心稳定', intensity: '中等' };
  if (weeklyFrequency <= 3) return { split: '全身 + 核心 + 有氧', description: '一次全身力量、一次核心专项、一次有氧耐力', intensity: '中等' };
  return { split: '上下肢分化', description: '力量训练与灵活性训练结合，保持体态和线条', intensity: '中等' };
}

/** 旧的简版（兼容现有调用） */
export function estimateTargetCalories(bodyData: BodyData | null, goal: FitnessGoal | null): number | undefined {
  return targetCalories(bodyData, goal);
}
