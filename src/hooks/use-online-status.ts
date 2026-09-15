"use client";

import { useEffect, useState } from "react";

/** حالة الاتصال بالإنترنت، مُحدَّثة عبر أحداث online/offline. تبدأ true لتطابق
 * تصيير الخادم (لا وجود لـ navigator هناك) ثم تُصحَّح بعد التركيب. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
