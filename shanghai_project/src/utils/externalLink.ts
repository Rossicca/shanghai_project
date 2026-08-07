import { Linking, Platform } from 'react-native';

/**
 * 打开外部链接（B站 / YouTube / 平台搜索页等）。
 *
 * - Web：用 `window.open(url, '_blank')` 开新标签页。**不能**用 `Linking.openURL`——
 *   expo-linking 的 web 实现是 `window.location = url`，会直接把当前 SPA 页面导航走，
 *   点完视频就回不到原页面了。
 * - 原生：走系统浏览器 / 深链。
 *
 * 注意：Web 端 `window.open` 依赖用户手势，请在点击回调里**同步**调用（不要在 `await`
 * 之后调用，否则可能被浏览器弹窗拦截）。
 */
export function openExternalLink(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return Promise.resolve();
  }
  return Linking.openURL(url);
}
