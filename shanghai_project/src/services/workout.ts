import type { WorkoutRecommendParams, WorkoutVideo } from '@/types/workout';

import { api } from './api';

/** 按身体数据推荐运动视频（旧 API） */
export async function recommendWorkout(params: WorkoutRecommendParams): Promise<WorkoutVideo[]> {
  const res = await api.post<{ videos: WorkoutVideo[] }>('/api/workout/recommend', params);
  return res.data.videos;
}

/** 按分类获取视频列表（旧 API，静态兜底） */
export async function fetchWorkoutByCategory(category: string): Promise<WorkoutVideo[]> {
  const res = await api.post<{ videos: WorkoutVideo[] }>('/api/workout/list', { category });
  return res.data.videos;
}

/** 获取推荐视频流（新 API） */
export async function fetchFeed(params?: { category?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const res = await api.get(`/api/v1/workouts/feed?${query.toString()}`);
  return res.data.data;
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
  return res.data.data;
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