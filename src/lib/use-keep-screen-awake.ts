"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isWakeLockSupported, persistWakeLockPref, readStoredWakeLockPref } from "@/lib/wake-lock";

// ─────────────────────────────────────────────────────────────────────────────
// منطق «إبقاء الشاشة مضيئة» المشترك (Screen Wake Lock)، مستخرَج من KeepScreenAwake
// ليُعاد استخدامه في أي واجهة (الزر الحالي، ومفتاح التبديل في لوح ضبط القراءة).
// راجع التعليق الأصلي في KeepScreenAwake.tsx لتفاصيل السلوك.
// ─────────────────────────────────────────────────────────────────────────────

export function useKeepScreenAwake() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const wantOnRef = useRef(false);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // القفل ربّما حُرِّر مسبقًا من النظام — لا شيء لفعله.
      }
    }
    setEnabled(false);
  }, []);

  const acquire = useCallback(async () => {
    if (sentinelRef.current || document.visibilityState !== "visible") return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setEnabled(true);
      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) sentinelRef.current = null;
        setEnabled(false);
      });
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!isWakeLockSupported()) return;
    setSupported(true);

    if (readStoredWakeLockPref()) {
      wantOnRef.current = true;
      void acquire();
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && wantOnRef.current) void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [acquire, release]);

  const toggle = useCallback(() => {
    const next = !wantOnRef.current;
    wantOnRef.current = next;
    persistWakeLockPref(next);
    if (next) void acquire();
    else void release();
  }, [acquire, release]);

  return { supported, enabled, toggle };
}
