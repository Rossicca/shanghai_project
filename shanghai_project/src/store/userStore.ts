import { create } from 'zustand';

import * as userService from '@/services/user';
import type { BodySnapshot } from '@/services/user';
import type { BodyData, FitnessGoal } from '@/types/workout';
import type { User } from '@/types/user';

interface UserState {
  user: User | null;
  bodyData: BodyData | null;
  goal: FitnessGoal | null;
  bodyHistory: BodySnapshot[];
  loaded: boolean;
  load: () => Promise<void>;
  setUser: (user: User | null) => Promise<void>;
  setBodyData: (data: BodyData | null) => Promise<void>;
  setGoal: (goal: FitnessGoal | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  bodyData: null,
  goal: null,
  bodyHistory: [],
  loaded: false,

  load: async () => {
    const [user, bodyData, goal, bodyHistory] = await Promise.all([
      userService.loadUser(),
      userService.loadBodyData(),
      userService.loadGoal(),
      userService.loadBodyHistory(),
    ]);
    set({ user, bodyData, goal, bodyHistory, loaded: true });
  },

  setUser: async (user) => {
    if (user) await userService.saveUser(user);
    set({ user });
  },

  setBodyData: async (bodyData) => {
    if (bodyData) {
      await userService.saveBodyData(bodyData);
      const bodyHistory = await userService.appendBodyHistory(bodyData);
      set({ bodyData, bodyHistory });
    } else {
      set({ bodyData });
    }
  },

  setGoal: async (goal) => {
    if (goal) await userService.saveGoal(goal);
    set({ goal });
  },

  logout: async () => {
    await userService.clearUser();
    set({ user: null, bodyData: null, goal: null });
  },
}));
