"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LyricsSort } from "@/lib/lyrics-search";

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
  sort: LyricsSort;
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
  const abortRef = useRef<AbortController | null>(null);
  const tagsKey = tags.join(",");

  useEffect(() => {
    // يُلغي أي طلب «تحميل المزيد» لا يزال قيد التنفيذ لاستعلام سابق (مثلاً
    // بحث حيّ يبدّل النتائج بينما كان التمرير اللانهائي يجلب صفحة تالية له)،
    // حتى لا تصل نتائجه متأخرةً فتُلحق عناصر الاستعلام القديم بقائمة الجديد.
    abortRef.current?.abort();
    setItems(initialItems);
    setHasMore(initialHasMore);
    pageRef.current = 1;
    loadingRef.current = false;
    setLoading(false);
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
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/lyrics?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) return;
      const data: { items: LyricsFeedItem[]; pageCount: number } = await res.json();
      pageRef.current = nextPage;
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(nextPage < data.pageCount);
    } catch {
      // فشل الشبكة أو إلغاء الطلب (استعلام جديد وصل قبل اكتمال هذه الصفحة):
      // تبقى hasMore كما هي فيُعاد المحاولة عند تقاطع الحارس مجددًا.
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
