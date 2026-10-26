"use client";

import { History, X } from "lucide-react";
import { focusRing } from "@/lib/ui";

interface RecentSearchesProps {
  id: string;
  items: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
  /** يضبط حجم الصفوف ونمط الحواف ليطابق حقل البحث الذي تظهر تحته. */
  variant?: "mobile" | "desktop";
}

// كل الأزرار هنا تمنع سرقة التركيز من حقل البحث عند الضغط: بقاء التركيز في
// الحقل يُبقي لوحة المفاتيح مفتوحة على الموبايل، ولا يُغلق القائمة (التي تُغلق
// عند blur) قبل أن تصل النقرة.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

/** قائمة منسدلة بآخر عمليات البحث تظهر تحت حقل البحث وهو فارغ ومُركَّز عليه.
 * النقر على كلمة يعيد البحث بها، وزرّ × يحذفها، و«مسح الكل» يفرّغ القائمة. */
export function RecentSearches({ id, items, onSelect, onRemove, onClear, variant = "desktop" }: RecentSearchesProps) {
  const mobile = variant === "mobile";
  return (
    <div
      id={id}
      role="region"
      aria-label="عمليات البحث الأخيرة"
      className={`absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden border bg-white shadow-lg ${
        mobile ? "rounded-2xl border-[#e6e6e1]" : "rounded-lg border-neutral-200"
      }`}
    >
      <div className={`flex items-center justify-between gap-2 px-4 pt-3 pb-1.5 ${mobile ? "text-[#6b7670]" : "text-neutral-500"}`}>
        <span className="text-[13px] font-medium">عمليات البحث الأخيرة</span>
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onClear}
          className={`rounded-md px-1.5 py-0.5 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 ${focusRing}`}
        >
          مسح الكل
        </button>
      </div>
      <ul className="pb-1.5">
        {items.map((term) => (
          <li key={term} className="flex items-center">
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() => onSelect(term)}
              className={`flex min-w-0 flex-1 items-center gap-3 px-4 text-start transition-colors hover:bg-neutral-50 ${
                mobile ? "h-12 text-base text-[#14211c]" : "h-11 text-sm text-neutral-800"
              } ${focusRing}`}
            >
              <History className={`h-4 w-4 shrink-0 ${mobile ? "text-[#9aa39d]" : "text-neutral-400"}`} aria-hidden="true" />
              <span className="truncate">{term}</span>
            </button>
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() => onRemove(term)}
              aria-label={`حذف «${term}» من عمليات البحث الأخيرة`}
              className={`me-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 ${
                mobile ? "text-[#9aa39d] hover:text-[#3c4a44]" : "text-neutral-400 hover:text-neutral-600"
              } ${focusRing}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
