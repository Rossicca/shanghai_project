import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutPlan } from '@/types/workout';
import { getToken } from '@/services/api';
import { fetchLatestWorkoutPlan } from '@/services/workout';

const KEY_PLAN = 'workout:plan';

interface PlanState {
  plan: WorkoutPlan | null;
  isLoading: boolean;
  error: string;
  loadPlan: () => Promise<void>;
  setPlan: (plan: WorkoutPlan | null) => Promise<void>;
  clearPlan: () => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  isLoading: false,
  error: '',

  loadPlan: async () => {
    set({ isLoading: true, error: '' });
    try {
      // 先读本地缓存
      const cached = await AsyncStorage.getItem(KEY_PLAN);
      if (cached) {
        set({ plan: JSON.parse(cached), isLoading: false });
      }
      // 登录用户尝试从服务端拉最新计划
      if (getToken()) {
        const remote = await fetchLatestWorkoutPlan();
        if (remote) {
          set({ plan: remote });
          await AsyncStorage.setItem(KEY_PLAN, JSON.stringify(remote));
        }
      }
    } catch {
      // 静默失败，不影响首页正常展示
    } finally {
      set({ isLoading: false });
    }
  },

  setPlan: async (plan) => {
    set({ plan });
    if (plan) {
      await AsyncStorage.setItem(KEY_PLAN, JSON.stringify(plan));
    } else {
      await AsyncStorage.removeItem(KEY_PLAN);
    }
  },

  clearPlan: async () => {
    set({ plan: null });
    await AsyncStorage.removeItem(KEY_PLAN);
  },
}));
