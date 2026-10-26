"use client";

import { useEffect } from "react";
import { DATA_CHANGED_MESSAGE, warmOfflineCache } from "@/lib/offline";

/**
 * يسجّل الـ service worker (لتفعيل قابلية التثبيت PWA والعمل دون اتصال) ثم «يُهيّئ»
 * كاش الصفحات في الخلفية: يجلب اللقطات ويطلب من الـ SW تخزين صفحات التطبيق التي
 * تغيّرت، لتعمل هي نفسها عند انقطاع الشبكة. تُعاد التهيئة عند عودة الاتصال، وعند
 * إبلاغ الـ SW بتعديل بيانات على الخادم. لا يعرض أي واجهة.
 */
export function ServiceWorkerRegister({ authenticated = false }: { authenticated?: boolean }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const warm = () => {
      warmOfflineCache(authenticated).catch(() => {});
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === DATA_CHANGED_MESSAGE) warm();
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => warm())
        .catch((error) => {
          // تسجيل الفشل بهدوء دون كسر التطبيق.
          console.error("Service worker registration failed:", error);
        });
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
  }, [authenticated]);

  return null;
}
