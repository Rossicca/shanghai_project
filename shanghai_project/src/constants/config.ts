import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** 本地后端端口（server/server.js） */
const DEV_PORT = 8787;

function resolveBaseUrl(): string {
  if (Platform.OS === 'web') {
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
export const AI_TIMEOUT = 60000;

/** 是否启用演示兜底：后端失败时自动用内置演示数据 */
export const ENABLE_DEMO_FALLBACK = true;
