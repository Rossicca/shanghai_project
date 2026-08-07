import { useUserStore } from '@/store/userStore';

/**
 * 判断作者名是否为「我自己」。
 * 本地发帖固定用「我」；登录用户按昵称匹配。
 */
export function isSelfAuthor(name: string): boolean {
  if (name === '我') return true;
  const nick = useUserStore.getState().user?.nickname;
  return !!nick && nick === name;
}
