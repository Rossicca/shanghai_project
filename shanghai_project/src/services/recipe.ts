import type { Recipe, RecipeCandidate, RecipeGenerateParams, RecipeSourceVideo, RecipeVideoRecommendation } from '@/types/recipe';
import { AI_TIMEOUT } from '@/constants/config';

import { api } from './api';

function mapRecipe(data: any): Recipe {
  return {
    id: String(data.recipeId || data.id),
    name: String(data.name || '未命名菜谱'),
    description: String(data.description || ''),
    coverEmoji: data.coverEmoji || '🍽️',
    sourceVideo: data.sourceVideo || null,
    calories: Number(data.nutrition?.calories ?? data.calories ?? 0),
    protein: Number(data.nutrition?.protein ?? data.protein ?? 0),
    carbs: Number(data.nutrition?.carbs ?? data.carbs ?? 0),
    fat: Number(data.nutrition?.fat ?? data.fat ?? 0),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: (data.steps || []).map((step: any) => typeof step === 'string' ? step : step.description),
    cookTime: Number(data.cookTime || 20),
    difficulty: data.difficulty || '简单',
    tips: Array.isArray(data.tips) ? data.tips : [],
    servings: Number(data.servings || 1),
    nutritionTarget: data.nutritionTarget || null,
    generationMode: data.generationMode || undefined,
    generationWarning: data.generationWarning || null,
    createdAt: Date.parse(data.createdAt) || Number(data.createdAt) || Date.now(),
  };
}

/** AI 生成菜谱（旧 API，兼容现有 store） */
export async function generateRecipe(params: RecipeGenerateParams): Promise<Recipe> {
  const res = await api.post<{ recipe: Recipe }>('/api/recipe/generate', params, { timeout: AI_TIMEOUT });
  return mapRecipe(res.data.recipe);
}

/** AI 生成菜谱（新 API） */
export async function generateRecipeV2(params: {
  sessionId?: string;
  ingredients: { name: string; amount: string }[];
  servings?: number;
  maxCookTime?: number;
  difficulty?: string;
  mealType?: string;
  conditions?: string[];
  selectedDish?: RecipeGenerateParams['selectedDish'];
}) {
  const res = await api.post('/api/v1/recipes/generate', params, { timeout: AI_TIMEOUT });
  return res.data.data;
}

export async function generateRecipeFromSession(
  sessionId: string | null,
  params: RecipeGenerateParams
): Promise<Recipe> {
  const data = await generateRecipeV2({
    sessionId: sessionId || undefined,
    ingredients: params.ingredients,
    servings: params.people,
    maxCookTime: params.cookTime,
    difficulty: params.difficulty,
    mealType: params.mealType === 'any' ? undefined : params.mealType,
    conditions: params.conditions,
    selectedDish: params.selectedDish,
  });
  return mapRecipe({
    ...data,
    cookTime: data.cookTime || params.cookTime,
    difficulty: data.difficulty || params.difficulty,
    servings: data.servings || params.people,
  });
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
export async function saveRecipe(recipe: Recipe): Promise<void> {
  await api.post(`/api/v1/recipes/${recipe.id}/save`, {
    // 旧版本生成的菜谱只有前端临时 ID。随收藏请求带上快照，后端可在校验后补建记录。
    recipe,
  });
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

/** 先根据食材和用户数据生成 6 个候选，再由用户选择最终菜谱。 */
export async function recommendRecipes(params: RecipeGenerateParams): Promise<{
  recommendations: RecipeCandidate[];
  generationMode: 'ai' | 'safe_fallback';
  generationWarning?: string | null;
}> {
  const res = await api.post('/api/recipe/recommendations', params, { timeout: AI_TIMEOUT });
  return {
    recommendations: res.data.data.recommendations || [],
    generationMode: res.data.data.generationMode || 'ai',
    generationWarning: res.data.data.generationWarning || null,
  };
}

/** 菜品图封面缓存（宽松检索，仅用于封面展示）。 */
const recipeCoverCache = new Map<string, { at: number; promise: Promise<{ coverUrl: string; video: RecipeSourceVideo } | null> }>();
const RECIPE_COVER_CACHE_TTL = 15 * 60 * 1000;

/** 菜品图封面：宽松匹配一条做法教程，取它的封面。只用于菜谱封面，不影响视频区的严格匹配。 */
export async function fetchRecipeCover(recipe: { name: string; videoSearchAliases?: string[] }) {
  const key = `${recipe.name}|${(recipe.videoSearchAliases || []).join(',')}`;
  const hit = recipeCoverCache.get(key);
  if (hit && Date.now() - hit.at < RECIPE_COVER_CACHE_TTL) return hit.promise;
  const promise = api.post<{ data: { coverUrl: string; video: RecipeSourceVideo } | null }>('/api/recipe/cover', {
    recipe: { name: recipe.name, videoSearchAliases: recipe.videoSearchAliases },
  }, { timeout: AI_TIMEOUT }).then((res) => res.data.data);
  recipeCoverCache.set(key, { at: Date.now(), promise });
  promise.catch(() => { if (recipeCoverCache.get(key)?.promise === promise) recipeCoverCache.delete(key); });
  return promise;
}

/** 菜谱视频检索结果缓存：详情页封面与视频区共用一次请求，避免重复检索。 */
const recipeVideosCache = new Map<string, { at: number; promise: Promise<RecipeVideoRecommendation> }>();
const RECIPE_VIDEOS_CACHE_TTL = 15 * 60 * 1000;

/** 实时检索与当前菜谱匹配的公开视频（按菜谱 id 缓存 15 分钟，去重并发请求）。 */
export async function fetchRecipeVideos(recipe: Recipe): Promise<RecipeVideoRecommendation> {
  const key = recipe.id || `${recipe.name}|${(recipe.ingredients || []).slice(0, 3).map((i) => i.name).join(',')}`;
  const hit = recipeVideosCache.get(key);
  if (hit && Date.now() - hit.at < RECIPE_VIDEOS_CACHE_TTL) return hit.promise;
  const promise = api.post<{ data: RecipeVideoRecommendation }>('/api/recipe/videos', {
    recipe: {
      name: recipe.name,
      videoSearchAliases: recipe.videoSearchAliases,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      sourceVideo: recipe.sourceVideo,
    },
  }, { timeout: AI_TIMEOUT }).then((res) => res.data.data);
  recipeVideosCache.set(key, { at: Date.now(), promise });
  promise.catch(() => { if (recipeVideosCache.get(key)?.promise === promise) recipeVideosCache.delete(key); });
  return promise;
}
