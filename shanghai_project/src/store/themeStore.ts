import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * 主题偏好：跟随系统 / 浅色 / 深色。
 * 默认跟随系统；用户可在"更多"菜单里切换，持久化本地。
 */

const KEY = 'theme:preference';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  load: () => Promise<void>;
  setPreference: (p: ThemePreference) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        set({ preference: raw });
      }
    } catch {
      // ignore
    }
  },

  setPreference: async (preference) => {
    set({ preference });
    try {
      await AsyncStorage.setItem(KEY, preference);
    } catch {
      // ignore
    }
  },
}));
