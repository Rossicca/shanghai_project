import type { WorkoutRecommendParams, WorkoutVideo } from '@/types/workout';

import { api } from './api';

/** 按身体数据推荐运动视频 */
export async function recommendWorkout(params: WorkoutRecommendParams): Promise<WorkoutVideo[]> {
  const res = await api.post<{ videos: WorkoutVideo[] }>('/api/workout/recommend', params);
  return res.data.videos;
}

/** 按分类获取视频列表（静态兜底，来自后端 demo 库） */
export async function fetchWorkoutByCategory(category: string): Promise<WorkoutVideo[]> {
  const res = await api.post<{ videos: WorkoutVideo[] }>('/api/workout/list', { category });
  return res.data.videos;
}
