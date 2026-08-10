import { useEffect, useState } from 'react';

import { fetchRecipeCover } from '@/services/recipe';
import type { Recipe } from '@/types/recipe';

/**
 * 菜谱封面：
 * - 优先使用 sourceVideo 的封面（生成时绑定的原教程视频）；
 * - 无 sourceVideo 时，按需取推荐视频列表的第一条封面作为「菜品图」。
 * 返回的 coverUrl 需再经 recipeCoverUrl() 做 bilibili 封面代理。
 */
export function useRecipeCover(recipe: Recipe | null) {
  const sourceCover = recipe?.sourceVideo?.coverUrl ?? null;
  const recipeId = recipe?.id ?? null;
  // result：null 表示还在检索中；{cover} 表示已返回（cover 为 null 时用占位图）
  const [result, setResult] = useState<{ cover: string | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const [seenId, setSeenId] = useState<string | null>(recipeId);

  // 切换菜谱时重置异步检索状态（React 官方「props 变化时调整 state」模式，避免在 effect 里同步 setState）
  if (seenId !== recipeId) {
    setSeenId(recipeId);
    setResult(null);
    setFailed(false);
  }

  const coverUrl = sourceCover ?? result?.cover ?? null;
  const loading = !sourceCover && result === null && !failed;

  useEffect(() => {
    if (!recipe || recipe.sourceVideo?.coverUrl) return;
    let active = true;
    fetchRecipeCover(recipe)
      .then((cover) => { if (active) setResult({ cover: cover?.coverUrl ?? null }); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [recipe]);

  return { coverUrl, failed, setFailed, loading };
}
