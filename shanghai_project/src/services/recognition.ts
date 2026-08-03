import type { Ingredient } from '@/types/recipe';

import { api } from './api';

/** 识别食物图片（传 base64 数据串，不含 data: 前缀） */
export async function recognizeFood(base64: string): Promise<Ingredient[]> {
  const res = await api.post<{ ingredients: Ingredient[] }>('/api/recognize', {
    image: base64,
  });
  return res.data.ingredients;
}
