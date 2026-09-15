"use client";

import { useEffect, useState } from "react";

export interface RealLocation {
  pathname: string;
  search: string;
}

/**
 * المسار الحقيقي من window.location، مُتزامَنًا مع أزرار الرجوع/التقدّم.
 * يُرجع null قبل التركيب (لا يتوفّر window أثناء التصيير على الخادم) — يلزم هذا
 * لأن الـ service worker قد يخدم HTML غلاف القراءة دون اتصال (/offline) لأي
 * مسار حقيقي غير مخزَّن أثناء انقطاع الشبكة، فتقرأ next/navigation's
 * usePathname عندها "/offline" خطأً بدل المسار الفعلي في شريط العنوان.
 */
export function useRealLocation(): RealLocation | null {
  const [location, setLocation] = useState<RealLocation | null>(null);

  useEffect(() => {
    const sync = () => setLocation({ pathname: window.location.pathname, search: window.location.search });
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return location;
}
