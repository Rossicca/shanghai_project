import { create } from 'zustand';

import { getToken } from '@/services/api';
import * as workoutService from '@/services/workout';
import { getScopedItem, setScopedItem } from '@/services/scopedStorage';
import type { WorkoutRecommendParams, WorkoutVideo } from '@/types/workout';

const KEY_SAVED = 'workout:saved';
const KEY_HISTORY = 'workout:history';
const CATEGORY_SLUGS: Record<string, string> = {
  '\u4e3a\u4f60\u63a8\u8350': 'recommended', '\u81c0\u817f': 'glutes_legs', '\u80a9\u80cc': 'shoulders_back',
  '\u624b\u81c2': 'arms', '\u6838\u5fc3': 'core', '\u5168\u8eab\u71c3\u8102': 'full_body', '\u6709\u6c27': 'cardio', '\u62c9\u4f38': 'stretch',
};

interface WorkoutState {
  feed: WorkoutVideo[];
  categories: { slug: string; name: string; icon: string }[];
  currentCategory: string;
  selectedVideo: WorkoutVideo | null;
  savedVideos: WorkoutVideo[];
  history: WorkoutVideo[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string;
  selectVideo: (video: WorkoutVideo) => void;
  fetchFeed: (params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  switchCategory: (category: string, params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  loadMore: () => Promise<void>;
  toggleSave: (video: WorkoutVideo) => Promise<void>;
  addHistory: (video: WorkoutVideo) => Promise<void>;
  loadLocal: () => Promise<void>;
  loadCategories: () => Promise<void>;
  refreshSaved: () => Promise<void>;
  clearLocalData: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  feed: [], categories: [], currentCategory: '\u4e3a\u4f60\u63a8\u8350', selectedVideo: null,
  savedVideos: [], history: [], isLoading: false, isLoadingMore: false,
  hasMore: false, page: 1, error: '',

  selectVideo: (selectedVideo) => set({ selectedVideo }),

  fetchFeed: async (params) => {
    set({ isLoading: true, error: '', page: 1 });
    try {
      if (get().currentCategory === '\u4e3a\u4f60\u63a8\u8350') {
        // \u4e3a\u4f60\u63a8\u8350\uff1aAI \u4e2a\u6027\u5316\u63a8\u8350
        if (getToken()) {
          const result = await workoutService.fetchFeed({ category: 'recommended', page: 1, pageSize: 6 });
          set({ feed: result.items, hasMore: result.hasMore, page: 1 });
        } else {
          const videos = await workoutService.recommendWorkout({
            bodyData: params?.bodyData ?? undefined,
            goal: params?.goal,
            preference: params?.preference,
            limit: params?.limit ?? 8,
          });
          set({ feed: videos, hasMore: false });
        }
      } else {
        // \u5176\u4ed6\u5206\u7c7b\uff1a\u4eceB\u7ad9\u641c\u7d22\u771f\u5b9e\u89c6\u9891\uff08\u5e26\u5c01\u9762\u56fe\uff09
        const videos = await workoutService.fetchBilibiliFeed(get().currentCategory, 12);
        set({ feed: videos, hasMore: false });
      }
    } catch (error) {
      // B\u7ad9\u641c\u7d22\u5931\u8d25\u65f6\u964d\u7ea7\u5230\u672c\u5730\u6570\u636e
      try {
        const fallback = await workoutService.fetchWorkoutByCategory(get().currentCategory);
        set({ feed: fallback, hasMore: false });
      } catch {
        set({ error: (error as Error).message || '\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  switchCategory: async (currentCategory, params) => {
    set({ currentCategory, feed: [], page: 1, hasMore: false, error: '' });
    await get().fetchFeed(params);
  },

  loadMore: async () => {
    if (!getToken() || get().isLoading || get().isLoadingMore || !get().hasMore) return;
    const nextPage = get().page + 1;
    set({ isLoadingMore: true });
    try {
      const slug = CATEGORY_SLUGS[get().currentCategory] || 'recommended';
      const result = slug === 'recommended'
        ? await workoutService.fetchFeed({ category: slug, page: nextPage, pageSize: 6 })
        : await workoutService.fetchWorkoutsByCategory(slug, { page: nextPage, pageSize: 6 });
      const existingIds = new Set(get().feed.map((video) => video.id));
      set({
        feed: [...get().feed, ...result.items.filter((video: WorkoutVideo) => !existingIds.has(video.id))],
        page: nextPage,
        hasMore: result.hasMore,
      });
    } catch (error) {
      set({ error: (error as Error).message || '\u52a0\u8f7d\u66f4\u591a\u5931\u8d25' });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  toggleSave: async (video) => {
    const isSaved = get().savedVideos.some((item) => item.id === video.id);
    try {
      if (getToken()) {
        if (isSaved) await workoutService.unsaveWorkout(video.id);
        else await workoutService.saveWorkout(video.id);
      }
    } catch (error) {
      set({ error: (error as Error).message || '\u6536\u85cf\u64cd\u4f5c\u5931\u8d25' });
      return;
    }
    const savedVideos = isSaved
      ? get().savedVideos.filter((item) => item.id !== video.id)
      : [video, ...get().savedVideos];
    set({ savedVideos });
    await setScopedItem(KEY_SAVED, JSON.stringify(savedVideos));
  },

  addHistory: async (video) => {
    try {
      if (getToken()) await workoutService.completeWorkout(video.id);
    } catch (error) {
      set({ error: (error as Error).message || '训练记录保存失败' });
      throw error;
    }
    const completedAt = Date.now();
    const history = [
      { ...video, historyId: `${video.id}:${completedAt}`, completedAt },
      ...get().history,
    ].slice(0, 20);
    set({ history });
    await setScopedItem(KEY_HISTORY, JSON.stringify(history));
  },

  loadCategories: async () => {
    if (!getToken()) return;
    try {
      const categories = await workoutService.fetchCategories();
      if (categories) set({ categories });
    } catch (error) {
      set({ error: (error as Error).message || '\u5206\u7c7b\u52a0\u8f7d\u5931\u8d25' });
    }
  },

  refreshSaved: async () => {
    if (!getToken()) return;
    try {
      const [savedVideos, history] = await Promise.all([
        workoutService.fetchSavedWorkouts(),
        workoutService.fetchWorkoutHistory(),
      ]);
      set({ savedVideos, history, error: '' });
      await Promise.all([
        setScopedItem(KEY_SAVED, JSON.stringify(savedVideos)),
        setScopedItem(KEY_HISTORY, JSON.stringify(history)),
      ]);
    } catch (error) {
      set({ error: (error as Error).message || '视频收藏同步失败' });
    }
  },

  loadLocal: async () => {
    try {
      const [saved, history] = await Promise.all([
        getScopedItem(KEY_SAVED), getScopedItem(KEY_HISTORY),
      ]);
      set({ savedVideos: saved ? JSON.parse(saved) : [], history: history ? JSON.parse(history) : [] });
    } catch {
      set({ savedVideos: [], history: [] });
    }
  },

  clearLocalData: () => set({
    feed: [], categories: [], currentCategory: '\u4e3a\u4f60\u63a8\u8350', selectedVideo: null,
    savedVideos: [], history: [], isLoading: false, isLoadingMore: false,
    hasMore: false, page: 1, error: '',
  }),
}));
