"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// حالة قائمة قابلة لإعادة الترتيب (المفضّلة بترتيب مخصّص، عناصر الوصلة): تبديل
// عنصرين متجاورين محليًا (تحديث متفائل) ثم حفظ الترتيب الكامل عبر `persist`.
// مشتركة بين القائمة بالأسهم (سطح المكتب) والقائمة بالسحب (الموبايل).
// ─────────────────────────────────────────────────────────────────────────────

export function useReorderableList<T>(initial: T[], getId: (item: T) => string, persist: (order: string[]) => void) {
  const [items, setItems] = useState(initial);

  // يُعاد التزامن مع الخادم كلما أُعيد جلب الصفحة (بحث/فرز/صفحة جديدة، أو
  // router.refresh() بعد إزالة عنصر من المفضلة) — تفادياً لعرض قائمة قديمة.
  useEffect(() => {
    setItems(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function move(index: number, target: number) {
    if (target < 0 || target >= items.length || target === index) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setItems(next);
    persist(next.map(getId));
  }

  return { items, move };
}
