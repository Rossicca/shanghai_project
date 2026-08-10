import { API_BASE_URL } from '@/constants/config';

export function recipeCoverUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && /(^|\.)hdslb\.com$/i.test(parsed.hostname)) {
      return `${API_BASE_URL}/api/media/bilibili-cover?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return undefined;
  }
  return /^https:\/\//.test(url) ? url : undefined;
}

/**
 * 健康饮食灵感图片解析：
 * - `/covers/xxx.webp`：本地抖音封面，由后端 /covers 路由提供
 * - `https://i*.hdslb.com/...`：B站封面，走 /api/media/bilibili-cover 代理（避免直连被拒）
 * - 其余 https（Unsplash 等）原样返回
 */
export function inspirationImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/covers/')) return `${API_BASE_URL}${url}`;
  return recipeCoverUrl(url) ?? url;
}
