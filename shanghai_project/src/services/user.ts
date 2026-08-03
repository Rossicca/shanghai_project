import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BodyData, FitnessGoal } from '@/types/workout';
import type { User } from '@/types/user';

/**
 * 用户数据本地存取（demo 阶段游客模式，无真实后端）。
 * 数据键统一前缀 user:，后续接真实后端时替换为 API 调用。
 */

const KEY_USER = 'user:profile';
const KEY_BODY = 'user:bodyData';
const KEY_GOAL = 'user:goal';
const KEY_BODY_HISTORY = 'user:bodyHistory';

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

export async function loadUser(): Promise<User | null> {
  return getJSON<User>(KEY_USER);
}

export async function saveUser(user: User): Promise<void> {
  await setJSON(KEY_USER, user);
}

export async function loadBodyData(): Promise<BodyData | null> {
  return getJSON<BodyData>(KEY_BODY);
}

export async function saveBodyData(data: BodyData): Promise<void> {
  await setJSON(KEY_BODY, data);
}

export async function loadGoal(): Promise<FitnessGoal | null> {
  return getJSON<FitnessGoal>(KEY_GOAL);
}

export async function saveGoal(goal: FitnessGoal): Promise<void> {
  await setJSON(KEY_GOAL, goal);
}

/** 身体数据历史（用于趋势图），每次保存追加一条 */
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

/** demo 登录：本地生成游客用户 */
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
}
