import { create } from 'zustand';

import * as userService from '@/services/user';
import { loadToken } from '@/services/user';
import type { BodySnapshot } from '@/services/user';
import type { BodyData, FitnessGoal } from '@/types/workout';
import type { User } from '@/types/user';

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
    const [user, bodyData, goal, bodyHistory, token] = await Promise.all([
      userService.loadUser(),
      userService.loadBodyData(),
      userService.loadGoal(),
      userService.loadBodyHistory(),
      loadToken(),
    ]);
    set({ user, bodyData, goal, bodyHistory, loaded: true, isLoggedIn: !!token });
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
    const user = await userService.login(email, password);
    set({ user, isLoggedIn: true });
    return user;
  },

  register: async (email, password, nickname) => {
    const user = await userService.register(email, password, nickname);
    set({ user, isLoggedIn: true });
    return user;
  },

  logout: async () => {
    await userService.clearUser();
    set({ user: null, bodyData: null, goal: null, isLoggedIn: false });
  },
}));