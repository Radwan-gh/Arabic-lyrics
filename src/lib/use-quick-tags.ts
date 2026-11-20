"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyTagChanges, hasTag } from "@/lib/tag-rules";
import { rememberTag } from "@/lib/use-tag-suggestions";

/**
 * حالة وسوم نشيد واحد مع تعديل سريع متفائل: يظهر التغيير فورًا ثم يُحفظ عبر
 * PATCH ‎/api/lyrics/[id]/tags. عند الفشل يُعاد الوضع السابق وتظهر رسالة.
 * يُطبَّق ردّ الخادم الأحدث فقط (النقرات المتتابعة لا تُرجع حالة قديمة).
 */
export function useQuickTags(lyricsId: string, initialTags: string[], onSaved?: (tags: string[]) => void) {
  const [tags, setTags] = useState(initialTags);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);
  const seq = useRef(0);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // مزامنة مع البيانات القادمة من الأب (تحديث الصفحة/القائمة) ما دام لا حفظ جارٍ.
  const initialKey = initialTags.join("\u0000");
  useEffect(() => {
    if (saving === 0) setTags(initialTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const toggle = useCallback(
    async (tag: string) => {
      const removing = hasTag(tags, tag);
      const change = removing ? { remove: [tag] } : { add: [tag] };
      const { tags: optimistic, overflow } = applyTagChanges(tags, change);
      if (overflow) {
        setError("وصلت إلى الحد الأقصى للوسوم");
        return;
      }
      const previous = tags;
      const id = ++seq.current;
      setTags(optimistic);
      setError(null);
      setSaving((n) => n + 1);
      try {
        const res = await fetch(`/api/lyrics/${lyricsId}/tags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "تعذّر حفظ الوسم");
        if (!removing) rememberTag(tag);
        if (id === seq.current) {
          setTags(data.tags);
          onSavedRef.current?.(data.tags);
        }
      } catch (e) {
        if (id === seq.current) {
          setTags(previous);
          setError(e instanceof TypeError ? "تعذّر الحفظ — تحقق من الاتصال" : (e as Error).message);
        }
      } finally {
        setSaving((n) => n - 1);
      }
    },
    [lyricsId, tags],
  );

  return { tags, toggle, error, saving: saving > 0, clearError: () => setError(null) };
}
