"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { DeleteToastState } from "@/lib/use-undoable-delete";

interface UndoDeleteToastProps {
  toast: DeleteToastState | null;
  onUndo: () => void;
  onDismiss: () => void;
  /** موضع الإشعار (يختلف بين الموبايل وسطح المكتب لتجنّب الأزرار العائمة). */
  className?: string;
}

const toastFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900";

/** إشعار «حُذف النشيد — تراجع» بعد الحذف السريع من القائمة (راجع useUndoableDelete). */
export function UndoDeleteToast({ toast, onUndo, onDismiss, className = "" }: UndoDeleteToastProps) {
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (toast?.focus) actionRef.current?.focus();
  }, [toast]);

  // منطقة الإعلان تبقى في الصفحة دائمًا ليُعلن قارئ الشاشة عن كل إشعار جديد.
  return (
    <div role="status" aria-live="polite" className={`pointer-events-none fixed z-40 ${className}`}>
      {toast && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-neutral-900 py-1.5 pe-1.5 ps-4 text-sm text-white shadow-lg">
          <p className="min-w-0 flex-1 truncate">
            {toast.kind === "deleted" ? "حُذف" : "تعذّر حذف"} «<span className="font-naskh">{toast.title}</span>»
          </p>
          {toast.kind === "deleted" ? (
            <button
              ref={actionRef}
              type="button"
              onClick={onUndo}
              className={`inline-flex h-11 shrink-0 items-center rounded-lg px-3 font-semibold text-emerald-300 transition-colors hover:bg-white/10 ${toastFocus}`}
            >
              تراجع
            </button>
          ) : (
            <span className="shrink-0 text-xs text-neutral-300">تحقّق من اتصالك</span>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="إغلاق الإشعار"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-300 transition-colors hover:bg-white/10 hover:text-white ${toastFocus}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
