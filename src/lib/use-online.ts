"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * حالة الاتصال الحالية (navigator.onLine) وتتحدّث مع أحداث online/offline.
 * على الخادم وأثناء الإماهة تُعدّ متصلة، ثم تُصحَّح على الجهاز.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
