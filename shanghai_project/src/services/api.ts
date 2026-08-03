import axios from 'axios';

import { AI_TIMEOUT, API_BASE_URL } from '@/constants/config';

/** Axios 实例 + 拦截器（统一处理网络错误） */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: AI_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      error.message = '网络连接失败，请检查网络设置';
    } else if (error.response.status === 401) {
      error.message = '登录已失效，请重新登录';
    } else if (error.response.data?.error) {
      error.message = error.response.data.error;
    }
    return Promise.reject(error);
  }
);
