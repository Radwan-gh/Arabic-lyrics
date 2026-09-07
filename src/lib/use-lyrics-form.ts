"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toEditableHtml } from "@/lib/lyrics-content";

export type DuplicateMatch = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
};

export interface LyricsFormValues {
  title: string;
  artist: string;
  album: string;
  content: string;
  tags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// منطق نموذج الأنشودة (إنشاء/تعديل) مستخرَج من LyricsForm ليُعاد استخدامه في
// عرض سطح المكتب الحالي وشاشة الموبايل الجديدة معاً — نسخة واحدة من حالة النموذج
// وفحص التكرار (debounced) بدل تكرارها في مكوّنين مستقلّين.
// ─────────────────────────────────────────────────────────────────────────────
export function useLyricsForm({
  mode,
  lyricsId,
  initialValues,
}: {
  mode: "create" | "edit";
  lyricsId?: string;
  initialValues?: Partial<LyricsFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LyricsFormValues>({
    title: initialValues?.title ?? "",
    artist: initialValues?.artist ?? "",
    album: initialValues?.album ?? "",
    content: initialValues?.content ?? "",
    tags: initialValues?.tags ?? [],
  });
  const [initialContentHtml] = useState(() => toEditableHtml(initialValues?.content ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [suggestions, setSuggestions] = useState<DuplicateMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const title = values.title.trim();
    if (!title) {
      setDuplicates([]);
      setSuggestions([]);
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ title });
        if (mode === "edit" && lyricsId) params.set("excludeId", lyricsId);
        const res = await fetch(`/api/lyrics/check?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setDuplicates(Array.isArray(data.matches) ? data.matches : []);
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        // تجاهل أخطاء الإلغاء/الشبكة — الفحص النهائي على الخادم عند الحفظ.
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [values.title, mode, lyricsId]);

  async function submit(allowDuplicate: boolean) {
    setLoading(true);
    setError(null);

    const payload = {
      title: values.title,
      artist: values.artist,
      album: values.album,
      content: values.content,
      tags: values.tags,
      allowDuplicate,
    };

    const res = await fetch(mode === "create" ? "/api/lyrics" : `/api/lyrics/${lyricsId}`, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.duplicates)) {
        setDuplicates(data.duplicates);
      }
      setError(data.error || "حدث خطأ ما");
      return;
    }

    const saved = await res.json();
    router.push(`/lyrics/${saved.id ?? lyricsId}`);
    router.refresh();
  }

  return {
    values,
    setValues,
    initialContentHtml,
    error,
    loading,
    duplicates,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    checking,
    submit,
  };
}
