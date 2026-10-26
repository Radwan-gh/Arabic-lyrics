"use client";

import { CircleCheck, CloudDownload, CloudOff } from "lucide-react";
import { useOfflineStatus } from "@/lib/use-offline-status";

const formatCount = (n: number) => n.toLocaleString("ar-EG");

/**
 * سطر حالة الحفظ للاستخدام دون اتصال، داخل القائمة: يُظهر التقدّم أثناء الحفظ،
 * و«متاح دون إنترنت» فقط حين تكون كل الصفحات محفوظة فعلًا. لا يظهر شيء ما دامت
 * الحالة غير معروفة.
 */
export function OfflineStatusLine() {
  const status = useOfflineStatus();
  if (!status || status.total === 0) return null;

  const { done, total, running, complete } = status;
  const progress = `${formatCount(done)} من ${formatCount(total)}`;

  return (
    <div role="status" aria-live="polite" className="mt-1 flex items-start gap-2.5 border-t border-neutral-200 px-3 pb-2 pt-3 text-sm">
      {complete ? (
        <>
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="font-medium text-emerald-700">متاح دون إنترنت</span>
        </>
      ) : running ? (
        <>
          <CloudDownload className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-neutral-700">جارٍ الحفظ للاستخدام دون إنترنت</div>
            <div
              role="progressbar"
              aria-label="تقدّم الحفظ للاستخدام دون إنترنت"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-valuetext={progress}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100"
            >
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.round((done / total) * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-neutral-500">{progress}</div>
          </div>
        </>
      ) : (
        <>
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-neutral-700">الحفظ غير مكتمل ({progress})</div>
            <div className="text-xs text-neutral-500">يُستكمل تلقائيًا عند الاتصال بالإنترنت</div>
          </div>
        </>
      )}
    </div>
  );
}
