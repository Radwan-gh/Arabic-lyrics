"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

/**
 * تنقّل يغيّر معاملات الرابط فقط (بحث/تصفية/ترتيب) ويعمل دون اتصال: متصلًا يمرّ عبر
 * موجّه Next.js كالمعتاد (فيجلب الخادم النتائج)، ودون اتصال يحدّث الرابط محليًا عبر
 * history API (المدمجة مع useSearchParams) بدل تنقّل يفشل فيُعيد تحميل الصفحة —
 * فتحسب الصفحة نتائجها من لقطة الأناشيد المحفوظة (راجع useLyricsFeed).
 */
export function useAppRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      push(url: string) {
        if (navigator.onLine) router.push(url);
        else window.history.pushState(null, "", url);
      },
      replace(url: string) {
        if (navigator.onLine) router.replace(url);
        else window.history.replaceState(null, "", url);
      },
      back() {
        router.back();
      },
    }),
    [router],
  );
}
