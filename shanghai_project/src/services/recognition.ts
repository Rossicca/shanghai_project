import { AI_TIMEOUT } from '@/constants/config';
import type { Ingredient } from '@/types/recipe';

import { api, getToken } from './api';

export interface RecognitionFlowResult {
  imageId: string | null;
  ingredients: Ingredient[];
}

/** 游客兼容路径：不伪装 v1 已完成。 */
export async function recognizeFood(base64: string): Promise<Ingredient[]> {
  const res = await api.post<{ ingredients: Ingredient[] }>('/api/recognize',
    { image: base64 },
    { timeout: AI_TIMEOUT }
  );
  return res.data.ingredients;
}

/** 登录用户的主流程使用 v1 契约，游客保留兼容接口。 */
export async function recognizeFoodForFlow(base64: string): Promise<RecognitionFlowResult> {
  if (!getToken()) return { imageId: null, ingredients: await recognizeFood(base64) };

  const detail = await recognizeFoodDetail(base64);
  return {
    imageId: detail.imageId,
    ingredients: (detail.ingredients || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: `${item.estimatedAmount ?? 100}${item.unit || 'g'}`,
      confidence: Number(item.confidence ?? 0),
      category: item.category,
      unit: item.unit || 'g',
    })),
  };
}

export async function recognizeFoodDetail(base64: string) {
  const res = await api.post('/api/v1/recognition/upload', { image: base64 }, { timeout: AI_TIMEOUT });
  return res.data.data;
}

export async function confirmIngredients(imageId: string, ingredients: Ingredient[]) {
  const normalized = ingredients.map((item) => {
    const match = String(item.amount || '').match(/([\d.]+)\s*([^\d\s]*)/);
    return {
      name: String(item.name || '').trim(),
      amount: match ? Number(match[1]) : 100,
      unit: match?.[2] || item.unit || 'g',
    };
  });
  const res = await api.post('/api/v1/recognition/confirm', { imageId, ingredients: normalized });
  return res.data.data;
}

export async function fetchRecognitionHistory() {
  const res = await api.get('/api/v1/recognition/history');
  return res.data.data;
}
