"use client";

import { Trash2 } from "lucide-react";
import { focusRing } from "@/lib/ui";

interface QuickDeleteButtonProps {
  title: string;
  /** `viaKeyboard`: ضُغط الزر من لوحة المفاتيح (لنقل التركيز إلى «تراجع»). */
  onDelete: (viaKeyboard: boolean) => void;
  /** icon: بطاقة سطح المكتب (بجانب زر المفضّلة icon). plain: صفّ الموبايل. */
  variant?: "icon" | "plain";
}

/** زرّ حذف بلمسة واحدة في قائمة الأناشيد — بلا تأكيد، والتراجع عبر الإشعار. */
export function QuickDeleteButton({ title, onDelete, variant = "icon" }: QuickDeleteButtonProps) {
  const size = variant === "plain" ? "h-11 w-11 rounded-xl text-[#9aa39d]" : "h-9 w-9 rounded-lg text-neutral-400";
  return (
    <button
      type="button"
      // detail === 0: نقرة مُولَّدة من لوحة المفاتيح (Enter/Space) لا من مؤشّر.
      onClick={(e) => onDelete(e.detail === 0)}
      aria-label={`حذف «${title}»`}
      title="حذف"
      className={`inline-flex shrink-0 items-center justify-center leading-none transition-colors hover:bg-red-50 hover:text-red-600 active:text-red-600 ${size} ${focusRing}`}
    >
      <Trash2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
