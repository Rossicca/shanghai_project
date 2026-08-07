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
      // 取最接近视口底部的 tab 元素（真正的底部导航栏），避免 querySelector
      // 匹配到页内其他 role="tab" 的装饰元素导致测量异常
      const tabs = document.querySelectorAll('a[role="tab"]');
      let bestTop = 0;
      let bestBottom = -Infinity;
      for (const t of tabs) {
        const r = t.getBoundingClientRect();
        if (r.bottom > bestBottom) {
          bestBottom = r.bottom;
          bestTop = r.top;
        }
      }
      if (!Number.isFinite(bestBottom)) return;
      // 底部导航栏高度 = 视口底部到 tab 顶部的距离；钳制在合理范围，防止测量异常把弹层推出屏幕
      setInset(Math.min(120, Math.max(0, window.innerHeight - bestTop)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return inset;
}
