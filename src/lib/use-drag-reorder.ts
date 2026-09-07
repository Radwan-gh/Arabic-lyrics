"use client";

import { useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// سحب-لإعادة-الترتيب باللمس/الفأرة عبر مقبض واحد لكل صف (بديل بصري لأزرار ▲▼،
// يُستخدم في قوائم الموبايل: المفضلة بترتيب مخصّص، عناصر الوصلة). يُبقي الصف
// المسحوب في تدفّق القائمة الطبيعي ويُبدّله مع جاره كلما عبر منتصف ارتفاعه،
// فلا حاجة لطبقة "شبح" عائمة منفصلة.
// ─────────────────────────────────────────────────────────────────────────────

export function useDragReorder(itemCount: number, onMove: (from: number, to: number) => void) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const startY = useRef(0);
  const rowHeight = useRef(64);
  const dragIndexRef = useRef<number | null>(null);

  function startDrag(index: number, e: React.PointerEvent<HTMLElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const row = e.currentTarget.closest("[data-drag-row]") as HTMLElement | null;
    rowHeight.current = row?.getBoundingClientRect().height || 64;
    startY.current = e.clientY;
    dragIndexRef.current = index;
    setDraggingIndex(index);
    setOffsetY(0);
  }

  function onDragMove(e: React.PointerEvent<HTMLElement>) {
    if (dragIndexRef.current === null) return;
    const dy = e.clientY - startY.current;
    setOffsetY(dy);
    const steps = Math.round(dy / rowHeight.current);
    if (steps !== 0) {
      const from = dragIndexRef.current;
      const to = Math.min(itemCount - 1, Math.max(0, from + steps));
      if (to !== from) {
        onMove(from, to);
        dragIndexRef.current = to;
        startY.current = e.clientY;
        setDraggingIndex(to);
        setOffsetY(0);
      }
    }
  }

  function endDrag() {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setOffsetY(0);
  }

  function onKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMove(index, index - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onMove(index, index + 1);
    }
  }

  return { draggingIndex, offsetY, startDrag, onDragMove, endDrag, onKeyDown };
}
