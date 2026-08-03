import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import * as recipeService from '@/services/recipe';
import type { Ingredient, Recipe, RecipeGenerateParams } from '@/types/recipe';

const KEY_SAVED = 'recipe:saved';
const KEY_HISTORY = 'recipe:history';

interface RecipeState {
  currentIngredients: Ingredient[];
  currentRecipe: Recipe | null;
  savedRecipes: Recipe[];
  recipeHistory: Recipe[];
  isLoading: boolean;
  setIngredients: (ingredients: Ingredient[]) => void;
  selectRecipe: (recipe: Recipe) => void;
  generateRecipe: (params: RecipeGenerateParams) => Promise<Recipe>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  loadLocal: () => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  currentIngredients: [],
  currentRecipe: null,
  savedRecipes: [],
  recipeHistory: [],
  isLoading: false,

  setIngredients: (currentIngredients) => set({ currentIngredients }),

  selectRecipe: (currentRecipe) => set({ currentRecipe }),

  generateRecipe: async (params) => {
    set({ isLoading: true });
    try {
      const recipe = await recipeService.generateRecipe(params);
      recipe.createdAt = Date.now();
      set((s) => ({
        currentRecipe: recipe,
        recipeHistory: [recipe, ...s.recipeHistory].slice(0, 20),
      }));
      AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(get().recipeHistory)).catch(() => {});
      return recipe;
    } finally {
      set({ isLoading: false });
    }
  },

  saveRecipe: async (recipe) => {
    const saved = get().savedRecipes.some((r) => r.id === recipe.id)
      ? get().savedRecipes
      : [recipe, ...get().savedRecipes];
    set({ savedRecipes: saved });
    await AsyncStorage.setItem(KEY_SAVED, JSON.stringify(saved));
  },

  loadLocal: async () => {
    try {
      const [saved, history] = await Promise.all([
        AsyncStorage.getItem(KEY_SAVED),
        AsyncStorage.getItem(KEY_HISTORY),
      ]);
      set({
        savedRecipes: saved ? JSON.parse(saved) : [],
        recipeHistory: history ? JSON.parse(history) : [],
      });
    } catch {
      // ignore
    }
  },
}));
