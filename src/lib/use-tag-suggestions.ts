"use client";

import { useEffect, useState } from "react";
import { hasTag, pushRecentTags } from "@/lib/tag-rules";

export interface TagSuggestion {
  tag: string;
  count: number;
}

export interface TagSuggestions {
  /** كل الوسوم، الأكثر استخدامًا أولاً. */
  tags: TagSuggestion[];
  /** آخر وسوم أضافها المستخدم الحالي (الأحدث أولاً). */
  recent: string[];
}

// ذاكرة على مستوى الوحدة: تُجلب الوسوم مرة واحدة للصفحة كلها، لا لكل بطاقة.
let cache: TagSuggestions | null = null;
let inflight: Promise<TagSuggestions> | null = null;
const listeners = new Set<(s: TagSuggestions) => void>();

function load(): Promise<TagSuggestions> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/tags?withCounts=1")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Partial<TagSuggestions>) => {
        cache = { tags: d.tags ?? [], recent: d.recent ?? [] };
        return cache;
      })
      .catch(() => ({ tags: [], recent: [] }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * بعد إضافة وسم: يُنقل إلى مقدّمة «آخر ما استخدمته» فورًا، ويُضاف إلى الاقتراحات
 * إن كان جديدًا (دون إعادة الجلب). الخادم يسجّل الترتيب نفسه للزيارات اللاحقة.
 */
export function rememberTag(tag: string, count = 1) {
  if (!cache) return;
  const known = cache.tags.map((t) => t.tag);
  cache = {
    tags: hasTag(known, tag) ? cache.tags : [...cache.tags, { tag, count }],
    recent: pushRecentTags(cache.recent, [tag]),
  };
  listeners.forEach((l) => l(cache!));
}

/** اقتراحات الوسوم، تُحمَّل عند أول فتح فقط (`enabled`). */
export function useTagSuggestions(enabled: boolean): TagSuggestions | null {
  const [data, setData] = useState<TagSuggestions | null>(cache);

  useEffect(() => {
    listeners.add(setData);
    return () => {
      listeners.delete(setData);
    };
  }, []);

  useEffect(() => {
    if (!enabled || data) return;
    let alive = true;
    load().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [enabled, data]);

  return data;
}
