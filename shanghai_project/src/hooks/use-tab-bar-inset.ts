import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * 底部导航栏高度（仅 web 生效）。
 *
 * web 端 RN Modal 渲染在 body 层，不受 #root 内导航栏约束，
 * 底部弹层会盖住导航栏。返回导航栏顶部到窗口底部的距离，
 * 用它把弹层底部抬高到导航栏上边界；原生端 Modal 天然覆盖全屏，返回 0。
 */
export function useTabBarInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const measure = () => {
      const tab = document.querySelector('a[role="tab"]');
      if (!tab) return;
      const rect = tab.getBoundingClientRect();
      setInset(Math.max(0, window.innerHeight - rect.top));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return inset;
}
