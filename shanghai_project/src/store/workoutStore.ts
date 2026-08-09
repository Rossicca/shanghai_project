import { create } from 'zustand';

import { getToken } from '@/services/api';
import { getScopedItem, setScopedItem } from '@/services/scopedStorage';
import * as workoutService from '@/services/workout';
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
  isRefreshing: boolean;
  refreshNotice: string;
  hasMore: boolean;
  page: number;
  error: string;
  selectVideo: (video: WorkoutVideo) => void;
  fetchFeed: (params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  refreshFeed: (params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  switchCategory: (category: string, params?: Partial<WorkoutRecommendParams>) => Promise<void>;
  loadMore: () => Promise<void>;
  toggleSave: (video: WorkoutVideo) => Promise<void>;
  addHistory: (video: WorkoutVideo) => Promise<void>;
  loadLocal: () => Promise<void>;
  loadCategories: () => Promise<void>;
  clearLocalData: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  feed: [], categories: [], currentCategory: '\u4e3a\u4f60\u63a8\u8350', selectedVideo: null,
  savedVideos: [], history: [], isLoading: false, isLoadingMore: false,
  isRefreshing: false, refreshNotice: '',
  hasMore: false, page: 1, error: '',

  selectVideo: (selectedVideo) => set({ selectedVideo }),

  fetchFeed: async (params) => {
    set({ isLoading: true, error: '', page: 1 });
    try {
      if (getToken()) {
        const slug = CATEGORY_SLUGS[get().currentCategory] || 'recommended';
        const result = await workoutService.refreshWorkoutFeed({ category: slug, limit: 6 });
        set({ feed: result.items, hasMore: result.items.length >= 6, page: 1 });
      } else if (get().currentCategory === '\u4e3a\u4f60\u63a8\u8350') {
        const videos = await workoutService.recommendWorkout({
          bodyData: params?.bodyData ?? undefined,
          goal: params?.goal,
          preference: params?.preference,
          limit: params?.limit ?? 8,
        });
        set({ feed: videos, hasMore: false });
      } else {
        const videos = await workoutService.fetchWorkoutByCategory(get().currentCategory);
        set({ feed: videos, hasMore: false });
      }
    } catch (error) {
      set({ error: (error as Error).message || '\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5' });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshFeed: async (params) => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true, error: '', refreshNotice: '' });
    try {
      if (getToken()) {
        const slug = CATEGORY_SLUGS[get().currentCategory] || 'recommended';
        const result = await workoutService.refreshWorkoutFeed({
          category: slug,
          excludeIds: get().feed.map((video) => video.id),
          limit: params?.limit ?? 6,
        });
        set({
          feed: result.items,
          page: 1,
          hasMore: result.items.length >= 6,
          refreshNotice: result.generationMode === 'ai'
            ? '\u5df2\u6839\u636e\u4f60\u7684\u8d44\u6599\u6362\u4e86\u4e00\u7ec4'
            : (result.generationWarning || '\u5df2\u4ece\u5b89\u5168\u89c6\u9891\u5e93\u6362\u4e86\u4e00\u7ec4'),
        });
      } else {
        await get().fetchFeed(params);
        set({ refreshNotice: '\u5df2\u4e3a\u4f60\u6362\u4e86\u4e00\u7ec4\u89c6\u9891' });
      }
    } catch (error) {
      set({ error: (error as Error).message || '\u6682\u65f6\u65e0\u6cd5\u5237\u65b0\u63a8\u8350' });
    } finally {
      set({ isRefreshing: false });
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
      const result = await workoutService.refreshWorkoutFeed({
        category: slug,
        excludeIds: get().feed.map((video) => video.id),
        limit: 6,
      });
      const existingIds = new Set(get().feed.map((video) => video.id));
      const newItems = result.items.filter((video: WorkoutVideo) => !existingIds.has(video.id));
      set({
        feed: [...get().feed, ...newItems],
        page: nextPage,
        hasMore: newItems.length >= 3,
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
    const history = get().history.some((item) => item.id === video.id)
      ? get().history
      : [video, ...get().history].slice(0, 20);
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

  /** 登出时清空内存态，避免下一个账号看到上一个账号的数据 */
  clearLocalData: () => set({
    feed: [], categories: [], currentCategory: '为你推荐', selectedVideo: null,
    savedVideos: [], history: [], isLoading: false, isLoadingMore: false,
    isRefreshing: false, refreshNotice: '',
    hasMore: false, page: 1, error: '',
  }),
}));
