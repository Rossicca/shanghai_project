import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BodyData, FitnessGoal } from '@/types/workout';
import type { User } from '@/types/user';

import { api, clearTokens, loadTokens, saveTokens } from './api';
import { getScopedItem, removeCurrentUserScopedData, setScopedItem } from './scopedStorage';

/**
 * 用户数据服务
 * 同时支持本地存储（离线/游客模式）和后端 API（在线模式）
 * 后端可用时优先使用 API，否则降级到本地存储
 */

const KEY_USER = 'user:profile';
const KEY_BODY = 'user:bodyData';
const KEY_GOAL = 'user:goal';
const KEY_BODY_HISTORY = 'user:bodyHistory';

// ─── 本地存储工具 ───

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getScopedItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  await setScopedItem(key, JSON.stringify(value));
}

// ─── Token 管理 ───

export async function saveToken(token: string, refreshToken: string): Promise<void> {
  await saveTokens(token, refreshToken);
}

export async function loadToken(): Promise<string | null> {
  return loadTokens();
}

export async function clearToken(): Promise<void> {
  await clearTokens();
}

// ─── 认证 API ───

export async function register(email: string, password: string, nickname: string): Promise<User> {
  const res = await api.post('/api/v1/auth/register', { email, password, nickname });
  const { accessToken, refreshToken, userId, nickname: nick } = res.data.data;
  await saveToken(accessToken, refreshToken);
  const user: User = { id: userId, nickname: nick };
  await saveUser(user);
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api.post('/api/v1/auth/login', { email, password });
  const { accessToken, refreshToken, userId, nickname } = res.data.data;
  await saveToken(accessToken, refreshToken);
  const user: User = { id: userId, nickname };
  await saveUser(user);
  return user;
}

// ─── 用户信息 ───

export async function loadUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(KEY_USER, JSON.stringify(user));
}

// ─── 身体数据 ───

export async function loadBodyData(): Promise<BodyData | null> {
  return getJSON<BodyData>(KEY_BODY);
}

export async function saveBodyData(data: BodyData): Promise<void> {
  if (await loadToken()) {
    await api.post('/api/v1/users/me/body-data', data);
  }
  await setJSON(KEY_BODY, data);
}

export async function loadGoal(): Promise<FitnessGoal | null> {
  return getJSON<FitnessGoal>(KEY_GOAL);
}

export async function saveGoal(goal: FitnessGoal): Promise<void> {
  if (await loadToken()) {
    await api.put('/api/v1/users/me/goal', {
      goalType: goal.type,
      targetWeight: goal.targetWeight,
      targetDate: goal.deadline,
      weeklyFrequency: goal.weeklyFrequency,
    });
  }
  await setJSON(KEY_GOAL, goal);
}

function goalLabel(value?: string): FitnessGoal['type'] {
  const labels: Record<string, FitnessGoal['type']> = {
    lose_fat: '减脂',
    gain_muscle: '增肌',
    shape: '塑形',
    maintain: '保持健康',
  };
  return labels[value || ''] || (value as FitnessGoal['type']) || '保持健康';
}

/** Restore the signed-in account from the backend and refresh its local cache. */
export async function fetchCurrentAccount(): Promise<{
  user: User;
  bodyData: BodyData | null;
  goal: FitnessGoal | null;
  bodyHistory: BodySnapshot[];
}> {
  const [profileResponse, historyResponse] = await Promise.all([
    api.get('/api/v1/users/me'),
    api.get('/api/v1/users/me/body-data/history'),
  ]);
  const profile = profileResponse.data.data;
  const user: User = {
    id: String(profile.userId),
    nickname: String(profile.nickname || '健身新人'),
    avatar: profile.avatarUrl || undefined,
    gender: profile.gender === 'female' || profile.gender === '女' ? '女' : '男',
    birthDate: profile.birthday || undefined,
  };
  await saveUser(user);

  const bodyData: BodyData | null = profile.bodyData
    ? {
        height: Number(profile.bodyData.height),
        weight: Number(profile.bodyData.weight),
        age: Number(profile.bodyData.age),
        gender: profile.bodyData.gender === 'female' || profile.bodyData.gender === '女' ? '女' : '男',
        bodyFat: profile.bodyData.bodyFat == null ? undefined : Number(profile.bodyData.bodyFat),
        waist: profile.bodyData.waist == null ? undefined : Number(profile.bodyData.waist),
        hip: profile.bodyData.hip == null ? undefined : Number(profile.bodyData.hip),
      }
    : null;
  const goal: FitnessGoal | null = profile.fitnessGoal
    ? {
        type: goalLabel(profile.fitnessGoal.goalType),
        targetWeight: profile.fitnessGoal.targetWeight == null ? undefined : Number(profile.fitnessGoal.targetWeight),
        deadline: profile.fitnessGoal.targetDate || undefined,
        weeklyFrequency: Number(profile.fitnessGoal.weeklyFrequency || 3),
      }
    : null;
  const bodyHistory: BodySnapshot[] = Array.isArray(historyResponse.data.data)
    ? historyResponse.data.data
    : [];

  if (bodyData) await setJSON(KEY_BODY, bodyData);
  if (goal) await setJSON(KEY_GOAL, goal);
  await setJSON(KEY_BODY_HISTORY, bodyHistory);
  return { user, bodyData, goal, bodyHistory };
}

// ─── 身体数据历史（用于趋势图） ───

export interface BodySnapshot {
  date: string;
  weight: number;
  height: number;
  bodyFat?: number;
}

export async function loadBodyHistory(): Promise<BodySnapshot[]> {
  const list = await getJSON<BodySnapshot[]>(KEY_BODY_HISTORY);
  return list ?? [];
}

export async function appendBodyHistory(data: BodyData): Promise<BodySnapshot[]> {
  const prev = await loadBodyHistory();
  const today = new Date().toISOString().slice(0, 10);
  const snapshot: BodySnapshot = {
    date: today,
    weight: data.weight,
    height: data.height,
    bodyFat: data.bodyFat,
  };
  // 同一天更新最新值
  const filtered = prev.filter((s) => s.date !== today);
  const next = [...filtered, snapshot].slice(-30);
  await setJSON(KEY_BODY_HISTORY, next);
  return next;
}

// ─── 游客登录 ───

export async function mockLogin(nickname: string): Promise<User> {
  const user: User = {
    id: 'u_' + Date.now(),
    nickname: nickname || '健身新人',
  };
  await saveUser(user);
  return user;
}

export async function clearUser(): Promise<void> {
  await removeCurrentUserScopedData();
  await AsyncStorage.removeItem(KEY_USER);
  await clearToken();
}
