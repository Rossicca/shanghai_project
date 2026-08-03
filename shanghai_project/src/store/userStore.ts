import { create } from 'zustand';

import * as userService from '@/services/user';
import { loadToken } from '@/services/user';
import type { BodySnapshot } from '@/services/user';
import type { BodyData, FitnessGoal } from '@/types/workout';
import type { User } from '@/types/user';
import { useRecipeStore } from '@/store/recipeStore';
import { useWorkoutStore } from '@/store/workoutStore';

interface UserState {
  user: User | null;
  bodyData: BodyData | null;
  goal: FitnessGoal | null;
  bodyHistory: BodySnapshot[];
  loaded: boolean;
  isLoggedIn: boolean;
  load: () => Promise<void>;
  setUser: (user: User | null) => Promise<void>;
  setBodyData: (data: BodyData | null) => Promise<void>;
  setGoal: (goal: FitnessGoal | null) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, nickname: string) => Promise<User>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  bodyData: null,
  goal: null,
  bodyHistory: [],
  loaded: false,
  isLoggedIn: false,

  load: async () => {
    const token = await loadToken();
    try {
      if (token) {
        const account = await userService.fetchCurrentAccount();
        set({ ...account, loaded: true, isLoggedIn: true });
        return;
      }
      const user = await userService.loadUser();
      const [bodyData, goal, bodyHistory] = await Promise.all([
        userService.loadBodyData(),
        userService.loadGoal(),
        userService.loadBodyHistory(),
      ]);
      set({ user, bodyData, goal, bodyHistory, loaded: true, isLoggedIn: false });
    } catch {
      const [user, bodyData, goal, bodyHistory, remainingToken] = await Promise.all([
        userService.loadUser(),
        userService.loadBodyData(),
        userService.loadGoal(),
        userService.loadBodyHistory(),
        loadToken(),
      ]);
      set({ user, bodyData, goal, bodyHistory, loaded: true, isLoggedIn: !!remainingToken });
    }
  },

  setUser: async (user) => {
    if (user) await userService.saveUser(user);
    set({ user, isLoggedIn: !!user });
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

  login: async (email, password) => {
    await userService.login(email, password);
    const account = await userService.fetchCurrentAccount();
    set({ ...account, loaded: true, isLoggedIn: true });
    return account.user;
  },

  register: async (email, password, nickname) => {
    await userService.register(email, password, nickname);
    const account = await userService.fetchCurrentAccount();
    set({ ...account, loaded: true, isLoggedIn: true });
    return account.user;
  },

  logout: async () => {
    await userService.clearUser();
    useRecipeStore.getState().clearLocalData();
    useWorkoutStore.getState().clearLocalData();
    set({ user: null, bodyData: null, goal: null, bodyHistory: [], isLoggedIn: false, loaded: true });
  },
}));
