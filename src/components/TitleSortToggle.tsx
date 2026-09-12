"use client";

import { ArrowDownAZ, ArrowDownZA } from "lucide-react";
import { focusRing } from "@/lib/ui";
import type { TitleSort } from "@/lib/lyrics-search";

/** مفتاح تبديل ترتيب فهرس الأناشيد الأبجدي: تصاعدي (أ ← ي) أو تنازلي (ي ← أ). */
export function TitleSortToggle({
  sort,
  onChange,
  className = "",
}: {
  sort: TitleSort;
  onChange: (next: TitleSort) => void;
  className?: string;
}) {
  const ascending = sort === "title_asc";
  return (
    <button
      type="button"
      onClick={() => onChange(ascending ? "title_desc" : "title_asc")}
      aria-label={ascending ? "الترتيب الأبجدي تصاعدي، اضغط للترتيب التنازلي" : "الترتيب الأبجدي تنازلي، اضغط للترتيب التصاعدي"}
      title="ترتيب حسب الحرف الأول"
      className={`inline-flex items-center gap-1.5 rounded-lg ${focusRing} ${className}`}
    >
      {ascending ? (
        <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ArrowDownZA className="h-4 w-4" aria-hidden="true" />
      )}
      {ascending ? "أ ← ي" : "ي ← أ"}
    </button>
  );
}
