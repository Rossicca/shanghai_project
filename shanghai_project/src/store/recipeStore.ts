import { create } from 'zustand';

import * as recipeService from '@/services/recipe';
import { getScopedItem, setScopedItem } from '@/services/scopedStorage';
import { getToken } from '@/services/api';
import type { Ingredient, Recipe, RecipeCandidate, RecipeGenerateParams } from '@/types/recipe';

const KEY_SAVED = 'recipe:saved';
const KEY_HISTORY = 'recipe:history';

interface RecipeState {
  currentIngredients: Ingredient[];
  recognitionSessionId: string | null;
  currentRecipe: Recipe | null;
  savedRecipes: Recipe[];
  recipeHistory: Recipe[];
  recipeQueue: RecipeCandidate[];
  recipeQueueParams: RecipeGenerateParams | null;
  recipeQueueRecipeId: string | null;
  recipeQueueTotal: number;
  isLoading: boolean;
  error: string;
  setIngredients: (ingredients: Ingredient[]) => void;
  setRecognitionSessionId: (sessionId: string | null) => void;
  selectRecipe: (recipe: Recipe) => void;
  setRecipeQueue: (candidates: RecipeCandidate[], params: RecipeGenerateParams, recipeId: string) => void;
  advanceRecipeQueue: (recipeId: string) => void;
  moveRecipeQueue: (recipeId: string) => void;
  clearRecipeQueue: () => void;
  generateRecipe: (params: RecipeGenerateParams) => Promise<Recipe>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  loadLocal: () => Promise<void>;
  refreshSaved: () => Promise<void>;
  refreshRemote: () => Promise<void>;
  clearLocalData: () => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  currentIngredients: [],
  recognitionSessionId: null,
  currentRecipe: null,
  savedRecipes: [],
  recipeHistory: [],
  recipeQueue: [],
  recipeQueueParams: null,
  recipeQueueRecipeId: null,
  recipeQueueTotal: 0,
    isLoading: false,
    error: '',

  setIngredients: (currentIngredients) => set({ currentIngredients }),
  setRecognitionSessionId: (recognitionSessionId) => set({ recognitionSessionId }),

  selectRecipe: (currentRecipe) => set({ currentRecipe }),

  setRecipeQueue: (recipeQueue, recipeQueueParams, recipeQueueRecipeId) => set({
    recipeQueue,
    recipeQueueParams,
    recipeQueueRecipeId,
    recipeQueueTotal: recipeQueue.length + 1,
  }),

  advanceRecipeQueue: (recipeQueueRecipeId) => set((state) => ({
    recipeQueue: state.recipeQueue.slice(1),
    recipeQueueRecipeId,
  })),

  moveRecipeQueue: (recipeQueueRecipeId) => set({ recipeQueueRecipeId }),

  clearRecipeQueue: () => set({
    recipeQueue: [],
    recipeQueueParams: null,
    recipeQueueRecipeId: null,
    recipeQueueTotal: 0,
  }),

  generateRecipe: async (params) => {
    set({ isLoading: true });
    try {
      const sessionId = get().recognitionSessionId;
      // 登录用户始终走会持久化到 SQLite 的 v1 接口；没有识别会话时也可用手动食材生成。
      // 游客继续使用兼容接口并保存到本机，避免强制登录打断试用流程。
      const recipe = getToken()
        ? await recipeService.generateRecipeFromSession(sessionId, params)
        : await recipeService.generateRecipe(params);
      recipe.createdAt = Date.now();
      set((s) => ({
        currentRecipe: recipe,
        recipeHistory: [recipe, ...s.recipeHistory].slice(0, 20),
      }));
      setScopedItem(KEY_HISTORY, JSON.stringify(get().recipeHistory)).catch(() => {});
      return recipe;
    } finally {
      set({ isLoading: false });
    }
  },

  saveRecipe: async (recipe) => {
    set({ error: '' });
    if (getToken()) {
      await recipeService.saveRecipe(recipe).catch((error) => {
        const message = (error as Error).message || '收藏失败，请重试';
        set({ error: message });
        throw error;
      });
    }
    const saved = get().savedRecipes.some((r) => r.id === recipe.id)
      ? get().savedRecipes
      : [recipe, ...get().savedRecipes];
    set({ savedRecipes: saved });
    await setScopedItem(KEY_SAVED, JSON.stringify(saved));
  },

  unsaveRecipe: async (recipeId) => {
    set({ error: '' });
    if (getToken()) {
      await recipeService.unsaveRecipe(recipeId).catch((error) => {
        const message = (error as Error).message || '取消收藏失败，请重试';
        set({ error: message });
        throw error;
      });
    }
    const saved = get().savedRecipes.filter((r) => r.id !== recipeId);
    set({ savedRecipes: saved });
    await setScopedItem(KEY_SAVED, JSON.stringify(saved));
  },

  refreshSaved: async () => {
    try {
      const data = await recipeService.fetchSavedRecipes();
      if (data) {
        set({ savedRecipes: data, error: '' });
        await setScopedItem(KEY_SAVED, JSON.stringify(data));
      }
    } catch (error) {
      set({ error: (error as Error).message || '收藏列表刷新失败' });
    }
  },

  refreshRemote: async () => {
    try {
      const [savedRecipes, recipeHistory] = await Promise.all([
        recipeService.fetchSavedRecipes(),
        recipeService.fetchRecipeHistory(),
      ]);
      set({ savedRecipes, recipeHistory, error: '' });
      await Promise.all([
        setScopedItem(KEY_SAVED, JSON.stringify(savedRecipes)),
        setScopedItem(KEY_HISTORY, JSON.stringify(recipeHistory)),
      ]);
    } catch (error) {
      set({ error: (error as Error).message || '菜谱数据同步失败' });
    }
  },

  loadLocal: async () => {
    try {
      const [saved, history] = await Promise.all([
        getScopedItem(KEY_SAVED),
        getScopedItem(KEY_HISTORY),
      ]);
      set({
        savedRecipes: saved ? JSON.parse(saved) : [],
        recipeHistory: history ? JSON.parse(history) : [],
      });
    } catch {
      // ignore
    }
  },

  clearLocalData: () => set({
    currentIngredients: [], recognitionSessionId: null, currentRecipe: null,
    savedRecipes: [], recipeHistory: [], recipeQueue: [], recipeQueueParams: null,
    recipeQueueRecipeId: null, recipeQueueTotal: 0, isLoading: false, error: '',
  }),
}));
