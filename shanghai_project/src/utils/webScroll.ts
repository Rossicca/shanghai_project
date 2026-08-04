import { useEffect, type RefObject } from 'react';

/**
 * Web 专用：让横向 ScrollView 支持鼠标拖拽平移（可选：滚轮横向滚动）。
 * 解决桌面浏览器横向列表鼠标"动不了"的问题——滚轮默认只纵向滚动，且无拖拽平移。
 * 依赖 react-native-web 的 ScrollView#getScrollableNode。
 *
 * @param ref 横向 ScrollView 的 ref
 * @param opts.panOnWheel 为 true 时滚轮也会横向滚动（用于无纵向滚动的区域，如练页分类栏）；
 *                        默认 false（如首页推文区，滚轮仍纵向翻页，仅拖拽平移卡片）
 */
export function useWebHorizontalDrag(ref: RefObject<unknown>, opts?: { panOnWheel?: boolean }) {
  const { panOnWheel = false } = opts ?? {};

  useEffect(() => {
    const r = ref.current as { getScrollableNode?: () => HTMLElement | null } | null;
    const node = r?.getScrollableNode?.() ?? null;
    if (!node) return;

    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let suppressClick = false;

    // 鼠标滚轮 → 横向滚动
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    };

    // 鼠标拖拽 → 横向平移（超过阈值才生效，避免误触发卡片内按钮）
    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startScroll = node.scrollLeft;
      dragging = true;
      suppressClick = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) suppressClick = true;
      if (suppressClick) {
        e.preventDefault();
        node.scrollLeft = startScroll - dx;
      }
    };
    const onMouseUp = () => {
      dragging = false;
      if (suppressClick) {
        // 拖拽结束后拦截这一次 click，避免误触发卡片上的按钮
        const killClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          document.removeEventListener('click', killClick, true);
        };
        document.addEventListener('click', killClick, true);
        setTimeout(() => document.removeEventListener('click', killClick, true), 300);
        suppressClick = false;
      }
    };

    node.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    if (panOnWheel) node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (panOnWheel) node.removeEventListener('wheel', onWheel);
    };
  }, [ref, panOnWheel]);
}
