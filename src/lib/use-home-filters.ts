"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseLyricsSort, type LyricsSort } from "@/lib/lyrics-search";

/** معايير فهرس الرئيسية كما يحملها الرابط (‎?q=…&tags=…&sort=…‎). */
export interface HomeFilters {
  query: string;
  tags: string[];
  sort: LyricsSort;
}

export function parseHomeFilters(params: { get(name: string): string | null }): HomeFilters {
  return {
    query: params.get("q") ?? "",
    tags: (params.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    sort: parseLyricsSort(params.get("sort"), "title_asc"),
  };
}

export function homeFiltersKey(f: HomeFilters): string {
  return JSON.stringify([f.query.trim(), f.tags, f.sort]);
}

/** رابط الرئيسية لمعايير معطاة — الترتيب الافتراضي (أبجدي تصاعدي) بلا معامل. */
export function buildHomeUrl(f: HomeFilters): string {
  const params = new URLSearchParams();
  if (f.query) params.set("q", f.query);
  if (f.tags.length) params.set("tags", f.tags.join(","));
  if (f.sort !== "title_asc") params.set("sort", f.sort);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * المعايير الفعلية للرئيسية من الرابط الحالي. متصلًا تطابق دائمًا ما صيّره الخادم
 * (`server`)؛ وتختلف عنه دون اتصال حين يُحدَّث الرابط محليًا (useAppRouter) أو يُخدَم
 * الرابط من نسخة الرئيسية المخزَّنة بلا معاملاته. التصيير الأول يستعمل معايير
 * الخادم دومًا ليطابق HTML المُصيَّر (تفاديًا لعدم تطابق الترطيب).
 */
export function useHomeFilters(server: HomeFilters): HomeFilters {
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const fromUrl = parseHomeFilters(searchParams);
  const key = homeFiltersKey(hydrated ? fromUrl : server);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (hydrated ? fromUrl : server), [key]);
}
