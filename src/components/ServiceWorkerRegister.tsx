"use client";

import { useEffect } from "react";
import { OFFLINE_LYRICS_URL, OFFLINE_ME_URL } from "@/lib/offline";

/**
 * يسجّل الـ service worker (لتفعيل قابلية التثبيت PWA) ثم «يُهيّئ» لقطات القراءة
 * دون اتصال في الخلفية: يجلب المجموعة العامة، وبيانات المستخدم إن كان مسجّلًا،
 * فيخزّنها الـ SW لتتوفّر عند انقطاع الشبكة. لا يعرض أي واجهة.
 */
export function ServiceWorkerRegister({ authenticated = false }: { authenticated?: boolean }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // يجلب لقطات القراءة دون اتصال ليخزّنها الـ SW (يُهمَل الفشل بهدوء).
    const prime = () => {
      if (!navigator.onLine) return;
      fetch(OFFLINE_LYRICS_URL, { cache: "no-store" }).catch(() => {});
      if (authenticated) {
        fetch(OFFLINE_ME_URL, { cache: "no-store" }).catch(() => {});
      }
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        // بعد أن يتحكّم الـ SW في الصفحة، هيّئ الكاش عبره.
        .then(() => prime())
        .catch((error) => {
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
  }, [authenticated]);

  return null;
}
