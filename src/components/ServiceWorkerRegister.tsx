"use client";

import { useEffect } from "react";

/**
 * يسجّل الـ service worker الخاص بالتطبيق لتفعيل قابلية التثبيت (PWA).
 * لا يعرض أي واجهة، ويعمل فقط في المتصفح بعد تحميل الصفحة.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // تسجيل الفشل بهدوء دون كسر التطبيق.
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
