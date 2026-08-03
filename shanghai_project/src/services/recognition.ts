import type { Ingredient } from '@/types/recipe';

import { api } from './api';

/** 识别食物图片（传 base64 数据串） */
export async function recognizeFood(base64: string): Promise<Ingredient[]> {
  const res = await api.post<{ ingredients: Ingredient[] }>('/api/recognize', {
    image: base64,
  });
  return res.data.ingredients;
}

/** 识别并获取详细营养信息（新 API） */
export async function recognizeFoodDetail(base64: string) {
  const res = await api.post('/api/v1/recognition/upload', { image: base64 });
  return res.data.data;
}

/** 确认/修正食材（新 API） */
export async function confirmIngredients(imageId: string, ingredients: any[]) {
  const res = await api.post('/api/v1/recognition/confirm', { imageId, ingredients });
  return res.data.data;
}

/** 获取识别历史（新 API） */
export async function fetchRecognitionHistory() {
  const res = await api.get('/api/v1/recognition/history');
  return res.data.data;
}