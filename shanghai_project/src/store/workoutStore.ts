import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import * as workoutService from '@/services/workout';
import type { WorkoutRecommendParams, WorkoutVideo } from '@/types/workout';

const KEY_SAVED = 'workout:saved';
const KEY_HISTORY = 'workout:history';

interface WorkoutState {
  feed: WorkoutVideo[];
  categories: { slug: string; name: string; icon: string }[];
  currentCategory: string;
  selectedVideo: WorkoutVideo | null;
  savedVideos: WorkoutVideo[];
  history: WorkoutVideo[];
  isLoading: boolean;
  selectVideo: (video: WorkoutVideo) => void;
  fetchFeed: (params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  switchCategory: (category: string, params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  toggleSave: (video: WorkoutVideo) => Promise<void>;
  addHistory: (video: WorkoutVideo) => Promise<void>;
  loadLocal: () => Promise<void>;
  loadCategories: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  feed: [],
  categories: [],
  currentCategory: '为你推荐',
  selectedVideo: null,
  savedVideos: [],
  history: [],
  isLoading: false,

  selectVideo: (selectedVideo) => set({ selectedVideo }),

  fetchFeed: async (params) => {
    set({ isLoading: true });
    try {
      if (get().currentCategory === '为你推荐') {
        const videos = await workoutService.recommendWorkout({
          bodyData: params?.bodyData ?? undefined,
          goal: params?.goal,
          preference: params?.preference,
          limit: params?.limit ?? 8,
        });
        set({ feed: videos });
      } else {
        const videos = await workoutService.fetchWorkoutByCategory(get().currentCategory);
        set({ feed: videos });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  switchCategory: async (currentCategory, params) => {
    set({ currentCategory });
    await get().fetchFeed(params);
  },

  toggleSave: async (video) => {
    const isSaved = get().savedVideos.some((v) => v.id === video.id);
    try {
      if (isSaved) {
        await workoutService.unsaveWorkout(video.id);
      } else {
        await workoutService.saveWorkout(video.id);
      }
    } catch {
      // 后端不可用时仅本地保存
    }
    const saved = isSaved
      ? get().savedVideos.filter((v) => v.id !== video.id)
      : [video, ...get().savedVideos];
    set({ savedVideos: saved });
    await AsyncStorage.setItem(KEY_SAVED, JSON.stringify(saved));
  },

  addHistory: async (video) => {
    const history = get().history.some((v) => v.id === video.id)
      ? get().history
      : [video, ...get().history].slice(0, 20);
    set({ history });
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  },

  loadCategories: async () => {
    try {
      const data = await workoutService.fetchCategories();
      if (data) set({ categories: data });
    } catch {
      // use default
    }
  },

  loadLocal: async () => {
    try {
      const [saved, history] = await Promise.all([
        AsyncStorage.getItem(KEY_SAVED),
        AsyncStorage.getItem(KEY_HISTORY),
      ]);
      set({
        savedVideos: saved ? JSON.parse(saved) : [],
        history: history ? JSON.parse(history) : [],
      });
    } catch {
      // ignore
    }
  },
}));