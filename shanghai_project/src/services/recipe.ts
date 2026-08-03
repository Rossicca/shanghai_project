import type { Recipe, RecipeGenerateParams } from '@/types/recipe';

import { api } from './api';

/** AI 生成菜谱（旧 API，兼容现有 store） */
export async function generateRecipe(params: RecipeGenerateParams): Promise<Recipe> {
  const res = await api.post<{ recipe: Recipe }>('/api/recipe/generate', params);
  return res.data.recipe;
}

/** AI 生成菜谱（新 API） */
export async function generateRecipeV2(params: {
  ingredients: { name: string; amount: string }[];
  servings?: number;
  maxCookTime?: number;
  difficulty?: string;
  mealType?: string;
}) {
  const res = await api.post('/api/v1/recipes/generate', params);
  return res.data.data;
}

/** 换做法 */
export async function reimagineRecipe(recipeId: string, style?: string) {
  const res = await api.post(`/api/v1/recipes/${recipeId}/reimagine`, { style });
  return res.data.data;
}

/** 获取菜谱详情 */
export async function fetchRecipe(recipeId: string): Promise<Recipe> {
  const res = await api.get(`/api/v1/recipes/${recipeId}`);
  return res.data.data;
}

/** 收藏菜谱 */
export async function saveRecipe(recipeId: string): Promise<void> {
  await api.post(`/api/v1/recipes/${recipeId}/save`);
}

/** 取消收藏 */
export async function unsaveRecipe(recipeId: string): Promise<void> {
  await api.delete(`/api/v1/recipes/${recipeId}/save`);
}

/** 获取收藏列表 */
export async function fetchSavedRecipes() {
  const res = await api.get('/api/v1/recipes/saved/list');
  return res.data.data;
}

/** 获取菜谱历史 */
export async function fetchRecipeHistory() {
  const res = await api.get('/api/v1/recipes/history/list');
  return res.data.data;
}