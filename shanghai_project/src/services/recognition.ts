import { AI_TIMEOUT } from '@/constants/config';
import type { Ingredient } from '@/types/recipe';

import { api, getToken } from './api';

export interface RecognitionFlowResult {
  imageId: string | null;
  ingredients: Ingredient[];
}

export function normalizeImageBase64(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '')
    .replace(/\s+/g, '');
}

/** 游客兼容路径：支持单张或多张图片 */
export async function recognizeFood(base64: string | string[]): Promise<Ingredient[]> {
  const images = (Array.isArray(base64) ? base64 : [base64])
    .map(normalizeImageBase64)
    .filter(Boolean);
  if (images.length === 0) throw new Error('照片数据读取失败，请重新拍照');
  const res = await api.post<{ ingredients: Ingredient[] }>('/api/recognize',
    { images, image: images[0] },
    { timeout: AI_TIMEOUT }
  );
  return res.data.ingredients;
}

/** 登录用户的主流程使用 v1 契约，游客保留兼容接口。支持多图。 */
export async function recognizeFoodForFlow(base64: string | string[]): Promise<RecognitionFlowResult> {
  if (!getToken()) return { imageId: null, ingredients: await recognizeFood(base64) };
  // v1 暂不支持多图，取第一张
  const single = Array.isArray(base64) ? base64[0] : base64;
  const detail = await recognizeFoodDetail(single);
  // 如果有多张，合并游客路径的识别结果
  if (Array.isArray(base64) && base64.length > 1) {
    const guestResult = await recognizeFood(base64);
    const merged = new Map<string, any>();
    for (const item of [...(detail.ingredients || []), ...guestResult]) {
      const key = String(item.name || '').trim();
      if (!key) continue;
      const existing = merged.get(key);
      if (!existing || (item.confidence || 0) > (existing.confidence || 0)) {
        merged.set(key, item);
      }
    }
    return { imageId: detail.imageId, ingredients: [...merged.values()].map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: `${item.estimatedAmount ?? item.amount ?? 100}${item.unit || 'g'}`,
      confidence: Number(item.confidence ?? 0),
      category: item.category,
      unit: item.unit || 'g',
    })) };
  }
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
  const image = normalizeImageBase64(base64);
  if (!image) throw new Error('照片数据读取失败，请重新拍照');
  const res = await api.post('/api/v1/recognition/upload', { image }, { timeout: AI_TIMEOUT });
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
