import type { Recipe, RecipeGenerateParams } from '@/types/recipe';
import { AI_TIMEOUT } from '@/constants/config';

import { api } from './api';

/** AI 生成菜谱（旧 API，兼容现有 store） */
export async function generateRecipe(params: RecipeGenerateParams): Promise<Recipe> {
  const res = await api.post<{ recipe: Recipe }>('/api/recipe/generate', params, { timeout: AI_TIMEOUT });
  return res.data.recipe;
}

/** AI 生成菜谱（新 API） */
export async function generateRecipeV2(params: {
  sessionId?: string;
  ingredients: { name: string; amount: string }[];
  servings?: number;
  maxCookTime?: number;
  difficulty?: string;
  mealType?: string;
}) {
  const res = await api.post('/api/v1/recipes/generate', params, { timeout: AI_TIMEOUT });
  return res.data.data;
}

export async function generateRecipeFromSession(
  sessionId: string,
  params: RecipeGenerateParams
): Promise<Recipe> {
  const data = await generateRecipeV2({
    sessionId,
    ingredients: params.ingredients,
    servings: params.people,
    maxCookTime: params.cookTime,
    difficulty: params.difficulty,
    mealType: 'lunch',
  });
  return {
    id: data.recipeId,
    name: data.name,
    description: data.description || '',
    coverEmoji: data.coverEmoji || '🍽️',
    calories: Number(data.nutrition?.calories || 0),
    protein: Number(data.nutrition?.protein || 0),
    carbs: Number(data.nutrition?.carbs || 0),
    fat: Number(data.nutrition?.fat || 0),
    ingredients: data.ingredients || [],
    steps: (data.steps || []).map((step: any) => typeof step === 'string' ? step : step.description),
    cookTime: Number(data.cookTime || params.cookTime),
    difficulty: data.difficulty || params.difficulty,
    tips: data.tips || [],
    servings: data.servings || params.people,
    nutritionTarget: data.nutritionTarget || null,
    createdAt: Date.parse(data.createdAt) || Date.now(),
  };
}

/** 换做法 */
export async function reimagineRecipe(recipeId: string, style?: string): Promise<Recipe> {
  const res = await api.post(`/api/v1/recipes/${recipeId}/reimagine`, { style }, { timeout: AI_TIMEOUT });
  const data = res.data.data;
  return {
    ...data,
    id: data.recipeId || data.id,
    createdAt: Date.parse(data.createdAt) || Date.now(),
  };
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
