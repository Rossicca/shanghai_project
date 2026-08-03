import { getScopedItem, setScopedItem } from './scopedStorage';

const KEY = 'ingredient:history';

/** 最近识别的食材名（去重，最多 12 个） */
export async function loadIngredientHistory(): Promise<string[]> {
  try {
    const raw = await getScopedItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addIngredientHistory(names: string[]): Promise<void> {
  const prev = await loadIngredientHistory();
  const merged = [...names, ...prev];
  const unique = Array.from(new Set(merged)).slice(0, 12);
  await setScopedItem(KEY, JSON.stringify(unique));
}
