import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BodyData, FitnessGoal } from '@/types/workout';
import type { User } from '@/types/user';

import { api, setToken } from './api';

/**
 * 用户数据服务
 * 同时支持本地存储（离线/游客模式）和后端 API（在线模式）
 * 后端可用时优先使用 API，否则降级到本地存储
 */

const KEY_USER = 'user:profile';
const KEY_BODY = 'user:bodyData';
const KEY_GOAL = 'user:goal';
const KEY_BODY_HISTORY = 'user:bodyHistory';
const KEY_TOKEN = 'user:token';

// ─── 本地存储工具 ───

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ─── Token 管理 ───

export async function saveToken(token: string): Promise<void> {
  setToken(token);
  await AsyncStorage.setItem(KEY_TOKEN, token);
}

export async function loadToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(KEY_TOKEN);
  if (token) setToken(token);
  return token;
}

export async function clearToken(): Promise<void> {
  setToken(null);
  await AsyncStorage.removeItem(KEY_TOKEN);
}

// ─── 认证 API ───

export async function register(email: string, password: string, nickname: string): Promise<User> {
  const res = await api.post('/api/v1/auth/register', { email, password, nickname });
  const { accessToken, userId, nickname: nick } = res.data.data;
  await saveToken(accessToken);
  const user: User = { id: userId, nickname: nick };
  await saveUser(user);
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api.post('/api/v1/auth/login', { email, password });
  const { accessToken, userId, nickname } = res.data.data;
  await saveToken(accessToken);
  const user: User = { id: userId, nickname };
  await saveUser(user);
  return user;
}

// ─── 用户信息 ───

export async function loadUser(): Promise<User | null> {
  return getJSON<User>(KEY_USER);
}

export async function saveUser(user: User): Promise<void> {
  await setJSON(KEY_USER, user);
}

// ─── 身体数据 ───

export async function loadBodyData(): Promise<BodyData | null> {
  return getJSON<BodyData>(KEY_BODY);
}

export async function saveBodyData(data: BodyData): Promise<void> {
  // 本地保存
  await setJSON(KEY_BODY, data);
  // 尝试同步到后端
  try {
    await api.post('/api/v1/users/me/body-data', data);
  } catch {
    // 后端不可用时仅本地保存
  }
}

export async function loadGoal(): Promise<FitnessGoal | null> {
  return getJSON<FitnessGoal>(KEY_GOAL);
}

export async function saveGoal(goal: FitnessGoal): Promise<void> {
  await setJSON(KEY_GOAL, goal);
  try {
    await api.put('/api/v1/users/me/goal', {
      goalType: goal.type,
      targetWeight: goal.targetWeight,
      targetDate: goal.deadline,
    });
  } catch {
    // 仅本地保存
  }
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
  await AsyncStorage.multiRemove([KEY_USER, KEY_BODY, KEY_GOAL]);
  await clearToken();
}