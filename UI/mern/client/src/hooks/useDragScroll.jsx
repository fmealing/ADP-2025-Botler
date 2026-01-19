import { useEffect, useRef } from "react";

export function useDragScroll(enabled = true, options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let cleanup = null;
    let raf = null;

    const attach = () => {
      const el = ref.current;
      console.log("dragscroll attached to:", el);
      if (!el) {
        raf = requestAnimationFrame(attach);
        return;
      }

      let isDown = false;
      let startY = 0;
      let startScrollTop = 0;
      let dragging = false;
      let pointerId = null;

      const THRESHOLD = 10;

      const { allowLabelDrag = false } = options;

      const isInteractive = (target) => {
        if (!target) return false;

        const selector = allowLabelDrag
          ? "button, a, input, textarea, select, [role='button'], [data-no-drag]"
          : "button, a, input, textarea, select, label, [role='button'], [data-no-drag]";

        return !!target.closest(selector);
      };

      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (isInteractive(e.target)) return;

        isDown = true;
        dragging = false;
        pointerId = e.pointerId;

        startY = e.clientY;
        startScrollTop = el.scrollTop;
      };

      const onPointerMove = (e) => {
        if (!isDown) return;
        if (e.pointerId !== pointerId) return;

        const dy = e.clientY - startY;

        if (!dragging) {
          if (Math.abs(dy) < THRESHOLD) return;
          dragging = true;
          el.setPointerCapture?.(pointerId);
        }

        el.scrollTop = startScrollTop - dy;
      };

      const onPointerUp = () => {
        isDown = false;
        dragging = false;
        pointerId = null;
      };

      el.addEventListener("pointerdown", onPointerDown, { passive: true });
      el.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      cleanup = () => {
        el.removeEventListener("pointerdown", onPointerDown);
        el.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };
    };

    attach();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (cleanup) cleanup();
    };
  }, [enabled, options]);

  return ref;
}
