"use client";

import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Drag offset for a floating panel (e.g. analysis). Resets when `resetKey` changes.
 */
export function useAnalysisPanelDrag(resetKey?: string) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [resetKey]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX - offset.x;
    const startY = e.clientY - offset.y;
    const onMove = (ev: globalThis.PointerEvent) => {
      setOffset({
        x: ev.clientX - startX,
        y: ev.clientY - startY,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [offset.x, offset.y]);

  return { offset, onPointerDown };
}
