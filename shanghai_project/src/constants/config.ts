import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** 本地后端端口（server/server.js） */
const DEV_PORT = 8787;

function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  }
  if (Platform.OS === 'web') {
    // 部署到非 localhost 域名/IP 时（如 http://8.133.172.55），回落到当前页面主机名，
    // 保证所有用户（含协作者）的浏览器连到同一个后端，而不是各自身边的 localhost。
    const hostname =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : '';
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:${DEV_PORT}`;
    }
    return `http://localhost:${DEV_PORT}`;
  }
  // 开发时通过 Expo hostUri 拿到电脑的局域网 IP，真机也能连到本机后端
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${DEV_PORT}`;
  return `http://localhost:${DEV_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

/** 识别/生成请求超时（毫秒） */
export const REQUEST_TIMEOUT = 30000;
export const AI_TIMEOUT = 60000;

/** 是否启用演示兜底：后端失败时自动用内置演示数据 */
export const ENABLE_DEMO_FALLBACK = false;
