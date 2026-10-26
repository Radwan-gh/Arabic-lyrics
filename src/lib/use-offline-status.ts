"use client";

import { useEffect, useState } from "react";
import { WARM_STATUS_MESSAGE, type OfflineStatus } from "@/lib/offline";

/**
 * حالة حفظ صفحات التطبيق للاستخدام دون اتصال: يسأل الـ SW عنها عند التركيب ثم
 * يتابع ما يبثّه من تقدّم. null إن لم تكن معروفة بعد (أو المتصفح لا يدعم الـ SW).
 */
export function useOfflineStatus(): OfflineStatus | null {
  const [status, setStatus] = useState<OfflineStatus | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === WARM_STATUS_MESSAGE) setStatus(event.data.status ?? null);
    };
    container.addEventListener("message", onMessage);
    container.ready
      .then((registration) => registration.active?.postMessage({ type: WARM_STATUS_MESSAGE }))
      .catch(() => {});
    return () => container.removeEventListener("message", onMessage);
  }, []);

  return status;
}
