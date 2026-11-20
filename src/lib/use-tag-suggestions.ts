"use client";

import { useEffect, useState } from "react";
import { hasTag } from "@/lib/tag-rules";

export interface TagSuggestion {
  tag: string;
  count: number;
}

// ذاكرة على مستوى الوحدة: تُجلب الوسوم مرة واحدة للصفحة كلها، لا لكل بطاقة.
let cache: TagSuggestion[] | null = null;
let inflight: Promise<TagSuggestion[]> | null = null;
const listeners = new Set<(tags: TagSuggestion[]) => void>();

function load(): Promise<TagSuggestion[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/tags?withCounts=1")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { tags?: TagSuggestion[] }) => {
        cache = d.tags ?? [];
        return cache;
      })
      .catch(() => [] as TagSuggestion[])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** يُضاف وسم جديد أنشأه المستخدم إلى الاقتراحات فورًا (دون إعادة الجلب). */
export function rememberTag(tag: string, count = 1) {
  if (!cache || hasTag(cache.map((t) => t.tag), tag)) return;
  cache = [...cache, { tag, count }];
  listeners.forEach((l) => l(cache!));
}

/** اقتراحات الوسوم (الأكثر استخدامًا أولاً)، تُحمَّل عند أول فتح فقط (`enabled`). */
export function useTagSuggestions(enabled: boolean): TagSuggestion[] | null {
  const [tags, setTags] = useState<TagSuggestion[] | null>(cache);

  useEffect(() => {
    listeners.add(setTags);
    return () => {
      listeners.delete(setTags);
    };
  }, []);

  useEffect(() => {
    if (!enabled || tags) return;
    let alive = true;
    load().then((t) => alive && setTags(t));
    return () => {
      alive = false;
    };
  }, [enabled, tags]);

  return tags;
}
