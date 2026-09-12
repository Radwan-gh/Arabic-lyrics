"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TitleSort } from "@/lib/lyrics-search";

export interface LyricsFeedItem {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  tags: string[];
  createdAt: string;
  contentHtml: string;
  favorited: boolean;
}

interface UseLyricsFeedArgs {
  query: string;
  tags: string[];
  sort: TitleSort;
  initialItems: LyricsFeedItem[];
  initialHasMore: boolean;
}

/**
 * تمرير لانهائي لقائمة الأناشيد (فهرس الرئيسية): يبدأ بالصفحة الأولى المُحمَّلة
 * من الخادم، ثم يجلب صفحات لاحقة من /api/lyrics بنفس معايير البحث/الوسوم/الترتيب
 * كلّما ظهر عنصر «الحارس» (sentinelRef) في نافذة العرض. عند تغيّر معايير البحث
 * (تنقّل يُعيد تحميل الرئيسية بـ initialItems/initialHasMore جديدة) تُعاد القائمة
 * إلى نقطة البداية تلك.
 */
export function useLyricsFeed({ query, tags, sort, initialItems, initialHasMore }: UseLyricsFeedArgs) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const tagsKey = tags.join(",");

  useEffect(() => {
    setItems(initialItems);
    setHasMore(initialHasMore);
    pageRef.current = 1;
  }, [initialItems, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    const nextPage = pageRef.current + 1;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tagsKey) params.set("tags", tagsKey);
    params.set("sort", sort);
    params.set("page", String(nextPage));
    try {
      const res = await fetch(`/api/lyrics?${params.toString()}`);
      if (!res.ok) return;
      const data: { items: LyricsFeedItem[]; pageCount: number } = await res.json();
      pageRef.current = nextPage;
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(nextPage < data.pageCount);
    } catch {
      // فشل الشبكة: تبقى hasMore كما هي فيُعاد المحاولة عند تقاطع الحارس مجددًا.
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, query, tagsKey, sort]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return { items, hasMore, loading, sentinelRef };
}
