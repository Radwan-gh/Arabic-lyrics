"use client";

import { useSyncExternalStore } from "react";
import type { OfflineStatus } from "@/lib/offline";
import { getOfflineStatus, subscribeOfflineStatus } from "@/lib/offline-sync";

/**
 * حالة الحفظ للاستخدام دون اتصال (بيانات الجهاز وهياكل الصفحات معًا).
 * null إن لم تكن معروفة بعد (أو المتصفح لا يدعم الـ SW / IndexedDB).
 */
export function useOfflineStatus(): OfflineStatus | null {
  return useSyncExternalStore(subscribeOfflineStatus, getOfflineStatus, () => null);
}
