"use client";

import { Trash2 } from "lucide-react";
import { focusRing } from "@/lib/ui";

interface QuickDeleteButtonProps {
  title: string;
  /** `viaKeyboard`: ضُغط الزر من لوحة المفاتيح (لنقل التركيز إلى «تراجع»). */
  onDelete: (viaKeyboard: boolean) => void;
}

/** زرّ حذف بنقرة واحدة في بطاقات سطح المكتب — بلا تأكيد، والتراجع عبر الإشعار.
 * على الموبايل يُحذف الصف بسحبه (راجع SwipeToDelete). */
export function QuickDeleteButton({ title, onDelete }: QuickDeleteButtonProps) {
  return (
    <button
      type="button"
      // detail === 0: نقرة مُولَّدة من لوحة المفاتيح (Enter/Space) لا من مؤشّر.
      onClick={(e) => onDelete(e.detail === 0)}
      aria-label={`حذف «${title}»`}
      title="حذف"
      className={`inline-flex shrink-0 items-center justify-center leading-none transition-colors hover:bg-red-50 hover:text-red-600 active:text-red-600 h-9 w-9 rounded-lg text-neutral-400 ${focusRing}`}
    >
      <Trash2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
