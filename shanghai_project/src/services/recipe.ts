import type { Recipe, RecipeGenerateParams } from '@/types/recipe';

import { api } from './api';

/** AI 生成菜谱 */
export async function generateRecipe(params: RecipeGenerateParams): Promise<Recipe> {
  const res = await api.post<{ recipe: Recipe }>('/api/recipe/generate', params);
  return res.data.recipe;
}
