"use client";

import { useRouter } from "next/navigation";
import { inputSm, focusRing } from "@/lib/ui";
import type { LyricsSort } from "@/lib/lyrics-search";

const SORT_OPTIONS: { value: LyricsSort; label: string }[] = [
  { value: "title_asc", label: "أبجدي (أ ← ي)" },
  { value: "title_desc", label: "أبجدي (ي ← أ)" },
  { value: "date_desc", label: "الأحدث أولاً" },
  { value: "date_asc", label: "الأقدم أولاً" },
];

/** مفتاح ترتيب فهرس الأناشيد في الرئيسية: أبجديًا (تصاعدي/تنازلي) أو بتاريخ
 * الإضافة (الأحدث/الأقدم أولاً). يحافظ على البحث والوسوم الحاليين عند تغييره. */
export function LyricsSortSelect({
  sort,
  query,
  tags,
  className = "",
}: {
  sort: LyricsSort;
  query: string;
  tags: string[];
  className?: string;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LyricsSort;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tags.length) params.set("tags", tags.join(","));
    if (next !== "title_asc") params.set("sort", next);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${focusRing} ${className}`}>
      <span className="shrink-0">الترتيب</span>
      <select value={sort} onChange={onChange} aria-label="ترتيب فهرس الأناشيد" className={`${inputSm} w-auto`}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
