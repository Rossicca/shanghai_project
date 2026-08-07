import { api } from './api';

export interface AdminStats {
  users: { total: number; admin: number; todayRegistrations: number; genderDistribution: Record<string, number> };
  bodyData: { total: number };
  goals: { total: number; distribution: Record<string, number> };
  recipes: { total: number };
  recognition: { total: number; today: number };
  savedWorkouts: { total: number };
  workoutPlans: { total: number };
  workoutVideos: { total: number };
  /** 数据来源：每台机器各有一份本地 SQLite，看板只统计本机 */
  source?: { dbPath: string; dbSizeBytes: number; scope: string };
}

export interface AdminUser {
  id: string;
  email: string;
  nickname: string;
  gender: string;
  role: string;
  createdAt: string;
  lastBodyData: { height: number; weight: number; measuredAt: string } | null;
  goal: { goalType: string; weeklyFrequency: number } | null;
  recognitionCount: number;
}

export interface AdminUserDetail {
  user: AdminUser & { birthday: string | null };
  bodyData: any[];
  goal: any;
  preferences: any;
  recognitionHistory: any[];
  savedWorkoutCount: number;
  recipeCount: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await api.get('/api/v1/admin/stats');
  return res.data.data;
}

export async function fetchAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  role?: string;
  search?: string;
}): Promise<{ items: AdminUser[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.role) query.set('role', params.role);
  if (params?.search) query.set('search', params.search);
  const res = await api.get(`/api/v1/admin/users?${query.toString()}`);
  return res.data.data;
}

export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const res = await api.get(`/api/v1/admin/users/${id}`);
  return res.data.data;
}

export async function updateUserRole(id: string, role: string): Promise<void> {
  await api.patch(`/api/v1/admin/users/${id}/role`, { role });
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/users/${id}`);
}