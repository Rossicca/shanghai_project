import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemeStore } from '@/store/themeStore';

/**
 * 颜色方案：优先用户偏好（store），"system" 时跟随系统。
 * 全局组件都走这里，切换偏好即全局生效。
 */
export function useColorScheme() {
  const preference = useThemeStore((s) => s.preference);
  const systemColorScheme = useSystemColorScheme() ?? 'light';
  return preference === 'system' ? systemColorScheme : preference;
}
