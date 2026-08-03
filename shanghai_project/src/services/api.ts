import axios from 'axios';

import { AI_TIMEOUT, API_BASE_URL } from '@/constants/config';

/** Axios 实例 + 拦截器（统一处理网络错误 + 认证） */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: AI_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Token 管理
let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

// 请求拦截器：自动附加 Authorization 头
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      error.message = '网络连接失败，请检查网络设置';
    } else if (error.response.status === 401) {
      // Token 过期或无效，清除 token
      setToken(null);
      error.message = '登录已失效，请重新登录';
    } else if (error.response.data?.error?.message) {
      error.message = error.response.data.error.message;
    }
    return Promise.reject(error);
  }
);