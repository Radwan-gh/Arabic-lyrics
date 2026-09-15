"use client";

import { focusRing } from "@/lib/ui";

/**
 * شريط حالة الاتصال: يظهر أعلى الصفحة الحقيقية نفسها عند القراءة من نسخة
 * محفوظة — إمّا لانقطاع الشبكة، أو لأن هذه المحتوى مصدره اللقطة المخزَّنة رغم
 * توفّر الاتصال (لم تُحمَّل بعد نسخة الخادم الطازجة على هذا المسار).
 */
export function OfflineBanner({
  online,
  sourcedFromCache,
  onReload,
}: {
  online: boolean;
  sourcedFromCache: boolean;
  onReload?: () => void;
}) {
  if (!online) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
        <span>أنت غير متصل بالإنترنت — تُعرض نسخة محفوظة على جهازك (قد لا تكون الأحدث).</span>
      </div>
    );
  }

  if (sourcedFromCache) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
        <span>عاد الاتصال بالإنترنت. حدّث الصفحة لعرض أحدث نسخة.</span>
        <button
          type="button"
          onClick={onReload ?? (() => window.location.reload())}
          className={`rounded-md border border-emerald-300 bg-white px-3 py-1 font-medium text-emerald-700 hover:bg-emerald-100 ${focusRing}`}
        >
          تحديث الصفحة
        </button>
      </div>
    );
  }

  return null;
}
