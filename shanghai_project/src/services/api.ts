import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'axios';
import { router } from 'expo-router';

import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/config';

/** Axios 实例 + 拦截器（统一处理网络错误 + 认证） */
export const api = create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Token 管理
let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshRequest: Promise<void> | null = null;

const ACCESS_TOKEN_KEY = 'user:token';
const REFRESH_TOKEN_KEY = 'user:refreshToken';

export function setToken(token: string | null) {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, access],
    [REFRESH_TOKEN_KEY, refresh],
  ]);
}

export async function loadTokens(): Promise<string | null> {
  const entries = await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  accessToken = entries[0][1];
  refreshToken = entries[1][1];
  return accessToken;
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// 请求拦截器：自动附加认证与链路追踪头
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-Request-ID'] = createRequestId();
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (!error.response) {
      error.message = error.code === 'ECONNABORTED'
        ? '请求超时，请检查网络后重试'
        : '网络连接失败，请检查网络设置';
    } else if (error.response.status === 401 && refreshToken && !error.config?._retry) {
      error.config._retry = true;
      try {
        if (!refreshRequest) {
          refreshRequest = (async () => {
            const refreshClient = create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT });
            const response = await refreshClient.post('/api/v1/auth/refresh', { refreshToken });
            const next = response.data.data;
            await saveTokens(next.accessToken, next.refreshToken || refreshToken!);
          })().finally(() => {
            refreshRequest = null;
          });
        }
        await refreshRequest;
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch {
        await clearTokens();
        error.message = '登录已失效，请重新登录';
        router.replace('/auth/login');
      }
    } else if (error.response.status === 401) {
      await clearTokens();
      error.message = '登录已失效，请重新登录';
      router.replace('/auth/login');
    } else if (error.response.data?.error?.message) {
      error.message = error.response.data.error.message;
    }
    const requestId = error.response?.data?.error?.requestId || error.response?.headers?.['x-request-id'];
    if (requestId && error.response?.status >= 500) {
      error.message = `${error.message}（请求编号：${requestId}）`;
    }
    return Promise.reject(error);
  }
);
