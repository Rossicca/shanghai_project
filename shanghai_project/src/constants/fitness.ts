import type { WorkoutCategory } from '@/types/workout';

/** 视频分类标签（第一项为"为你推荐"） */
export const CATEGORIES = ['为你推荐', '全身燃脂', '臀腿', '肩背', '手臂', '核心', '有氧', '拉伸'] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  为你推荐: '⚡',
  全身燃脂: '🔥',
  臀腿: '🍑',
  肩背: '💪',
  手臂: '🏋️',
  核心: '🧘',
  有氧: '🏃',
  拉伸: '🧘‍♀️',
};

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  '全身燃脂',
  '臀腿',
  '肩背',
  '手臂',
  '核心',
  '有氧',
  '拉伸',
];
