import { create } from 'zustand';

import { getToken } from '@/services/api';
import { fetchCheckinStatus, submitCheckin, type CheckinStatus } from '@/services/checkin';

/**
 * 每日训练打卡 store — 数据来自后端 /api/v1/checkins（需登录）。
 * 打卡后更新本地状态（按钮变「已打卡」），个人主页训练次数由 dashboard 在 focus 时刷新。
 */
interface CheckinState extends CheckinStatus {
  loading: boolean;
  load: () => Promise<void>;
  checkIn: () => Promise<void>;
  clearLocalData: () => void;
}

export const useCheckinStore = create<CheckinState>((set, get) => ({
  checkedInToday: false,
  streak: 0,
  totalWorkouts: 0,
  loading: false,

  load: async () => {
    if (!getToken()) return; // 游客不展示打卡状态
    try {
      const status = await fetchCheckinStatus();
      set(status);
    } catch (error) {
      console.warn('[checkin] 状态加载失败:', error);
    }
  },

  checkIn: async () => {
    if (get().checkedInToday || get().loading) return;
    set({ loading: true });
    try {
      const status = await submitCheckin();
      set({ ...status, loading: false });
    } catch (error) {
      set({ loading: false });
      console.warn('[checkin] 打卡失败:', error);
      throw error;
    }
  },

  clearLocalData: () => set({ checkedInToday: false, streak: 0, totalWorkouts: 0 }),
}));
