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
