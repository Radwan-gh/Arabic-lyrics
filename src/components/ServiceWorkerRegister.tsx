"use client";

import { useEffect } from "react";
import { DATA_CHANGED_MESSAGE } from "@/lib/offline";
import { syncOfflineData } from "@/lib/offline-sync";

/**
 * يسجّل الـ service worker (لتفعيل قابلية التثبيت PWA والعمل دون اتصال) ثم يزامن
 * بيانات الجهاز في الخلفية ويطلب تخزين هياكل الصفحات (راجع offline-sync). تُعاد
 * المزامنة عند عودة الاتصال، وعند إبلاغ الـ SW بتعديل بيانات على الخادم. لا يعرض
 * أي واجهة.
 */
export function ServiceWorkerRegister({ sessionKey = null }: { sessionKey?: string | null }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const warm = () => {
      syncOfflineData(sessionKey).catch(() => {});
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === DATA_CHANGED_MESSAGE) warm();
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          // تسجيل الفشل بهدوء دون كسر التطبيق (دون اتصال قد يتعذّر تحديث الـ SW
          // المسجَّل أصلًا) — تبقى حالة الحفظ المحلية معروفة رغم ذلك.
          console.error("Service worker registration failed:", error);
        })
        .then(() => warm());
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    window.addEventListener("online", warm);
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", warm);
      window.removeEventListener("load", register);
    };
  }, [sessionKey]);

  return null;
}
