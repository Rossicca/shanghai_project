import type { WorkoutPlan, WorkoutPlanInput, WorkoutRecommendParams, WorkoutVideo } from '@/types/workout';
import { AI_TIMEOUT } from '@/constants/config';

import { api } from './api';

function mapWorkoutVideo(item: any): WorkoutVideo {
  const difficultyMap: Record<string, WorkoutVideo['difficulty']> = {
    beginner: '\u5165\u95e8', intermediate: '\u8fdb\u9636', advanced: '\u6311\u6218',
  };
  return {
    id: String(item.id),
    title: String(item.title || '\u672a\u547d\u540d\u8bad\u7ec3'),
    coach: String(item.coach || item.instructor || '\u5065\u8eab\u6559\u7ec3'),
    duration: Number(item.duration || 0),
    difficulty: difficultyMap[item.difficulty] || item.difficulty || '\u5165\u95e8',
    category: item.category || item.categoryName || '\u5168\u8eab\u71c3\u8102',
    calories: Number(item.calories || 0),
    coverColor: item.coverColor || '#2FA886',
    coverUrl: item.coverUrl || undefined,
    coverOrientation: item.coverOrientation || (item.platform === 'douyin' ? 'portrait' : 'landscape'),
    source: typeof item.source === 'string' && /^https?:\/\//.test(item.source) ? item.source : undefined,
    sourceUrl: item.sourceUrl || item.videoUrl || undefined,
    platform: item.platform || 'bilibili',
    reason: item.reason || '\u9002\u5408\u5f53\u524d\u8bad\u7ec3\u76ee\u6807',
    contentType: item.contentType || undefined,
    recommendationBasis: item.recommendationBasis || undefined,
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

/** 按身体数据推荐运动视频（旧 API） */
export async function recommendWorkout(params: WorkoutRecommendParams): Promise<WorkoutVideo[]> {
  const res = await api.post<{ videos: WorkoutVideo[] }>('/api/workout/recommend', params);
  return res.data.videos.map(mapWorkoutVideo);
}

/** 按分类获取视频列表（旧 API，静态兜底） */
export async function fetchWorkoutByCategory(category: string): Promise<WorkoutVideo[]> {
  const res = await api.post<{ videos: WorkoutVideo[] }>('/api/workout/list', { category });
  return res.data.videos.map(mapWorkoutVideo);
}

/** 获取推荐视频流（新 API） */
export async function fetchFeed(params?: { category?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const res = await api.get(`/api/v1/workouts/feed?${query.toString()}`);
  return { ...res.data.data, items: (res.data.data.items || []).map(mapWorkoutVideo) };
}

/** 获取分类列表（新 API） */
export async function fetchCategories() {
  const res = await api.get('/api/v1/workouts/categories');
  return res.data.data;
}

/** 获取分类视频列表（新 API） */
export async function fetchWorkoutsByCategory(
  slug: string,
  params?: { page?: number; pageSize?: number; difficulty?: string; sort?: string }
) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.difficulty) query.set('difficulty', params.difficulty);
  if (params?.sort) query.set('sort', params.sort);
  const res = await api.get(`/api/v1/workouts/category/${slug}?${query.toString()}`);
  return { ...res.data.data, items: (res.data.data.items || []).map(mapWorkoutVideo) };
}

export async function generateWorkoutPlan(input: WorkoutPlanInput): Promise<WorkoutPlan> {
  const res = await api.post('/api/v1/workout-plans/generate', input, { timeout: AI_TIMEOUT });
  return res.data.data;
}

export async function fetchLatestWorkoutPlan(): Promise<WorkoutPlan | null> {
  const res = await api.get('/api/v1/workout-plans/latest');
  return res.data.data;
}

export async function fetchCurrentWorkoutPlan(): Promise<WorkoutPlan | null> {
  const res = await api.get('/api/v1/workout-plans/current');
  return res.data.data;
}

export async function refreshWorkoutFeed(params: {
  category?: string;
  excludeIds?: string[];
  limit?: number;
}): Promise<{
  items: WorkoutVideo[];
  generationMode: 'ai' | 'safe_fallback';
  generationWarning?: string;
}> {
  const res = await api.post('/api/v1/workouts/feed/refresh', params, { timeout: AI_TIMEOUT });
  return {
    ...res.data.data,
    items: (res.data.data.items || []).map(mapWorkoutVideo),
  };
}

export async function fetchWorkoutPlan(planId: string): Promise<WorkoutPlan> {
  const res = await api.get(`/api/v1/workout-plans/${encodeURIComponent(planId)}`);
  return res.data.data;
}

export async function setWorkoutPlanSaved(planId: string, saved: boolean): Promise<WorkoutPlan> {
  const res = saved
    ? await api.post(`/api/v1/workout-plans/${encodeURIComponent(planId)}/save`)
    : await api.delete(`/api/v1/workout-plans/${encodeURIComponent(planId)}/save`);
  return res.data.data;
}

export async function setWorkoutPlanFavorite(planId: string, favorite: boolean): Promise<WorkoutPlan> {
  const res = favorite
    ? await api.post(`/api/v1/workout-plans/${encodeURIComponent(planId)}/favorite`)
    : await api.delete(`/api/v1/workout-plans/${encodeURIComponent(planId)}/favorite`);
  return res.data.data;
}

export async function activateWorkoutPlan(planId: string): Promise<WorkoutPlan> {
  const res = await api.post(`/api/v1/workout-plans/${encodeURIComponent(planId)}/activate`);
  return res.data.data;
}

export async function fetchSavedWorkoutPlans(): Promise<WorkoutPlan[]> {
  const res = await api.get('/api/v1/workout-plans/saved/list');
  return res.data.data;
}

/** 搜索视频（新 API） */
export async function searchWorkouts(q: string, page = 1) {
  const res = await api.get(`/api/v1/workouts/search?q=${encodeURIComponent(q)}&page=${page}`);
  return res.data.data;
}

/** 获取视频详情（新 API） */
export async function fetchWorkoutDetail(id: string) {
  const res = await api.get(`/api/v1/workouts/${id}`);
  // 与列表/推荐共用同一套字段清洗：接口返回的 source 是 'external' 标记，
  // 不是可播放的 URL，直接透传给 VideoPlayer 会走 RealVideo 导致播放器异常。
  return mapWorkoutVideo(res.data.data);
}

/** 收藏视频（新 API） */
export async function saveWorkout(id: string): Promise<void> {
  await api.post(`/api/v1/workouts/${id}/save`);
}

/** 取消收藏视频（新 API） */
export async function unsaveWorkout(id: string): Promise<void> {
  await api.delete(`/api/v1/workouts/${id}/save`);
}

/** 获取收藏列表（新 API） */
export async function fetchSavedWorkouts() {
  const res = await api.get('/api/v1/workouts/saved/list');
  return res.data.data;
}

/** 获取数据看板（新 API） */
export async function fetchDashboard() {
  const res = await api.get('/api/v1/stats/dashboard');
  return res.data.data;
}

/** 获取体重趋势（新 API） */
export async function fetchWeightTrend() {
  const res = await api.get('/api/v1/stats/weight-trend');
  return res.data.data;
}
